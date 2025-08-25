import { Socket } from "socket.io-client";
export interface CreateChatParams {
    currentUserId: string;
    userId: string;
}

export interface sendMessageProps {
    sender: string,
    chat: string,
    content: string
}

export interface Chat {
    id: string;
    name: string;
    lastMessage?: string;
}
interface GroupData {
  name: string;
  users: string[];
}
export interface GroupModelProps {
  onClose: () => void;
  onCreate: (groupData: GroupData) => void;
}
export interface ChatListProps {
    chats: Chat[];
    onSelect: (chatId: string) => void;
    selectedChat: string | null;
}
export interface Messages {
    _id: string;
    sender: {
        _id: string;
        name: string;
        email: string;
    };receiver:[{_id:string,name:string,email:string}],
    content: string;
    chat: string;
    status: {
        _id: string;
        name: string;
    };
    createdAt: string;
}
export interface ChatWindowProps {
    chatId: string;
    name: string;
    socket?: Socket | null;
     onMessageSent?: (chatId: string, content: string) => void;
}
export interface User {
    _id: string;
    name: string;
    email: string;
}

export interface UserSearchProps {
    onChatCreated: (chat: Chat) => void,
    socket: Socket
}

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'message';
export interface ButtonProps {
  value: string;
  className?: string;
  loading?: boolean;
  onClick?: () => void;
}
export interface NotificationListProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
  onOpenChat?: (chatId: string) => void; 
  isLoading?: boolean;
  emptyMessage?: string;
}

export interface Notification {
  id: string; 
  type: NotificationType;
  chatId: string;
  fromUser: string;
  message: string;
  timestamp: string | Date;
  read: boolean;
  };


export interface CreateGroupData {
  name: string;
  users: string[];
  currentUserId: string;
}

export interface GroupResponse {
  success: boolean;
  group?: any;
  error?: string;
}
export interface OneOnOneChatData {
  currentUserId: string;
  userId: string;
}

export interface AuthResponse {
  success: boolean;
  error?: string;
}

export interface JoinDashboardResponse {
  success: boolean;
  error?: string;
}

export interface GetUserChatsResponse {
  success: boolean;
  chats?: any[];
  message?: string;
}