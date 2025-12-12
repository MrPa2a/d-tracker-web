import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchProfiles, createProfile, fetchProfileFavorites, addProfileFavorite, removeProfileFavorite } from '../api';

export function useProfiles() {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: fetchProfiles,
  });
}

export function useCreateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
  });
}

export function useProfileFavorites(profileId: string | undefined) {
  return useQuery({
    queryKey: ['profileFavorites', profileId],
    queryFn: () => fetchProfileFavorites(profileId!),
    enabled: !!profileId,
  });
}

export function useAddProfileFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ profileId, itemName }: { profileId: string; itemName: string }) =>
      addProfileFavorite(profileId, itemName),
    onSuccess: async (_, { profileId }) => {
      await queryClient.invalidateQueries({ queryKey: ['profileFavorites', profileId] });
    },
  });
}

export function useRemoveProfileFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ profileId, itemName }: { profileId: string; itemName: string }) =>
      removeProfileFavorite(profileId, itemName),
    onSuccess: async (_, { profileId }) => {
      await queryClient.invalidateQueries({ queryKey: ['profileFavorites', profileId] });
    },
  });
}
