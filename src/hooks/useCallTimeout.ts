import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useCallTimeout = (callId: string, onTimeout: () => void) => {
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      // Check if call is still pending
      const { data: call } = await supabase
        .from('calls')
        .select('status')
        .eq('id', callId)
        .single();

      if (call?.status === 'pending') {
        // Mark as missed
        await supabase
          .from('calls')
          .update({ status: 'missed' })
          .eq('id', callId);

        // Notify all admins
        const { data: admins } = await supabase
          .from('user_roles')
          .select('user_id')
          .in('role', ['admin', 'super_admin']);

        // In a real app, this would send push notifications
        // For now, we'll just mark it as missed
        console.log('Call missed, would notify admins:', admins);
        
        onTimeout();
        toast.error('Call not answered - marked as missed');
      }
    }, 15000); // 15 seconds

    return () => clearTimeout(timeoutId);
  }, [callId, onTimeout]);
};
