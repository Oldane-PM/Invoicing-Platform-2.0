/**
 * Unread Notification Count Hook
 * 
 * React Query hook for fetching unread notification count.
 */

import { useQuery } from '@tanstack/react-query';
import { getUnreadCount } from '../../data/notifications';

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: ['notifications', 'unreadCount'],
    queryFn: () => getUnreadCount(),
    staleTime: 1000 * 20, // 20 seconds
    refetchInterval: 1000 * 30, // Refetch every 30 seconds
  });
}
