/**
 * Unread Notification Count Hook
 * 
 * React Query hook for fetching unread notification count.
 * Includes a real-time subscription to automatically refetch when notifications change.
 */

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getUnreadCount } from '../../data/notifications';
import { getSupabaseClient } from '../../supabase/client';

export function useUnreadNotificationCount() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = getSupabaseClient();
    
    // Subscribe to all changes on the notifications table
    const channel = supabase
      .channel('public:notifications')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => {
          // Invalidate any queries starting with 'notifications'
          // This will instantly update both the unread count and the list drawer
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['notifications', 'unreadCount'],
    queryFn: () => getUnreadCount(),
    staleTime: 1000 * 20, // 20 seconds
    refetchInterval: 1000 * 30, // Refetch every 30 seconds as fallback
  });
}
