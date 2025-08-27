"use client";

import { useState, useCallback } from "react";
import { ChatList } from "@/components/ChatList/ChatList";
import ChatWindow from "@/components/ChatWindow/ChatWindow";
import UserSearch from "@/components/Search/Search";
import NotificationList from "@/components/Notification/NotificationList";
import { Chat, User } from "@/type/type";
import { MdOutlineGroupAdd, MdNotifications, MdNotificationsActive } from "react-icons/md";
import { GroupModel } from "@/components/Model/GroupModel";
import { Auth } from "@/components/Auth/Auth";
import { useSocket } from "@/hooks/useSocket";

function DashboardPage() {
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [showModel, setShowModel] = useState<boolean>(false);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [messageUpdateTrigger, setMessageUpdateTrigger] = useState(0);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);

  const {
    socket,
    chats,
    createGroupChat,
    createOneOnOneChat,
    notifications,
    handleChatSelect,
    handleLocalMessageSent,
    handleMarkAsRead,
    handleRemoveNotification,
    handleClearAllNotifications,
    setChats,
  } = useSocket(selectedChat);


  const selectedChatData = chats.find((c) => c.id === selectedChat);
  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  const handleGroupCreate = async (groupData: { name: string; users: string[] }) => {
    try {
      const currentUserId = localStorage.getItem("uid");
      if (!currentUserId) throw new Error("User not authenticated");

      const newGroup = await createGroupChat({
        name: groupData.name,
        users: groupData.users,
        currentUserId,
      });

      const newChat: Chat = {
        id: newGroup._id,
        name: newGroup.chatName || newGroup.name || groupData.name,
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
  const handleUserClick = async (user: User) => {
    try {
      const currentUserId = localStorage.getItem("uid");
      if (!currentUserId || !user._id) throw new Error("Missing user data");

      const chat = await createOneOnOneChat({
        currentUserId,
        userId: user._id,
      });

      const formattedChat: Chat = {
        id: chat._id,
        name: user.name,
        lastMessage: chat.lastMessage?.text || "",
      };

      setChats((prev) => {
        const exists = prev.some(c => c.id === formattedChat.id);
        return exists ? prev : [formattedChat, ...prev];
      });

      setSelectedChat(chat._id);
    } catch (err) {
      console.error("Failed to create or fetch chat:", err);
    }
  };
  const onChatSelect = useCallback((chatId: string | null) => {
    const prevChatId = selectedChat;
    setSelectedChat(chatId);
    handleChatSelect(chatId, prevChatId);
  }, [selectedChat, handleChatSelect]);

  const onNotificationOpenChat = useCallback((chatId: string) => {
    onChatSelect(chatId);
    setShowNotifications(false);
  }, [onChatSelect]);

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
                    onOpenChat={onNotificationOpenChat}
                    isLoading={isLoadingNotifications}
                    emptyMessage="No new notifications"
                  />
                </div>
              )}
            </div>

            <button onClick={() => setShowModel(true)}>
              <MdOutlineGroupAdd size={24} className="text-white" />
            </button>
          </div>
        </div>

        {socket?.getSocket() && (
          <UserSearch
            onUserClick={handleUserClick}
          />
        )}

        <div className="flex-1 overflow-y-auto flex flex-col">
          {socket?.getSocket() ? (
            chats.length > 0 ? (
              <ChatList
                socket={socket.getSocket()}
                chats={chats}
                onSelect={onChatSelect}
                selectedChat={selectedChat}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4 space-y-4">
                <p className="text-orange-500 font-medium">No chats yet!</p>
                <p className="text-sm text-orange-300">Start a new conversation using the search above.</p>
              </div>
            )
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4 space-y-4">
              <p className="text-gray-500 font-medium">Connecting to chat...</p>
              <p className="text-sm text-gray-400">Please wait while we establish connection.</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {selectedChat && socket?.getSocket() && (
          <ChatWindow
            key={`${selectedChat}-${messageUpdateTrigger}`}
            chatId={selectedChat}
            name={selectedChatData?.name || "Unknown Chat"}
            onMessageSent={handleLocalMessageSent}
            socket={socket.getSocket()!}
          />
        )}
      </div>

      {showNotifications && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowNotifications(false)}
        />
      )}

      {showModel && (
        <GroupModel
          onClose={() => setShowModel(false)}
          onCreate={handleGroupCreate}
        />
      )}
    </div>
  );
}

export default Auth(DashboardPage);