import { useState, useEffect } from 'react';
import { useProfileFavorites, useAddProfileFavorite, useRemoveProfileFavorite } from './useProfiles';
import type { Profile } from '../types';

export function useFavorites(currentProfile: Profile | null) {
  const [localFavorites, setLocalFavorites] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('favorites');
      if (!raw) return new Set<string>();
      const arr = JSON.parse(raw) as string[];
      const migrated = arr.map(fav => {
        const parts = fav.split('::');
        return parts.length > 1 ? parts[1] : fav;
      });
      return new Set(migrated);
    } catch (e) {
      console.warn('Failed to load favorites', e);
      return new Set<string>();
    }
  });

  const { data: profileFavorites, isLoading: profileFavoritesLoading } = useProfileFavorites(currentProfile?.id);
  const addMutation = useAddProfileFavorite();
  const removeMutation = useRemoveProfileFavorite();

  const favorites = currentProfile ? new Set(profileFavorites || []) : localFavorites;
  const loading = currentProfile ? profileFavoritesLoading : false;

  useEffect(() => {
    if (!currentProfile) {
      const arr = Array.from(localFavorites);
      localStorage.setItem('favorites', JSON.stringify(arr));
    }
  }, [localFavorites, currentProfile]);

  const toggleFavorite = async (itemName: string) => {
    if (currentProfile) {
      const isAdding = !favorites.has(itemName);
      if (isAdding) {
        addMutation.mutate({ profileId: currentProfile.id, itemName });
      } else {
        removeMutation.mutate({ profileId: currentProfile.id, itemName });
      }
    } else {
      setLocalFavorites(prev => {
        const newFavs = new Set(prev);
        if (newFavs.has(itemName)) {
          newFavs.delete(itemName);
        } else {
          newFavs.add(itemName);
        }
        return newFavs;
      });
    }
  };

  return { favorites, loading, toggleFavorite };
}
