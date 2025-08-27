import { io, Socket } from "socket.io-client";
import type { DefaultEventsMap } from "@socket.io/component-emitter";
import {
    AuthResponse,
    Chat,
    GetUserChatsResponse,
    JoinDashboardResponse,
    Notification
} from "@/type/type";

export interface SocketCallbacks {
    onNewChat: (chat: any) => void;
    onNewMessage: (message: any) => void;
    onNewNotification: (notification: any) => void;
    onMessageStatusUpdated: (data: any) => void;
    onError: (error: string) => void;
    onConnected: () => void;
    onDisconnected: (reason: string) => void;
    onChatsLoaded: (chats: Chat[]) => void;

}

class SocketService {
    private socket: Socket<DefaultEventsMap, DefaultEventsMap> | null = null;
    private callbacks: SocketCallbacks | null = null;
    private reconnectTimeout: NodeJS.Timeout | null = null;
    private isInitialized = false;
    on(event: string, listener: (...args: any[]) => void): void {
        this.socket?.on(event, listener);
    }

    off(event: string, listener?: (...args: any[]) => void): void {
        this.socket?.off(event, listener);
    }
    constructor() {
        this.socket = null;
    }

    initialize(callbacks: SocketCallbacks): void {
        this.callbacks = callbacks;
        this.connect();
    }

    updateCallbacks(callbacks: SocketCallbacks): void {
        this.callbacks = callbacks;
    }

    private connect(): void {
        const token = localStorage.getItem("token");
        const userId = localStorage.getItem("uid");

        console.log("Initializing socket with:", { token: !!token, userId });

        if (!token || !userId) {
            this.callbacks?.onError("Missing authentication credentials");
            return;
        }

        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }

        try {
            this.socket = io(process.env.NEXT_PUBLIC_SERVER_URL as string, {
                transports: ["websocket"],
                timeout: 10000,
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionAttempts: 5,
                forceNew: true
            });

            console.log("Socket created, attempting connection...");

            this.setupEventListeners(token, userId);

        } catch (error) {
            console.error("Error creating socket:", error);
            this.callbacks?.onError(`Socket creation error: ${error}`);
        }
    }

    private setupEventListeners(token: string, userId: string): void {
        if (!this.socket) return;

        this.socket.on("connect", () => {
            this.socket?.emit("authenticate", token, (authResponse: AuthResponse) => {
                if (authResponse.success) {
                    console.log("Authenticated successfully, joining dashboard...");

                    this.socket?.emit("joinDashboard", userId, (response: JoinDashboardResponse) => {
                        console.log("Join dashboard response:", response);

                        if (response.success) {
                            console.log("Successfully joined dashboard");
                            this.callbacks?.onConnected();
                            this.isInitialized = true;

                            setTimeout(() => {
                                this.fetchUserChats();
                            }, 500);
                        } else {
                            console.error("Failed to join dashboard:", response.error);
                            this.callbacks?.onError(`Dashboard join failed: ${response.error}`);
                        }
                    });
                } else {
                    console.error("Authentication failed:", authResponse.error);
                    this.callbacks?.onError(`Authentication failed: ${authResponse.error}`);
                }
            });
        });

        this.socket.on("connect_error", (error) => {
            console.error("Socket connection error:", error);
            this.callbacks?.onError(`Connection error: ${error.message}`);
        });

        this.socket.on("disconnect", (reason) => {
            console.log("Socket disconnected:", reason);
            this.isInitialized = false;

            if (reason !== 'io client disconnect') {
                this.callbacks?.onDisconnected(reason);
            }
        });

        this.socket.on("reconnect", (attemptNumber) => {
            console.log("Socket reconnected after", attemptNumber, "attempts");
            this.callbacks?.onConnected();
        });

        this.socket.on("reconnect_error", (error) => {
            console.error("Reconnection error:", error);
            this.callbacks?.onError(`Reconnection error: ${error.message}`);
        });

        this.socket.on("reconnect_failed", () => {
            console.error("Failed to reconnect after maximum attempts");
            this.callbacks?.onError("Failed to reconnect to server");
        });

        this.socket.on("newChat", (chat: any) => {
            this.callbacks?.onNewChat(chat);
        });

        this.socket.on("newMessage", (message: any) => {
            this.callbacks?.onNewMessage(message);
        });

        this.socket.on("newNotification", (notification: any) => {
            this.callbacks?.onNewNotification(notification);
        });

        this.socket.on("messageStatusUpdated", (data: any) => {
            this.callbacks?.onMessageStatusUpdated(data);
        });
    }

    fetchUserChats(): void {
        const userId = localStorage.getItem("uid");
        if (!this.socket || !userId || !this.isInitialized) {
            return;
        }


        this.socket.emit(
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

                    this.callbacks?.onChatsLoaded(formattedChats);
                } else {
                    console.error("Failed to fetch chats:", response.message || "Unknown error");
                    this.callbacks?.onError(`Failed to fetch chats: ${response.message || "Unknown error"}`);
                }
            }
        );
    }
    createOneOnOneChat(data: { currentUserId: string; userId: string }): Promise<any> {
        return new Promise((resolve, reject) => {
            if (!this.socket || !this.isInitialized) {
                return reject(new Error("Socket not initialized"));
            }

            this.socket.emit(
                "createGroup",
                {
                    users: [data.currentUserId, data.userId],
                    isGroup: false,
                    admin: null,
                    name: null,
                },
                (response: any) => {
                    if (response.success) {
                        resolve(response.One_On_One || response.group);
                    } else {
                        reject(new Error(response.error || "Failed to create or fetch one-on-one chat"));
                    }
                }
            );
        });
    }

    sendMessage(chatId: string, message: string, replyTo?: { _id: string; content: string }): void {
        if (!this.socket || !this.isInitialized) return;

        const messagePayload: any = {
            chat: chatId,
            content: message.trim(),
        };

        if (replyTo) {
            messagePayload.messageData = {
                _id: replyTo._id,
                content: replyTo.content,
            };
        }

        this.socket.emit("newMessage", messagePayload, (response: any) => {
            if (!response?.success) {
                console.error("Failed to send message:", response?.error);
                this.callbacks?.onError(`Failed to send message: ${response?.error}`);
            }
        });
    }

    joinChat(chatId: string): void {
        if (!this.socket || !this.isInitialized) return;
        this.socket.emit("joinChat", chatId, (response: any) => {
            if (!response.success) {
                this.callbacks?.onError(`Failed to join chat: ${response.error}`);
            }
        });
    }

    leaveChat(chatId: string): void {
        if (!this.socket || !this.isInitialized) return;
        this.socket.emit("leaveChat", chatId);
    }
    markMessagesAsDelivered(chatId: string): void {
        if (!this.socket || !this.isInitialized) return;

        if (this.socket.connected) {
            this.socket.emit("fetchSentMessages", { chatId }, (messages: any[]) => {
                const currentUserId = localStorage.getItem("uid");
                messages.forEach((msg) => {
                    if (msg.senderId !== currentUserId) {
                        this.socket?.emit("messageStatusUpdate", {
                            messageId: msg._id,
                            chatId,
                            statusName: "delivered",
                        });
                    }
                });
            });
        }
    }

    markMessagesAsRead(chatId: string, messages: any[]): void {
        if (!this.socket || !this.isInitialized) return;
        const socket = this.socket
        messages.forEach((message) => {
            socket.emit("messageStatusUpdate", {
                messageId: message._id,
                chatId,
                statusName: "read",
            });
        });
    }



    createGroupChat(groupData: { name: string; users: string[]; currentUserId: string }): Promise<any> {
        return new Promise((resolve, reject) => {
            if (!this.socket || !this.isInitialized) {
                reject(new Error("Socket not initialized"));
                return;
            }

            const uniqueUsers = Array.from(new Set([...groupData.users, groupData.currentUserId]));

            this.socket.emit(
                "createGroup",
                {
                    name: groupData.name,
                    users: uniqueUsers,
                    admin: groupData.currentUserId,
                    isGroup: true,
                },
                (response: any) => {
                    if (response.success) {
                        resolve(response.group);
                    } else {
                        reject(new Error(response.error || "Failed to create group"));
                    }
                }
            );
        });
    }


    getSocket(): Socket<DefaultEventsMap, DefaultEventsMap> | null {
        return this.socket;
    }

    isConnected(): boolean {
        return this.socket?.connected || false;
    }

    reconnect(): void {
        console.log("Manual reconnect initiated");
        this.connect();
    }

    disconnect(): void {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        if (this.socket) {
            this.socket.removeAllListeners();
            this.socket.disconnect();
            this.socket = null;
        }

        this.isInitialized = false;
        this.callbacks = null;
    }
}

export const socketService = new SocketService();