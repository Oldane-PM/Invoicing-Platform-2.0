import * as React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "../components/ui/sheet";
import { Notification } from "../lib/types";
import { CheckCircle, AlertCircle, FileText, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { ScrollArea } from "../components/ui/scroll-area";

interface NotificationsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notifications: Notification[];
}

const iconMap = {
  approval: CheckCircle,
  contract: AlertCircle,
  submission: FileText,
  payment: DollarSign,
};

const colorMap = {
  approval: {
    icon: "text-green-600",
    bg: "bg-green-100",
    border: "border-green-200",
  },
  contract: {
    icon: "text-yellow-600",
    bg: "bg-yellow-100",
    border: "border-yellow-200",
  },
  submission: {
    icon: "text-blue-600",
    bg: "bg-blue-100",
    border: "border-blue-200",
  },
  payment: {
    icon: "text-purple-600",
    bg: "bg-purple-100",
    border: "border-purple-200",
  },
};

export function NotificationsDrawer({
  open,
  onOpenChange,
  notifications,
}: NotificationsDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[40%] bg-white border-l border-gray-200">
        <SheetHeader className="border-b border-gray-200 pb-4">
          <SheetTitle className="text-xl text-gray-900">Notifications</SheetTitle>
          <SheetDescription className="text-gray-600">
            View and manage your notifications
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-120px)] mt-6 pr-4">
          <div className="space-y-3">
            {notifications.map((notification) => {
              const Icon = iconMap[notification.type];
              const colors = colorMap[notification.type];

              return (
                <div
                  key={notification.id}
                  className={`p-4 rounded-xl border transition-all ${
                    !notification.read
                      ? "bg-blue-50/50 border-blue-200 shadow-sm"
                      : "bg-white border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${colors.bg}`}>
                      <Icon className={`w-5 h-5 ${colors.icon}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium mb-1 ${!notification.read ? "text-gray-900" : "text-gray-700"}`}>
                        {notification.title}
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        {notification.description}
                      </div>
                      <div className="text-xs text-gray-500">
                        {format(notification.timestamp, "MMM d, yyyy 'at' h:mm a")}
                      </div>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1"></div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}