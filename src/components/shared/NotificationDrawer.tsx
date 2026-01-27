/**
 * Notification Drawer Component
 * 
 * Displays a list of notifications in a right-side drawer.
 * Supports marking notifications as read and navigating to related submissions.
 */

import * as React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Bell, Check, CheckCheck, Loader2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '../ui/sheet';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '../../lib/hooks/notifications';
import type { Notification } from '../../lib/data/notifications';

interface NotificationDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigateToSubmission?: (submissionId: string) => void;
}

export function NotificationDrawer({ open, onOpenChange, onNavigateToSubmission }: NotificationDrawerProps) {
  const { data: notifications = [], isLoading } = useNotifications({ limit: 50 });
  const markAsReadMutation = useMarkNotificationRead();
  const markAllAsReadMutation = useMarkAllNotificationsRead();

  const unreadNotifications = notifications.filter(n => !n.isRead);
  const hasUnread = unreadNotifications.length > 0;

  const handleNotificationClick = (notification: Notification) => {
    console.log('[NotificationDrawer] Notification clicked:', notification.id, 'isRead:', notification.isRead);
    
    // Mark as read
    if (!notification.isRead) {
      console.log('[NotificationDrawer] Marking notification as read:', notification.id);
      markAsReadMutation.mutate(notification.id, {
        onSuccess: () => {
          console.log('[NotificationDrawer] Successfully marked as read:', notification.id);
        },
        onError: (error) => {
          console.error('[NotificationDrawer] Error marking as read:', error);
        },
      });
    }

    // Close drawer
    onOpenChange(false);

    // Navigate to submission if callback provided
    if (onNavigateToSubmission) {
      onNavigateToSubmission(notification.submissionId);
    }
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[440px] p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-lg font-semibold text-gray-900">
                Notifications
              </SheetTitle>
              <SheetDescription className="text-sm text-gray-600">
                {hasUnread
                  ? `${unreadNotifications.length} unread notification${unreadNotifications.length !== 1 ? 's' : ''}`
                  : 'All caught up!'}
              </SheetDescription>
            </div>
            {hasUnread && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={markAllAsReadMutation.isPending}
                className="text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50"
              >
                {markAllAsReadMutation.isPending ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <CheckCheck className="w-3 h-3 mr-1" />
                )}
                Mark all read
              </Button>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <Bell className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-900 mb-1">No notifications yet</p>
              <p className="text-xs text-gray-600">
                You'll be notified when there are updates to your submissions
              </p>
            </div>
          ) : (
            <div className="py-2">
              {notifications.map((notification, index) => (
                <React.Fragment key={notification.id}>
                  <button
                    onClick={() => handleNotificationClick(notification)}
                    className={`
                      w-full text-left px-6 py-4 transition-colors
                      hover:bg-gray-50 cursor-pointer
                      ${!notification.isRead ? 'bg-blue-50/50' : ''}
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`
                        flex-shrink-0 w-2 h-2 rounded-full mt-2
                        ${!notification.isRead ? 'bg-blue-500' : 'bg-transparent'}
                      `} />
                      <div className="flex-1 min-w-0">
                        <p className={`
                          text-sm mb-1
                          ${!notification.isRead ? 'font-medium text-gray-900' : 'text-gray-700'}
                        `}>
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      {notification.isRead && (
                        <Check className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                      )}
                    </div>
                  </button>
                  {index < notifications.length - 1 && (
                    <Separator className="mx-6" />
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
