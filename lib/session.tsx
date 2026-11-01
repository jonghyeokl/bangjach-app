import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { auth } from './api';
import type { User } from './types';

const Context = createContext<{ user: User | null; ready: boolean }>({ user: null, ready: false });
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState(auth.user());
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const off = auth.subscribe(() => setUser(auth.user()));
    auth
      .restore()
      .catch(() => {
        setUser(null);
      })
      .finally(() => setReady(true));
    return off;
  }, []);
  return <Context.Provider value={{ user, ready }}>{children}</Context.Provider>;
}
export const useSession = () => useContext(Context);
