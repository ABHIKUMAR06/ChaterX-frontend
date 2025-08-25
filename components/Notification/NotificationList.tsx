import React from 'react';
import { Notification, NotificationType,NotificationListProps } from '@/type/type';


const NotificationList: React.FC<NotificationListProps> = ({
  notifications,
  onMarkAsRead,
  onRemove,
  onClearAll,
  onOpenChat,
  isLoading = false,
  emptyMessage = 'No notifications'
}) => {
  const getTypeStyles = (type: NotificationType): string => {
    const styles = {
      info: 'bg-blue-100 border-blue-400 text-blue-800',
      success: 'bg-green-100 border-green-400 text-green-800',
      warning: 'bg-yellow-100 border-yellow-400 text-yellow-800',
      error: 'bg-red-100 border-red-400 text-red-800',
      message: 'bg-blue-100 border-blue-400 text-blue-800'
    };
    return styles[type] || styles.info;
  };

  const getTypeIcon = (type: NotificationType): React.ReactNode => {
    const icons = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      message: '💬'
    };
    return icons[type] || icons.info;
  };

  const formatTime = (timestamp: string | Date): string => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const handleOpenChat = (notification: Notification) => {
    if (notification.chatId && onOpenChat) {
      onOpenChat(notification.chatId);
      if (!notification.read) {
        onMarkAsRead(notification.id);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-4">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-gray-300 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                <div className="h-3 bg-gray-300 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
        <h3 className="text-lg font-semibold text-gray-800">Notifications</h3>
        {notifications.length > 0 && (
          <button
            onClick={onClearAll}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            {emptyMessage}
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${
                notification.read ? 'opacity-70' : 'bg-blue-50'
              }`}
              onClick={() => handleOpenChat(notification)}
            >
              <div className="flex items-start space-x-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${getTypeStyles(notification.type)}`}>
                  {getTypeIcon(notification.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <h4 className={`font-medium ${notification.read ? 'text-gray-600' : 'text-gray-900'}`}>
                      {notification.fromUser}
                    </h4>
                    <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                      {formatTime(notification.timestamp)}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 mt-1">
                    {notification.message}
                  </p>

                  {notification.chatId && (
                    <div className="mt-2 flex items-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenChat(notification);
                        }}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Open Chat
                      </button>
                      {!notification.read && (
                        <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full">
                          New
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {!notification.read && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMarkAsRead(notification.id);
                      }}
                      className="text-xs text-gray-500 hover:text-gray-700 p-1"
                      title="Mark as read"
                    >
                      ✓
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(notification.id);
                    }}
                    className="text-xs text-gray-500 hover:text-red-600 p-1"
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {notifications.length > 0 && (
        <div className="px-4 py-3 bg-gray-50 border-t">
          <div className="text-sm text-gray-600">
            {notifications.filter(n => !n.read).length} unread
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationList;