import { fetchMessage } from "@/lib/messageAPI";
import { ChatWindowProps, Messages } from "@/type/type";
import { useState, useEffect, useRef } from "react";
import { Socket } from "socket.io-client";

interface ExtendedChatWindowProps extends ChatWindowProps {
  socket: Socket | null;
}

export default function ChatWindow({ chatId, name, onMessageSent, socket }: ExtendedChatWindowProps) {
  const [messages, setMessages] = useState<Messages[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState<{ [userId: string]: string }>({});
  const [hasJoinedChat, setHasJoinedChat] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const userId = localStorage.getItem("uid");
    setCurrentUserId(userId);
  }, []);

  useEffect(() => {
    if (!socket || !chatId || !currentUserId || !socket.connected) return;

    console.log("Joining chat:", chatId);
    setHasJoinedChat(false);

    socket.emit("joinChat", chatId, (response: any) => {
      if (response?.success) {
        console.log("Successfully joined chat:", chatId);
        setHasJoinedChat(true);
      } else {
        console.error("Failed to join chat:", response?.error);
      }
    });

    return () => {
      if (socket && chatId) {
        console.log("Leaving chat:", chatId);
        socket.emit("leaveChat", chatId);
        setHasJoinedChat(false);
      }
    };
  }, [socket, chatId, currentUserId]);

  useEffect(() => {
    if (!socket || !chatId || !currentUserId) return;

    const handleNewMessage = (message: Messages) => {
      console.log("ChatWindow received new message:", message);
      
      const messageChatId = typeof message.chat === "object" && message.chat !== null
        ? (message.chat as any)._id
        : message.chat;

      if (messageChatId !== chatId) {
        console.log("Message not for current chat, ignoring");
        return;
      }

      setMessages((prev) => {
        if (prev.find((msg) => msg._id === message._id)) {
          console.log("Message already exists, skipping");
          return prev;
        }
        
        console.log("Adding new message to chat");
        return [...prev, message].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      });
    };

    const handleStatusUpdate = ({ messageId, status, chatId: updateChatId }: { 
      messageId: string; 
      status: string; 
      chatId?: string 
    }) => {
      if (updateChatId && updateChatId !== chatId) return;

      console.log("Updating message status:", { messageId, status });
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageId 
            ? { ...msg, status: { ...msg.status, name: status } } 
            : msg
        )
      );
    };

    const handleUserTyping = ({ userId, userName, isTyping }: { 
      userId: string; 
      userName: string; 
      isTyping: boolean 
    }) => {
      if (userId === currentUserId) return;

      setIsTyping((prev) => {
        const newTyping = { ...prev };
        if (isTyping) {
          newTyping[userId] = userName;
        } else {
          delete newTyping[userId];
        }
        return newTyping;
      });
    };

    socket.off("newMessage", handleNewMessage);
    socket.off("messageStatusUpdated", handleStatusUpdate);
    socket.off("userTyping", handleUserTyping);

    socket.on("newMessage", handleNewMessage);
    socket.on("messageStatusUpdated", handleStatusUpdate);
    socket.on("userTyping", handleUserTyping);

    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("messageStatusUpdated", handleStatusUpdate);
      socket.off("userTyping", handleUserTyping);
    };
  }, [socket, chatId, currentUserId]);

  useEffect(() => {
    if (!chatId || !currentUserId) return;

    const fetchMessages = async () => {
      try {
        setLoading(true);
        console.log("Fetching messages for chat:", chatId);
        
        const data = await fetchMessage(chatId);

        if (data.messages && Array.isArray(data.messages)) {
          const sorted = data.messages.sort(
            (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          console.log("Loaded messages:", sorted.length);
          setMessages(sorted);
        } else {
          console.log("No messages found");
          setMessages([]);
        }
      } catch (err) {
        console.error("Error fetching messages:", err);
        setMessages([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [chatId, currentUserId]);

  useEffect(() => {
    if (!socket || !chatId || !currentUserId || !hasJoinedChat) return;

    const container = containerRef.current;
    if (!container) return;

    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    if (!isNearBottom) return;

    const unreadMessages = messages.filter((message) => 
      message.sender?._id !== currentUserId && 
      message.status?.name !== "read"
    );

    unreadMessages.forEach((message) => {
      socket.emit("messageStatusUpdate", {
        messageId: message._id,
        chatId,
        statusName: "read",
      });
    });
  }, [messages, socket, chatId, currentUserId, hasJoinedChat]);

  useEffect(() => {
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);

    return () => clearTimeout(timer);
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    
    if (!socket || !chatId || !currentUserId || !hasJoinedChat) return;


    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("userTyping", { 
        userId: currentUserId, 
        userName: "You", 
        isTyping: false, 
        chatId 
      });
    }, 1000);
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !socket || !chatId || !currentUserId || !hasJoinedChat) {
      console.log("Cannot send message:", { 
        hasMessage: !!newMessage.trim(), 
        hasSocket: !!socket, 
        hasChatId: !!chatId, 
        hasUserId: !!currentUserId, 
        hasJoinedChat 
      });
      return;
    }

    const messagePayload = { chat: chatId, content: newMessage.trim() };
    console.log("Sending message:", messagePayload);



    socket.emit("newMessage", messagePayload, (response: any) => {
        if (onMessageSent) {
          onMessageSent(chatId, newMessage.trim());
        }
        setNewMessage(""); 
        
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Show loading state
  if (!socket || !currentUserId) {
    return (
      <div className="flex flex-col h-full w-full max-w-full bg-orange-50 items-center justify-center">
        <div className="text-orange-500">Connecting...</div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex flex-col h-full w-full max-w-full bg-orange-50">
      <div className="p-3 bg-orange-500 text-white shadow flex items-center justify-between">
        <h2 className="text-lg font-semibold">{name}</h2>
        <div className="text-xs italic">
          {Object.values(isTyping).length > 0 && (
            <span>{Object.values(isTyping).join(", ")} typing...</span>
          )}
          {!hasJoinedChat && (
            <span className="text-orange-200">Joining chat...</span>
          )}
        </div>
      </div>

      <div className="flex-grow p-4 overflow-y-auto space-y-3">
        {loading && (
          <div className="text-center text-gray-500">Loading messages...</div>
        )}
        
        {messages.length === 0 && !loading && (
          <div className="text-center text-gray-400">No messages yet. Start the conversation!</div>
        )}

        {messages.map((msg) => (
          <div 
            key={msg._id} 
            className={`flex ${
              msg.sender?._id === currentUserId ? "justify-end" : "justify-start"
            }`}
          >
            <div 
              className={`max-w-xs px-3 py-2 rounded-2xl shadow text-sm ${
                msg.sender?._id === currentUserId 
                  ? "bg-orange-500 text-white rounded-br-none" 
                  : "bg-white text-gray-900 rounded-bl-none"
              }`}
            >
              {msg.sender?._id !== currentUserId && (
                <div className="font-semibold text-xs mb-1 text-orange-600">
                  {msg.sender?.name || "Unknown"}
                </div>
              )}
              <div>{msg.content}</div>
              <div className="text-[10px] mt-1 flex justify-between items-center opacity-75">
                <span>
                  {new Date(msg.createdAt).toLocaleTimeString([], { 
                    hour: "2-digit", 
                    minute: "2-digit" 
                  })}
                </span>
                {msg.sender?._id === currentUserId && (
                  <span className={`${
                    msg.status?.name === "read" ? "text-green-300" : "text-white"
                  }`}>
                    {msg.status?.name === "sent" && "✓"}
                    {msg.status?.name === "delivered" && "✓✓"}
                    {msg.status?.name === "read" && "✓✓"}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 bg-white flex items-center gap-2 shadow-lg">
        <textarea
          className="flex-grow rounded-full px-4 py-2 resize-none text-sm bg-gray-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
          rows={1}
          value={newMessage}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={loading || !hasJoinedChat}
        />
        <button
          className="bg-orange-500 text-white px-5 py-2 rounded-full shadow-md hover:bg-orange-600 active:scale-95 transition disabled:opacity-50"
          onClick={handleSendMessage}
          disabled={loading || newMessage.trim() === "" || !hasJoinedChat}
        >
          Send
        </button>
      </div>
    </div>
  );
}