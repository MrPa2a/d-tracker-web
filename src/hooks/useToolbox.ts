import { useQuery } from '@tanstack/react-query';

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
}

export function useConsumables(server: string | undefined) {
  return useQuery<ConsumableItem[]>({
    queryKey: ['consumables', server],
    queryFn: async () => {
      if (!server) return [];
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/toolbox?mode=consumables&server=${server}`);
      if (!res.ok) throw new Error('Failed to fetch consumables');
      return res.json();
    },
    enabled: !!server,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
