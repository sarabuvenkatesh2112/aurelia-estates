'use client';
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import Link from 'next/link';
export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
};
type Favorite = { id: string; projectId: string };
const Context = createContext<{
  user: Customer | null;
  loading: boolean;
  favorites: Favorite[];
  refresh: () => Promise<void>;
}>({ user: null, loading: true, favorites: [], refresh: async () => {} });
export function CustomerProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Customer | null>(null),
    [loading, setLoading] = useState(true),
    [favorites, setFavorites] = useState<Favorite[]>([]);
  const refresh = useCallback(
    () =>
      fetch('/api/auth/get-session/', { cache: 'no-store' })
        .then(async (response) => {
          if (!response.ok) throw Error();
          const data = await response.json();
          setUser(data.user);
          if (data.user) {
            const r = await fetch('/api/customer/favorites/', {
              cache: 'no-store',
            });
            if (r.ok) setFavorites(await r.json());
          } else setFavorites([]);
        })
        .catch(() => {
          setUser(null);
          setFavorites([]);
        })
        .finally(() => setLoading(false)),
    [],
  );
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return (
    <Context value={{ user, loading, favorites, refresh }}>{children}</Context>
  );
}
export const useCustomer = () => useContext(Context);
export function AccountLink() {
  const { user } = useCustomer();
  return (
    <Link
      prefetch={false}
      className="account-link"
      href={user ? '/account' : '/sign-in'}
    >
      {user ? 'Account' : 'Sign in'}
    </Link>
  );
}
