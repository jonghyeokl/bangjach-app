import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { api, getResourceVersion } from './api';
import { useSession } from './session';

// Keep the mounted tab and its scroll position intact while refreshing stale data.
const FRESH_FOR_MS = 60_000;
type State<T> = {
  key: string;
  data: T | null;
  error: string;
  loading: boolean;
  refreshing: boolean;
};
export function useResource<T>(path: string | null) {
  const { user } = useSession();
  const key = `${user?.id ?? 'guest'}:${path ?? ''}`;
  const [state, setState] = useState<State<T>>({
    key,
    data: null,
    error: '',
    loading: !!path,
    refreshing: false,
  });
  const cached = useRef<{ key: string; data: T; version: number; time: number } | null>(null);
  const [revision, setRevision] = useState(0);
  const sequence = useRef(0);
  useFocusEffect(
    useCallback(() => {
      const id = ++sequence.current;
      if (!path) {
        cached.current = null;
        setState({ key, data: null, error: '', loading: false, refreshing: false });
        return;
      }
      const previous = cached.current?.key === key ? cached.current : null;
      const version = getResourceVersion();
      if (previous && previous.version === version && Date.now() - previous.time < FRESH_FOR_MS)
        return;
      setState({
        key,
        data: previous?.data ?? null,
        error: '',
        loading: !previous,
        refreshing: !!previous,
      });
      api<T>(path)
        .then((data) => {
          if (sequence.current !== id) return;
          cached.current = { key, data, version, time: Date.now() };
          setState({ key, data, error: '', loading: false, refreshing: false });
        })
        .catch((e) => {
          if (sequence.current !== id) return;
          // A forbidden calendar must not remain visible after privacy/relationship changes.
          if (e.status === 401 || e.status === 403 || e.status === 404) cached.current = null;
          const data = cached.current?.key === key ? cached.current.data : null;
          setState({ key, data, error: e.message, loading: false, refreshing: false });
        });
      return () => {
        sequence.current++;
      };
    }, [path, key, revision]),
  );
  return {
    data: state.key === key ? state.data : null,
    error: state.key === key ? state.error : '',
    loading: state.key === key ? state.loading : !!path,
    refreshing: state.key === key && state.refreshing,
    reload: () => {
      if (cached.current) cached.current.time = 0;
      setRevision((r) => r + 1);
    },
  };
}
