"use client";

import React, { useEffect, useState } from "react";
import { ChatListProps, Chat } from "@/type/type";
import { Socket } from "socket.io-client";

interface Props extends ChatListProps {
  socket: Socket;
}

export function ChatList({ chats: initialChats, onSelect, selectedChat, socket }: Props) {
  const [chats, setChats] = useState<Chat[]>(initialChats);

  useEffect(() => {
    setChats(initialChats);
  }, [initialChats]);

  useEffect(() => {
    if (!socket) return;

    const handleNewChat = (chatData: any) => {
      const formattedChat: Chat = {
        id: chatData._id,
        name: chatData.chatName || chatData.name || "Unknown",
        lastMessage: chatData.latestMessage?.content || "",
      };

      setChats((prev) => {
        const exists = prev.some((c) => c.id === formattedChat.id);
        if (exists) return prev;
        return [formattedChat, ...prev];
      });
    };

    const handleLastMessageUpdate = ({ chatId, lastMessage }: any) => {
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === chatId ? { ...chat, lastMessage } : chat
        )
      );
    };

    socket.on("newChat", handleNewChat);
    socket.on("lastMessageUpdated", handleLastMessageUpdate);

    return () => {
      socket.off("newChat", handleNewChat);
      socket.off("lastMessageUpdated", handleLastMessageUpdate);
    };
  }, [socket]);

  return (
    <div className="flex flex-col">
      {chats.map((chat) => (
        <div
          key={chat.id}
          onClick={() => onSelect(chat.id)}
          className={`p-4 mt-2 mb-2 cursor-pointer rounded-lg transition-all duration-200 shadow-sm ${
            selectedChat === chat.id
              ? "bg-orange-50 shadow-md border-l-4 border-l-orange-500"
              : "hover:bg-orange-100 hover:shadow-md"
          }`}
        >
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">
                {chat.name || "Unknown Chat"}
              </h3>
              {chat.lastMessage && (
                <p className="text-gray-600 text-sm truncate">{chat.lastMessage}</p>
              )}
            </div>
          </div>
        </div>
      ))}

      {chats.length === 0 && (
        <div className="p-4 text-center text-gray-500 italic">
          No chats yet. Start a conversation!
        </div>
      )}
    </div>
  );
}
