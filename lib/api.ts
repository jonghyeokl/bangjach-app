import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { User } from './types';

// Accept the old /api/v1 health-check base during migration.
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000')
  .replace(/\/$/, '')
  .replace(/\/api\/v1$/, '');
type Tokens = { access_token: string; refresh_token: string; user: User };
let tokens: Tokens | null = null;
let generation = 0;
let persistence: Promise<void> = Promise.resolve();
let refreshPromise: Promise<boolean> | null = null;
let restorePromise: Promise<void> | null = null;
let resourceVersion = 0;
export const getResourceVersion = () => resourceVersion;
const listeners = new Set<() => void>();
export const auth = {
  user: () => tokens?.user ?? null,
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  restore() {
    // Strict Mode may run the provider effect twice; rotate a stored refresh token only once.
    restorePromise ??= restoreSession();
    return restorePromise;
  },
  async refreshUser() {
    if (!tokens) return;
    const current = generation;
    const user = await api<User>('/user/v1/me');
    if (tokens && current === generation && JSON.stringify(tokens.user) !== JSON.stringify(user))
      await save({ ...tokens, user });
  },
};
async function restoreSession() {
  if (Platform.OS === 'web') return;
  const current = generation;
  const saved = await SecureStore.getItemAsync('bangjach.session');
  if (!saved || current !== generation) return;
  try {
    const parsed = JSON.parse(saved);
    if (
      typeof parsed?.access_token !== 'string' ||
      typeof parsed?.refresh_token !== 'string' ||
      typeof parsed?.user?.id !== 'string'
    )
      throw new Error('Invalid session');
    tokens = parsed;
  } catch {
    await save(null);
    return;
  }
  try {
    // Verify the saved session and persist rotated tokens before opening the main screen.
    await renew();
  } catch {
    // A temporary connection failure does not discard a locally saved login.
  }
  listeners.forEach((fn) => fn());
}
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
async function save(value: Tokens | null) {
  const current = ++generation;
  if (Platform.OS !== 'web') {
    persistence = persistence
      .catch(() => undefined)
      .then(async () => {
        if (value) await SecureStore.setItemAsync('bangjach.session', JSON.stringify(value));
        else await SecureStore.deleteItemAsync('bangjach.session');
      });
    await persistence;
  }
  if (current !== generation) return;
  if (tokens?.user.id !== value?.user.id) resourceVersion++;
  tokens = value;
  listeners.forEach((fn) => fn());
}
async function raw(path: string, options: RequestInit = {}) {
  return fetch(API_URL + path, {
    ...options,
    signal: AbortSignal.timeout(20000),
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(tokens ? { Authorization: `Bearer ${tokens.access_token}` } : {}),
      ...options.headers,
    },
  });
}
async function renew() {
  if (!tokens) return false;
  if (!refreshPromise) {
    const current = generation;
    refreshPromise = (async () => {
      const res = await raw('/user/v1/refresh', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: tokens!.refresh_token }),
      });
      if (current !== generation) return false;
      if (res.ok) {
        await save(await res.json());
        return true;
      }
      if (res.status === 401) await save(null);
      return false;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await raw(path, options);
    if (res.status === 401 && tokens && !path.includes('/log-in') && !path.includes('/sign-up')) {
      if (await renew()) res = await raw(path, options);
    }
  } catch {
    throw new ApiError(0, '서버에 연결할 수 없어요. 연결 상태를 확인하고 다시 시도해주세요.');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const details = data.error?.details as { field: string; message: string }[] | null;
    throw new ApiError(
      res.status,
      details?.length
        ? `${data.error.message}\n${details.map((e) => `${e.field.replace('body.', '')}: ${e.message}`).join('\n')}`
        : (data.error?.message ?? `요청에 실패했어요 (${res.status})`),
    );
  }
  if (!['GET', 'HEAD'].includes(options.method?.toUpperCase() ?? 'GET')) resourceVersion++;
  return res.status === 204 ? (undefined as T) : res.json();
}
export const json = (method: string, body?: unknown): RequestInit => ({
  method,
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});
export async function login(phone_number: string, password: string) {
  await save(await api<Tokens>('/user/v1/log-in', json('POST', { phone_number, password })));
}
export async function logout() {
  try {
    await api('/user/v1/log-out', json('POST'));
  } finally {
    await save(null);
  }
}
export function query(values: Record<string, unknown>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value === '' || value === null || value === undefined) return;
    (Array.isArray(value) ? value : [value]).forEach((v) => params.append(key, String(v)));
  });
  return params.toString();
}
export async function checkHealth() {
  return api('/api/v1/health');
}
