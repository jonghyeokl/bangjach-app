import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { api } from './api';

export function useResource<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  const sequence = useRef(0);
  useFocusEffect(
    useCallback(() => {
      const id = ++sequence.current;
      if (!path) {
        setData(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      setData(null);
      api<T>(path)
        .then((value) => {
          if (sequence.current === id) setData(value);
        })
        .catch((e) => {
          if (sequence.current === id) setError(e.message);
        })
        .finally(() => {
          if (sequence.current === id) setLoading(false);
        });
      return () => {
        sequence.current++;
      };
    }, [path, revision]),
  );
  return { data, error, loading, reload: () => setRevision((r) => r + 1) };
}
