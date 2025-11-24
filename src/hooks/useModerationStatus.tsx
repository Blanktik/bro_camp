import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface ModerationRecord {
  id: string;
  moderation_type: string;
  reason: string;
  issued_at: string;
  expires_at: string | null;
  is_active: boolean;
  appeal_status: string | null;
}

export function useModerationStatus() {
  const { user } = useAuth();
  const [moderations, setModerations] = useState<ModerationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    fetchModerations();

    // Set up realtime subscription
    const channel = supabase
      .channel('user_moderation_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_moderation',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchModerations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchModerations = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_moderation')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('issued_at', { ascending: false });

      if (error) throw error;

      setModerations(data || []);
    } catch (error) {
      console.error('Error fetching moderation status:', error);
    } finally {
      setLoading(false);
    }
  };

  const activeWarnings = moderations.filter(m => m.moderation_type === 'warning');
  const activeBan = moderations.find(m => m.moderation_type === 'ban');
  const activeTimeout = moderations.find(m => {
    if (m.moderation_type !== 'timeout') return false;
    if (!m.expires_at) return true;
    return new Date(m.expires_at) > new Date();
  });

  return {
    moderations,
    activeWarnings,
    activeBan,
    activeTimeout,
    loading,
    refetch: fetchModerations,
  };
}
