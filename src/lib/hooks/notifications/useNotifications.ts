/**
 * Notifications Hook
 * 
 * React Query hook for fetching notifications.
 */

import { useQuery } from '@tanstack/react-query';
import { getNotifications } from '../../data/notifications';
import type { GetNotificationsParams } from '../../data/notifications';

export function useNotifications(params: GetNotificationsParams = {}) {
  return useQuery({
    queryKey: ['notifications', params],
    queryFn: () => getNotifications(params),
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // Refetch every 60 seconds for updates
  });
}
