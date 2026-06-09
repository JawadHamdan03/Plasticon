import { useEffect, useState } from 'react';
import { api } from '../api/client';

export function useUnreadCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get<any>('/notifications?limit=50');
        const list: any[] = Array.isArray(res) ? res : Array.isArray(res?.items) ? res.items : [];
        setCount(list.filter((n) => !n.isRead).length);
      } catch {}
    };
    void fetch();
    const id = setInterval(fetch, 30_000);
    return () => clearInterval(id);
  }, []);

  return count;
}
