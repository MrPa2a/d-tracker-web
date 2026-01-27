import { useQuery } from '@tanstack/react-query';

export interface AlmanaxDay {
  date: string;
  quantity: number;
  bonus_description: string;
  item: {
    id: number;
    name: string;
    icon_url: string;
    level: number;
    last_price?: number;
    avg_price_7d?: number;
  };
}

export function useAlmanax(server: string | undefined) {
  return useQuery<AlmanaxDay[]>({
    queryKey: ['almanax', server],
    queryFn: async () => {
      if (!server) return [];
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/data?resource=toolbox&mode=almanax&server=${server}`);
      if (!res.ok) throw new Error('Failed to fetch almanax');
      return res.json();
    },
    enabled: !!server,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

export interface ConsumableItem {
  id: number;
  name: string;
  img: string;
  level: number;
  stats: {
    life: number;
    energy: number;
  };
  price: number;
  captured_at?: string;
}

export interface ConsumablesResponse {
  items: ConsumableItem[];
  oldestObservation: string | null;
}

export function useConsumables(server: string | undefined) {
  return useQuery<ConsumablesResponse>({
    queryKey: ['consumables', server],
    queryFn: async () => {
      if (!server) return { items: [], oldestObservation: null };
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/data?resource=toolbox&mode=consumables&server=${server}`);
      if (!res.ok) throw new Error('Failed to fetch consumables');
      return res.json();
    },
    enabled: !!server,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
