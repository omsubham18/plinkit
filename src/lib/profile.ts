import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import { useAuthStore } from './authStore';
import type { ProfileRow } from '@/types/database';

export function isProfileComplete(profile: ProfileRow | null | undefined): boolean {
  if (!profile) return false;
  const hasName = Boolean(profile.full_name && profile.full_name.trim().length > 0);
  const hasPhone = Boolean(profile.phone && /^[6-9]\d{9}$/.test(profile.phone.trim()));
  const hasPoint = Boolean(profile.delivery_point_id);
  const hasRoom = Boolean(profile.room && profile.room.trim().length > 0);
  return hasName && hasPhone && hasPoint && hasRoom;
}

export async function fetchUserProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  return data;
}

export function useProfile() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      return fetchUserProfile(user.id);
    },
    enabled: Boolean(user?.id),
    staleTime: 60_000,
  });
}

export interface ProfileInput {
  full_name: string;
  phone: string;
  delivery_point_id: string;
  room: string;
}

export function useUpsertProfile() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async (input: ProfileInput) => {
      if (!user?.id) {
        throw new Error('User is not signed in');
      }

      const payload = {
        id: user.id,
        full_name: input.full_name.trim(),
        phone: input.phone.trim(),
        delivery_point_id: input.delivery_point_id,
        room: input.room.trim(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('profiles')
        .upsert(payload)
        .select()
        .single();

      if (error) {
        throw error;
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['profile', user?.id], data);
    },
  });
}
