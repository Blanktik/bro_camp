import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useAdminStatus() {
  const { user, userRole } = useAuth();
  const [onlineAdminsCount, setOnlineAdminsCount] = useState(0);
  const [isDnd, setIsDnd] = useState(false);

  useEffect(() => {
    if (!user || userRole !== 'admin') return;

    // Initialize or update admin status
    const initStatus = async () => {
      const { data: existing } = await supabase
        .from('admin_status')
        .select('is_dnd')
        .eq('admin_id', user.id)
        .single();

      if (existing) {
        setIsDnd(existing.is_dnd);
        await supabase
          .from('admin_status')
          .update({ is_online: true, last_seen: new Date().toISOString() })
          .eq('admin_id', user.id);
      } else {
        await supabase
          .from('admin_status')
          .insert({ admin_id: user.id, is_online: true, is_dnd: false });
      }
    };

    initStatus();

    // Update last_seen every 30 seconds
    const interval = setInterval(async () => {
      await supabase
        .from('admin_status')
        .update({ last_seen: new Date().toISOString() })
        .eq('admin_id', user.id);
    }, 30000);

    // Set offline on unmount
    return () => {
      clearInterval(interval);
      supabase
        .from('admin_status')
        .update({ is_online: false })
        .eq('admin_id', user.id);
    };
  }, [user, userRole]);

  useEffect(() => {
    // Subscribe to admin status changes
    const channel = supabase
      .channel('admin-status-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_status'
        },
        async () => {
          const { data } = await supabase
            .from('admin_status')
            .select('*')
            .eq('is_online', true)
            .eq('is_dnd', false);
          
          setOnlineAdminsCount(data?.length || 0);
        }
      )
      .subscribe();

    // Initial fetch
    const fetchOnlineCount = async () => {
      const { data } = await supabase
        .from('admin_status')
        .select('*')
        .eq('is_online', true)
        .eq('is_dnd', false);
      
      setOnlineAdminsCount(data?.length || 0);
    };

    fetchOnlineCount();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const toggleDnd = async () => {
    if (!user) return;

    const newDndState = !isDnd;
    const { error } = await supabase
      .from('admin_status')
      .update({ is_dnd: newDndState })
      .eq('admin_id', user.id);

    if (!error) {
      setIsDnd(newDndState);
    }
  };

  return { onlineAdminsCount, isDnd, toggleDnd };
}
