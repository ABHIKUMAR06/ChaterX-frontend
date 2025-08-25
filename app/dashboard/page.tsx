"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ChatList } from "@/components/ChatList/ChatList";
import ChatWindow from "@/components/ChatWindow/ChatWindow";
import UserSearch from "@/components/Search/Search";
import NotificationList from "@/components/Notification/NotificationList";
import { createGroupChatSocket } from "@/lib/chatApi";
import { AuthResponse, Chat, GetUserChatsResponse, JoinDashboardResponse, Notification } from "@/type/type";
import { MdOutlineGroupAdd, MdNotifications, MdNotificationsActive } from "react-icons/md";
import { GroupModel } from "@/components/Model/GroupModel";
import { io, Socket } from "socket.io-client";
import type { DefaultEventsMap } from "@socket.io/component-emitter";

export default function DashboardPage() {
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [showModel, setShowModel] = useState<boolean>(false);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [messageUpdateTrigger, setMessageUpdateTrigger] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedChatData = chats.find((c) => c.id === selectedChat);
  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  const chatsRef = useRef<Chat[]>([]);
  useEffect(() => {
    chatsRef.current = chats;
  }, [chats]);

  const socketRef = useRef<Socket<DefaultEventsMap, DefaultEventsMap> | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  const initializeSocket = useCallback(() => {
    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("uid");

    console.log("Initializing socket with:", { token: !!token, userId });

    if (!token || !userId) {
      setError("Missing authentication credentials");
      return;
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setError(null);

    try {
      socketRef.current = io(process.env.NEXT_PUBLIC_SERVER_URL as string, {
        transports: ["websocket", "polling"],
        timeout: 10000,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        forceNew: true
      });

      console.log("Socket created, attempting connection...");

      socketRef.current.on("connect", () => {
        console.log("Socket connected, attempting authentication...");

        socketRef.current?.emit("authenticate", token, (authResponse: AuthResponse) => {
          console.log("Authentication response:", authResponse);

          if (authResponse.success) {
            console.log("Authenticated successfully, joining dashboard...");

            socketRef.current?.emit("joinDashboard", userId, (response: JoinDashboardResponse) => {
              console.log("Join dashboard response:", response);

              if (response.success) {
                console.log("Successfully joined dashboard");
                setError(null);

                setTimeout(() => {
                  fetchAndFormatChatsSocket();
                }, 500);
              } else {
                console.error("Failed to join dashboard:", response.error);
                setError(`Dashboard join failed: ${response.error}`);
              }
            });
          } else {
            console.error("Authentication failed:", authResponse.error);
            setError(`Authentication failed: ${authResponse.error}`);
          }
        });
      });

      socketRef.current.on("connect_error", (error) => {
        console.error("Socket connection error:", error);
        setError(`Connection error: ${error.message}`);
      });

      socketRef.current.on("disconnect", (reason) => {
        console.log("Socket disconnected:", reason);

        if (reason !== 'io client disconnect') {
          setError(`Disconnected: ${reason}`);
        }
      });

      socketRef.current.on("reconnect", (attemptNumber) => {
        console.log("Socket reconnected after", attemptNumber, "attempts");
        setError(null);
      });

      socketRef.current.on("reconnect_error", (error) => {
        console.error("Reconnection error:", error);
        setError(`Reconnection error: ${error.message}`);
      });

      socketRef.current.on("reconnect_failed", () => {
        console.error("Failed to reconnect after maximum attempts");
        setError("Failed to reconnect to server");
      });

      socketRef.current.on("newChat", (chat: any) => {
        console.log("New chat received:", chat);
        setChats((prevChats) => {
          if (prevChats.some((c) => c.id === chat._id)) return prevChats;

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
            lastMessage: "",
          };
          return [newChat, ...prevChats];
        });
      });

      socketRef.current.on("newMessage", (message: any) => {
        console.log("Received new message:", message);

        const chatId = typeof message.chat === "object" && message.chat !== null
          ? message.chat._id
          : message.chat;

        const currentUserId = localStorage.getItem("uid");

        if (message.senderId !== currentUserId && selectedChat !== chatId) {
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

          const updatedChat: Chat = {
            ...prevChats[existingChatIndex],
            lastMessage: message.content || "",
          };

          const newChats = [...prevChats];
          newChats.splice(existingChatIndex, 1);
          return [updatedChat, ...newChats];
        });
      });

      socketRef.current.on("newNotification", (notification: any) => {
        console.log("Received notification:", notification);

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
      });

      socketRef.current.on("messageStatusUpdated", ({ messageId, status, chatId, updatedAt }: any) => {
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
      });

    } catch (error) {
      console.error("Error creating socket:", error);
      setError(`Socket creation error: ${error}`);
    }
  }, [selectedChat]);

  useEffect(() => {
    initializeSocket();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [initializeSocket]);

  const fetchAndFormatChatsSocket = useCallback(() => {
    const userId = localStorage.getItem("uid");
    if (!socketRef.current || !userId) {
      console.log("Cannot fetch chats: socket or userId missing");
      return;
    }

    console.log("Fetching user chats...");

    socketRef.current.emit(
      "getUserChats",
      userId,
      (response: GetUserChatsResponse) => {
        console.log("Get user chats response:", response);

        if (response.success && Array.isArray(response.chats)) {
          const formattedChats: Chat[] = response.chats
            .filter((c: any) => c && c._id)
            .map((c: any) => {
              let chatName = "Unknown";

              if (c.isGroup) {
                chatName = c.name || "Unnamed Group";
              } else if (Array.isArray(c.users)) {
                const otherUsers = c.users.filter(
                  (u: any) => u && typeof u === "object" && u._id && u._id !== userId
                );

                chatName =
                  otherUsers.length === 1
                    ? otherUsers[0]?.name || "Unnamed User"
                    : otherUsers.map((u: any) => u.name || "Unnamed").join(", ");
              }

              return {
                id: c._id,
                name: chatName,
                lastMessage: c.lastMessage?.content || "",
                lastMessageSender: c.lastMessage?.sender?._id === userId
                  ? "You"
                  : (c.lastMessage?.sender?.name || ""),
                lastMessageTimestamp: c.lastMessage?.createdAt || c.updatedAt || c.createdAt,
                lastMessageStatus: c.lastMessage?.status?.name || "sent",
              };
            });

          console.log("Setting formatted chats:", formattedChats);
          setChats(formattedChats);
        } else {
          console.error("Failed to fetch chats:", response.message || "Unknown error");
          setError(`Failed to fetch chats: ${response.message || "Unknown error"}`);
        }
      }
    );
  }, []);

  const refreshChats = useCallback(() => fetchAndFormatChatsSocket(), [fetchAndFormatChatsSocket]);

  const handleLocalMessageSent = useCallback((chatId: string, message: string) => {
    console.log("Handling local message sent:", { chatId, message });

    setChats((prevChats) => {
      const chatIndex = prevChats.findIndex((chat) => chat.id === chatId);
      if (chatIndex === -1) {
        console.log("Chat not found for local update");
        return prevChats;
      }

      const updatedChat: Chat = {
        ...prevChats[chatIndex],
        lastMessage: message,
      };

      const newChats = [...prevChats];
      newChats.splice(chatIndex, 1);
      return [updatedChat, ...newChats];
    });
  }, []);

  useEffect(() => {
    if (!socketRef.current || !selectedChat) return;

    if (socketRef.current.connected) {
      socketRef.current.emit("fetchSentMessages", { chatId: selectedChat }, (messages: any[]) => {
        const currentUserId = localStorage.getItem("uid");
        messages.forEach((msg) => {
          if (msg.senderId !== currentUserId) {
            socketRef.current?.emit("messageStatusUpdate", {
              messageId: msg._id,
              chatId: selectedChat,
              statusName: "delivered",
            });
          }
        });
      });
    }
  }, [selectedChat]);

  const handleGroupCreate = async (groupData: { name: string; users: string[] }) => {
    try {
      const currentUserId = localStorage.getItem("uid");
      if (!currentUserId) throw new Error("User not authenticated");

      if (!socketRef.current) throw new Error("Socket not initialized");

      const newGroup = await createGroupChatSocket(socketRef.current, {
        name: groupData.name,
        users: groupData.users,
        currentUserId,
      });

      const newChat: Chat = {
        id: newGroup._id,
        name: newGroup.chatName || groupData.name,
        lastMessage: "",
      };

      setChats((prev) => {
        const exists = prev.some(chat => chat.id === newChat.id);
        if (exists) return prev;
        return [newChat, ...prev];
      });
      setSelectedChat(newGroup._id);
      setShowModel(false);
    } catch (err) {
      console.error("Error creating group:", err);
      alert("Failed to create group");
    }
  };

  const handleChatSelect = useCallback((chatId: string | null) => {
    console.log("Selecting chat:", chatId);

    if (selectedChat && selectedChat !== chatId && socketRef.current) {
      console.log("Leaving previous chat:", selectedChat);
      socketRef.current.emit("leaveChat", selectedChat);
    }

    setSelectedChat(chatId);

    if (chatId) {
      setNotifications(prev =>
        prev.map(notification =>
          notification.chatId === chatId
            ? { ...notification, read: true }
            : notification
        )
      );
    }
  }, [selectedChat]);

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const handleRemoveNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const handleClearAllNotifications = () => {
    setNotifications([]);
  };

  const handleRetry = () => {
    console.log("Manual retry initiated");
    initializeSocket();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'failed': case 'error': return 'text-red-600';
      case 'pending': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="flex h-screen bg-orange-50">
      <div className="w-80 bg-white flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-orange-400 to-orange-500 rounded-md shadow-md">
          <h2 className="text-2xl font-bold text-white">ChaterX</h2>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative text-white hover:text-orange-100 transition-colors"
              >
                {unreadNotificationsCount > 0 ? (
                  <MdNotificationsActive size={24} />
                ) : (
                  <MdNotifications size={24} />
                )}
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                    {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 z-50 shadow-lg">
                  <NotificationList
                    notifications={notifications}
                    onMarkAsRead={handleMarkAsRead}
                    onRemove={handleRemoveNotification}
                    onClearAll={handleClearAllNotifications}
                    onOpenChat={(chatId) => {
                      handleChatSelect(chatId);
                      setShowNotifications(false);
                    }}
                    isLoading={isLoadingNotifications}
                    emptyMessage="No new notifications"
                  />
                </div>
              )}
            </div>

            <button
              onClick={() => setShowModel(true)}
            >
              <MdOutlineGroupAdd size={24} className="text-white" />
            </button>
          </div>
        </div>



        {socketRef.current && (
          <UserSearch
            socket={socketRef.current}
            onChatCreated={(chat: Chat) => {
              setChats((prev) => {
                const exists = prev.some((c) => c.id === chat.id);
                if (!exists) return [chat, ...prev];
                return prev;
              });
               setSelectedChat(chat.id);
              refreshChats();
            }}
          />
        )}

        <div className="flex-1 overflow-y-auto flex flex-col">
          {socketRef.current &&
            (chats.length > 0 ? (
              <ChatList
                socket={socketRef.current}
                chats={chats}
                onSelect={handleChatSelect}
                selectedChat={selectedChat}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4 space-y-4">
                <p className="text-orange-500 font-medium">No chats yet!</p>
                <p className="text-sm text-orange-300">Start a new conversation using the search above.</p>
              </div>
            ))}


        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {selectedChat && (
          <ChatWindow
            key={`${selectedChat}-${messageUpdateTrigger}`}
            chatId={selectedChat}
            name={selectedChatData?.name || "Unknown Chat"}
            onMessageSent={handleLocalMessageSent}
            socket={socketRef.current}
          />
        )}
      </div>

      {showNotifications && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowNotifications(false)}
        />
      )}

      {showModel && <GroupModel onClose={() => setShowModel(false)} onCreate={handleGroupCreate} />}
    </div>
  );
}