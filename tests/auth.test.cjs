const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const code = ts.transpileModule(fs.readFileSync(require.resolve('../lib/api.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const key = 'bangjach.session';
const user = { id: 'test-user', name: '테스트', phone_number: '01000000000' };
const session = { access_token: 'access-old', refresh_token: 'refresh-old', user };
const rotated = { ...session, access_token: 'access-new', refresh_token: 'refresh-new' };
const ok = (body) => new Response(JSON.stringify(body), { status: 200 });

// Each module instance represents a new native app process; only SecureStore survives.
function app(storage, fetch) {
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require(name) {
      if (name === 'react-native') return { Platform: { OS: 'ios' } };
      if (name === 'expo-secure-store')
        return {
          getItemAsync: async (name) => storage.get(name) ?? null,
          setItemAsync: async (name, value) => {
            storage.set(name, value);
          },
          deleteItemAsync: async (name) => {
            storage.delete(name);
          },
        };
      throw new Error(`Unexpected import: ${name}`);
    },
    process: { env: { EXPO_PUBLIC_API_URL: 'https://example.test' } },
    fetch,
    AbortSignal,
    URLSearchParams,
    FormData,
  });
  return exports;
}

test('native login persists before announcing login; restarting restores and rotates once', async () => {
  const storage = new Map();
  const first = app(storage, async () => ok(session));
  let announced = false;
  first.auth.subscribe(() => {
    assert.ok(storage.has(key));
    announced = true;
  });
  await first.login(user.phone_number, 'password');
  assert.ok(announced);
  let refreshes = 0;
  const restarted = app(storage, async (url, options) => {
    assert.ok(url.endsWith('/refresh'));
    assert.equal(JSON.parse(options.body).refresh_token, 'refresh-old');
    refreshes++;
    return ok(rotated);
  });
  await Promise.all([restarted.auth.restore(), restarted.auth.restore()]);
  assert.equal(refreshes, 1);
  assert.equal(restarted.auth.user().id, user.id);
  assert.equal(JSON.parse(storage.get(key)).refresh_token, 'refresh-new');
});

test('photo forms preserve the multipart body and let fetch choose its boundary', async () => {
  const body = new FormData();
  body.append('data', '{"name":"test"}');
  body.append('photo', new Blob(['photo']), 'photo.jpg');
  const client = app(new Map(), async (url, options) => {
    assert.equal(options.body, body);
    assert.equal(options.headers['Content-Type'], undefined);
    return ok({ id: 'theme' });
  });
  assert.deepEqual(await client.api('/theme/v1/with-photo', { method: 'POST', body }), {
    id: 'theme',
  });
});

test('expired or revoked saved session is cleared', async () => {
  const storage = new Map([[key, JSON.stringify(session)]]);
  const client = app(storage, async () => new Response('{}', { status: 401 }));
  await client.auth.restore();
  assert.equal(client.auth.user(), null);
  assert.equal(storage.has(key), false);
});

test('temporary offline startup preserves the saved login', async () => {
  const storage = new Map([[key, JSON.stringify(session)]]);
  const client = app(storage, async () => {
    throw new Error('offline');
  });
  await client.auth.restore();
  assert.equal(client.auth.user().id, user.id);
  assert.equal(storage.has(key), true);
});

test('logout removes saved login even if the server is unreachable; restart stays signed out', async () => {
  const storage = new Map();
  let offline = false;
  const client = app(storage, async () => {
    if (offline) throw new Error('offline');
    return ok(session);
  });
  await client.login(user.phone_number, 'password');
  offline = true;
  await assert.rejects(client.logout());
  assert.equal(client.auth.user(), null);
  assert.equal(storage.has(key), false);
  const restarted = app(storage, async () => {
    throw new Error('Should not request refresh');
  });
  await restarted.auth.restore();
  assert.equal(restarted.auth.user(), null);
});

test('damaged stored session is removed', async () => {
  const storage = new Map([[key, '{invalid-json']]);
  const client = app(storage, async () => {
    throw new Error('Should not request refresh');
  });
  await client.auth.restore();
  assert.equal(client.auth.user(), null);
  assert.equal(storage.has(key), false);
});

test('profile refresh updates administrator permission without signing in again', async () => {
  const storage = new Map();
  let admin = false;
  const client = app(storage, async (url) =>
    url.endsWith('/me')
      ? ok({ ...user, is_admin: admin })
      : ok({ ...session, user: { ...user, is_admin: false } }),
  );
  await client.login(user.phone_number, 'password');
  admin = true;
  await client.auth.refreshUser();
  assert.equal(client.auth.user().is_admin, true);
  assert.equal(JSON.parse(storage.get(key)).user.is_admin, true);
  admin = false;
  await client.auth.refreshUser();
  assert.equal(client.auth.user().is_admin, false);
});

test('resource version changes on successful mutations, not reads or failed writes', async () => {
  const client = app(new Map(), async (url) =>
    url.endsWith('/failed') ? new Response('{}', { status: 403 }) : ok({}),
  );
  const original = client.getResourceVersion();
  await client.api('/items');
  assert.equal(client.getResourceVersion(), original);
  await assert.rejects(client.api('/failed', { method: 'POST' }));
  assert.equal(client.getResourceVersion(), original);
  await client.api('/items', { method: 'POST' });
  assert.equal(client.getResourceVersion(), original + 1);
});
