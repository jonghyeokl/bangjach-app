const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const core = require('../scripts/bbabang/core.cjs');
const { downloadImage, downloadThemeImage, exportData } = require('../scripts/bbabang/collect.cjs');
const request = {
  index: 'qrooms',
  query: '',
  filter: [...core.FILTER],
  sort: [...core.SORT],
  limit: core.COUNT,
};
const hit = (index) => ({
  ref_id: index + 1,
  title: `테마 ${index + 1}`,
  store_name: '가상 카페',
  area: '서울',
  address: '서울특별시 가상 주소',
  store_tel: '0200000000',
  description: '첫 줄\n둘째 줄, "인용"',
  poster_loc: `가상 카페/테마 ${index + 1}`,
  playtime: 60,
  store_homepage: 'https://example.com',
  recommendTotalRating: 1 - index / 1000,
  isRecommendedTotal: 1000 - index,
});
const payload = () => ({
  result: { offset: 0, hits: Array.from({ length: core.COUNT }, (_, i) => hit(i)) },
});
const sample = () => core.dataset(payload(), request);

test('only nationwide unfiltered recommendation order is accepted', () => {
  assert.equal(core.isRequestedSearch(request), true);
  for (const patch of [
    { query: '검색' },
    { index: 'stores' },
    { sort: ['isRecommendedTotal:desc'] },
    { filter: [...core.FILTER, 'area = 서울'] },
    { filter: [...core.FILTER, 'reserve_times_d0 != ""'] },
    { filter: [...core.FILTER, 'ref_id NOT IN [1]'] },
  ])
    assert.equal(core.isRequestedSearch({ ...request, ...patch }), false);
});

test('100 organic rows preserve rank, description and encoded photo path', () => {
  const data = sample();
  assert.equal(data.themes.length, 100);
  assert.equal(data.themes[99].rank, 100);
  assert.equal(data.themes[0].description, '첫 줄\n둘째 줄, "인용"');
  assert.equal(decodeURI(data.themes[0].image_url), 'https://cdn.keigon.net/가상 카페/테마 1');
  assert.deepEqual(data.themes[0].missing_fields, []);
  assert.deepEqual(data.themes[0].missing_cafe_fields, []);
  assert.deepEqual(data.themes[0].cafe, {
    name: '가상 카페',
    region_label: '서울',
    address: '서울특별시 가상 주소',
    phone_number: '0200000000',
    website: 'https://example.com/',
  });
  assert.deepEqual(core.validateExport(data), data);
  assert.throws(() => core.dataset({ result: { ad: hit(0) } }, request));
});

test('source order is preserved even when recommendation scores increase', () => {
  const p = payload();
  p.result.hits.reverse();
  const data = core.dataset(p, request);
  assert.deepEqual(
    data.themes.map((row) => row.source_id),
    p.result.hits.map((row) => row.ref_id),
  );
  assert.equal(data.themes[0].rank, 1);
  assert.equal(data.themes.at(-1).rank, 100);
  assert.deepEqual(core.validateExport(data), data);
});

test('duplicates, non-first pages, and incomplete batches fail closed', () => {
  for (const change of [
    (p) => p.result.hits.splice(1, 1, hit(0)),
    (p) => p.result.hits.pop(),
    (p) => {
      p.result.offset = 20;
    },
  ]) {
    const p = payload();
    change(p);
    assert.throws(() => core.dataset(p, request));
  }
  const p = payload();
  p.result.hits.unshift({ ...hit(99), is_ad: true });
  assert.equal(core.dataset(p, request).themes[0].source_id, 1);
});

test('missing source values are explicit and CSV resists formula injection', () => {
  const p = payload();
  Object.assign(p.result.hits[0], {
    description: '',
    playtime: null,
    poster_loc: '',
    store_homepage: '',
  });
  const data = core.dataset(p, request);
  assert.deepEqual(data.themes[0].missing_fields, [
    'image_url',
    'length_minutes',
    'description',
    'website',
  ]);
  data.themes[1].theme_name = '=HYPERLINK("x")';
  const csv = core.csv(data);
  assert.ok(csv.startsWith('\ufeff'));
  assert.ok(csv.includes('"\'=HYPERLINK(""x"")"'));
  assert.ok(csv.includes('첫 줄\n둘째 줄, ""인용""'));
});

test('image downloads validate origin and actual bytes; failures remain visible', async () => {
  await assert.rejects(downloadImage('http://127.0.0.1/photo'));
  await assert.rejects(
    downloadImage('https://cdn.keigon.net/a', async () => new Response('<html>')),
  );
  const gif = await downloadImage('https://cdn.keigon.net/a', async () =>
    new Response(Buffer.from('GIF89a')),
  );
  assert.equal(gif.extension, 'gif');
  const large = Buffer.alloc(13 * 1024 * 1024);
  large.set([0xff, 0xd8, 0xff]);
  assert.equal((await downloadImage('https://cdn.keigon.net/a', async () =>
    new Response(large),
  )).data.length, large.length);
  await assert.rejects(downloadImage('https://cdn.keigon.net/a', async () =>
    new Response(Buffer.alloc(32 * 1024 * 1024 + 1)),
  ), /32MB/);
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'bbabang-test-'));
  try {
    const data = sample();
    let calls = 0;
    const fetcher = async () =>
      ++calls === 1
        ? new Response('missing', { status: 404 })
        : new Response(Buffer.from([0xff, 0xd8, 0xff, 0, 1]));
    const result = await exportData(data, tmp, { fetcher, delay: 0 });
    assert.equal(result.image_download.succeeded, core.COUNT - 1);
    assert.equal(result.image_download.failures.length, 1);
    assert.equal(result.themes[0].image_file, null);
    assert.equal((await fs.readdir(path.join(tmp, 'images'))).length, core.COUNT - 1);
    assert.equal(JSON.parse(await fs.readFile(path.join(tmp, 'themes.json'), 'utf8')).count, 100);
    assert.ok((await fs.readFile(path.join(tmp, 'themes.csv'), 'utf8')).startsWith('\ufeff'));
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('only a matching theme with a 404 uses its verified official photo', async () => {
  const row = {
    source_id: 4359, theme_name: '메가 게임 (MEGA GAME)',
    cafe_name: '룸즈에이 대구스테이지점', image_url: 'https://cdn.keigon.net/missing',
  };
  const calls = [];
  const fetcher = async (url) => {
    calls.push(url);
    return url === row.image_url
      ? new Response('', {status: 404})
      : new Response(Buffer.from([0xff, 0xd8, 0xff]));
  };
  const image = await downloadThemeImage(row, fetcher);
  assert.equal(image.sourcePage, 'https://roomsa.co.kr/');
  assert.equal(calls.length, 2);
  await assert.rejects(downloadThemeImage({...row, cafe_name: '다른 지점'}, fetcher), /404/);
  await assert.rejects(downloadThemeImage(row, async () => new Response('', {status: 503})), /503/);
});

test('browser hook preserves auth, changes only batch size and ignores ad requests', async () => {
  const source = await fs.readFile(path.join(__dirname, '../scripts/bbabang/browser.js'), 'utf8');
  const elements = [];
  const element = () => {
    const e = { style: {}, append() {}, remove() {}, click() {} };
    elements.push(e);
    return e;
  };
  const calls = [];
  const original = async (input) => {
    const req = new Request(input);
    calls.push({
      url: req.url,
      body: await req.json(),
      header: req.headers.get('X-Firebase-AppCheck'),
    });
    return new Response(
      JSON.stringify(req.url.endsWith('/selectAd') ? { result: { ad: hit(99) } } : payload()),
    );
  };
  const window = { fetch: original, BbabangCollectorCore: core };
  vm.runInNewContext(source, {
    window,
    location: { origin: 'https://bbabang.net', href: 'https://bbabang.net/#home' },
    document: { createElement: element, body: { append() {} } },
    Request,
    URL,
    Blob,
    setTimeout,
  });
  const send = (endpoint, data) =>
    window.fetch(
      new Request(`https://asia-northeast3-roomescape-app-mvp.cloudfunctions.net/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Firebase-AppCheck': 'test-only-token' },
        body: JSON.stringify({ data }),
      }),
    );
  await send('selectAd', {});
  assert.equal(window.bbangCollector.getResult(), null);
  await send('meiliSearch', { ...request, sort: ['isRecommendedTotal:desc'], limit: 20 });
  assert.equal(window.bbangCollector.getResult(), null);
  await send('meiliSearch', { ...request, limit: 20 });
  assert.deepEqual(calls[2].body, { data: request });
  assert.equal(calls[2].header, 'test-only-token');
  assert.equal(window.bbangCollector.getResult().count, 100);
  assert.equal(window.fetch, original);
  assert.ok(!JSON.stringify(window.bbangCollector.getResult()).includes('test-only-token'));
});
