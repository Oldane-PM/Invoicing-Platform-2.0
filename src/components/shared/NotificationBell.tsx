/**
 * Notification Bell Component
 * 
 * Displays a bell icon with unread notification count badge.
 * Clicking opens the notification drawer.
 */

import { Bell } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useUnreadNotificationCount } from '../../lib/hooks/notifications';

interface NotificationBellProps {
  onClick: () => void;
}

export function NotificationBell({ onClick }: NotificationBellProps) {
  const { data: unreadCount = 0, isLoading } = useUnreadNotificationCount();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className="relative h-9 w-9 rounded-lg hover:bg-gray-100"
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
    >
      <Bell className="h-5 w-5 text-gray-600" />
      {!isLoading && unreadCount > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center bg-red-500 hover:bg-red-500"
        >
          <span className="text-[10px] font-semibold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        </Badge>
      )}
    </Button>
  );
}
