import { useState, useEffect, useCallback, useRef } from "react";
import { socketService, SocketCallbacks } from "@/lib/socketService";
import { Chat, Notification } from "@/type/type";

interface UseSocketReturn {
  socket: typeof socketService | null;
  chats: Chat[];
  notifications: Notification[];
  error: string | null;
  isConnected: boolean;
  sendMessage: (chatId: string, message: string, replyTo?: { _id: string; content: string }) => void;
  refreshChats: () => void;
  handleChatSelect: (chatId: string | null, prevChatId?: string | null) => void;
  handleLocalMessageSent: (chatId: string, message: string) => void;
  handleMarkAsRead: (id: string) => void;
  handleRemoveNotification: (id: string) => void;
  handleClearAllNotifications: () => void;
  reconnect: () => void;
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>;
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  joinChat: (chatId: string) => void;
  leaveChat: (chatId: string) => void;
  markMessagesAsRead: (chatId: string, messages: any[]) => void;
}

export const useSocket = (selectedChat: string | null): UseSocketReturn => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Use ref to track the latest selectedChat value
  const selectedChatRef = useRef<string | null>(selectedChat);

  // Keep the ref updated
  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);

  useEffect(() => {
    const savedNotifications = localStorage.getItem('notifications');
    if (savedNotifications) {
      try {
        setNotifications(JSON.parse(savedNotifications));
      } catch (error) {
        console.error('Error parsing saved notifications:', error);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('notifications', JSON.stringify(notifications));
  }, [notifications]);

  const handleNewChat = useCallback((chat: any) => {
    setChats((prevChats) => {
      const currentUserId = localStorage.getItem("uid");
      let chatName = "Unknown";

      if (chat.isGroup) {
        chatName = chat.name || "Unnamed Group";
      } else if (Array.isArray(chat.users)) {
        const otherUsers = chat.users.filter(
          (u: any) => u && typeof u === "object" && u._id && u._id !== currentUserId
        );
        chatName = otherUsers.length === 1
          ? otherUsers[0]?.name || "Unnamed User"
          : otherUsers.map((u: any) => u.name || "Unnamed").join(", ");
      }

      const newChat: Chat = {
        id: chat._id,
        name: chatName,
        lastMessage: chat.latestMessage?.content || "",
      };

      const filtered = prevChats.filter((c) => c.id !== chat._id);
      return [newChat, ...filtered];
    });
  }, []);

  const handleNewMessage = useCallback((message: any) => {
    const chatId = typeof message.chat === "object" && message.chat !== null
      ? message.chat._id
      : message.chat;

    const currentUserId = localStorage.getItem("uid");

    if (message.senderId !== currentUserId && selectedChatRef.current !== chatId) {
      const senderName = message.senderName || message.sender?.name || "Someone";

      const newNotification: Notification = {
        id: `${message._id}-${Date.now()}`,
        type: 'message',
        message: `${message.content.length > 50 ? message.content.substring(0, 50) + '...' : message.content}`,
        fromUser: senderName,
        chatId: chatId,
        timestamp: new Date().toISOString(),
        read: false
      };

      setNotifications(prev => [newNotification, ...prev.slice(0, 49)]);
    }

    setChats((prevChats) => {
      const existingChatIndex = prevChats.findIndex((chat) => chat.id === chatId);

      if (existingChatIndex === -1) {
        let chatName = "Unknown Chat";
        if (message.chat && typeof message.chat === "object") {
          if (message.chat.isGroup) {
            chatName = message.chat.name || "Unnamed Group";
          } else if (message.chat.users) {
            const currentUserId = localStorage.getItem("uid");
            const otherUsers = message.chat.users.filter(
              (u: any) => u && u._id !== currentUserId
            );
            chatName = otherUsers.length === 1
              ? otherUsers[0]?.name || "Unnamed User"
              : otherUsers.map((u: any) => u.name || "Unnamed").join(", ");
          }
        }

        const newChat: Chat = {
          id: chatId,
          name: chatName,
          lastMessage: message.content || "",
          
        };

        return [newChat, ...prevChats];
      }

      const updatedChats = [...prevChats];
      const [chatToUpdate] = updatedChats.splice(existingChatIndex, 1);

      const updatedChat: Chat = {
        ...chatToUpdate,
        lastMessage: message.content || "",
      };

      return [updatedChat, ...updatedChats];
    });
  }, []); 

  const handleNewNotification = useCallback((notification: any) => {
    const formattedNotification: Notification = {
      id: notification.id || `notification-${Date.now()}`,
      type: notification.type || 'info',
      message: notification.message || 'New notification',
      fromUser: notification.fromUser || 'System',
      chatId: notification.chatId,
      timestamp: notification.timestamp || new Date().toISOString(),
      read: false
    };
    setNotifications(prev => [formattedNotification, ...prev.slice(0, 49)]);
  }, []);

  const handleMessageStatusUpdated = useCallback(({ messageId, status, chatId, updatedAt }: any) => {
    console.log("Message status updated:", { messageId, status, chatId });

    setChats((prevChats) =>
      prevChats.map((chat) => {
        if (chat.id !== chatId) return chat;
        return {
          ...chat,
          lastMessageStatus: status,
        };
      })
    );
  }, []);

  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
  }, []);

  const handleConnected = useCallback(() => {
    setError(null);
    setIsConnected(true);
  }, []);

  const handleDisconnected = useCallback((reason: string) => {
    setError(`Disconnected: ${reason}`);
    setIsConnected(false);
  }, []);

  const handleChatsLoaded = useCallback((loadedChats: Chat[]) => {
    console.log("Chats loaded in hook:", loadedChats);
    setChats(loadedChats);
  }, []);

  const callbacks: SocketCallbacks = {
    onNewChat: handleNewChat,
    onNewMessage: handleNewMessage,
    onNewNotification: handleNewNotification,
    onMessageStatusUpdated: handleMessageStatusUpdated,
    onError: handleError,
    onConnected: handleConnected,
    onDisconnected: handleDisconnected,
    onChatsLoaded: handleChatsLoaded,
  };

  useEffect(() => {
    socketService.initialize(callbacks);

    return () => {
      socketService.disconnect();
    };
  }, []);

  useEffect(() => {
    const handleCustomEvent = (data: any) => {
      console.log("Custom event data:", data);
    };

    socketService.on("customEvent", handleCustomEvent);

    return () => {
      socketService.off("customEvent", handleCustomEvent);
    };
  }, []);

  useEffect(() => {
    if (socketService.isConnected()) {
      socketService.updateCallbacks(callbacks);
    }
  }, [handleNewChat, handleNewMessage, handleNewNotification, handleMessageStatusUpdated, handleError, handleConnected, handleDisconnected, handleChatsLoaded]);

  const handleChatSelect = useCallback((chatId: string | null, prevChatId?: string | null) => {
    if (prevChatId && prevChatId !== chatId) {
      socketService.leaveChat(prevChatId);
    }

    if (chatId) {
      setNotifications(prev =>
        prev.map(notification =>
          notification.chatId === chatId
            ? { ...notification, read: true }
            : notification
        )
      );

      socketService.markMessagesAsDelivered(chatId);
    }
  }, []);

  const handleLocalMessageSent = useCallback((chatId: string, message: string) => {
    console.log("Handling local message sent:", { chatId, message });

    setChats((prevChats) => {
      const chatIndex = prevChats.findIndex((chat) => chat.id === chatId);
      if (chatIndex === -1) {
        console.log("Chat not found for local update");
        return prevChats;
      }

      // Move the updated chat to the top
      const updatedChats = [...prevChats];
      const [chatToUpdate] = updatedChats.splice(chatIndex, 1);

      const updatedChat: Chat = {
        ...chatToUpdate,
        lastMessage: message,
      };

      return [updatedChat, ...updatedChats];
    });
  }, []);

  const refreshChats = useCallback(() => {
    socketService.fetchUserChats();
  }, []);

  const sendMessage = useCallback(
    (chatId: string, message: string, replyTo?: { _id: string; content: string }) => {
      socketService.sendMessage(chatId, message, replyTo);
      handleLocalMessageSent(chatId, message);
    },
    [handleLocalMessageSent]
  );

  const joinChat = useCallback((chatId: string) => {
    socketService.joinChat(chatId);
  }, []);

  const leaveChat = useCallback((chatId: string) => {
    socketService.leaveChat(chatId);
  }, []);

  const markMessagesAsRead = useCallback((chatId: string, messages: any[]) => {
    socketService.markMessagesAsRead(chatId, messages);
  }, []);

  const handleMarkAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id
          ? { ...notification, read: true }
          : notification
      )
    );
  }, []);

  const handleRemoveNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const handleClearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const reconnect = useCallback(() => {
    socketService.reconnect();
  }, []);

  return {
    socket: socketService,
    chats,
    notifications,
    error,
    isConnected,
    refreshChats,
    handleChatSelect,
    handleLocalMessageSent,
    handleMarkAsRead,
    handleRemoveNotification,
    handleClearAllNotifications,
    reconnect,
    setChats,
    setNotifications,
    sendMessage,
    joinChat,
    leaveChat,
    markMessagesAsRead
  };
};