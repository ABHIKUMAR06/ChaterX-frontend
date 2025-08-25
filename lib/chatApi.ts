import {  CreateGroupData, GroupResponse, OneOnOneChatData } from "@/type/type";
import { Socket } from "socket.io-client";


export function createOneOnOneChatSocket(
  socket: Socket,
  { currentUserId, userId }: OneOnOneChatData
): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!socket || !socket.connected) {
      return reject(new Error("Socket not connected"));
    }

    socket.emit(
      "createGroup",
      {
        users: [currentUserId, userId],
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

export function createGroupChatSocket(
  socket: Socket,
  { name, users, currentUserId }: CreateGroupData
): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!socket || !socket.connected) {
      return reject(new Error("Socket not connected"));
    }

    const uniqueUsers = Array.from(new Set([...users, currentUserId]));

    socket.emit("createGroup", {
      name,
      users: uniqueUsers,
      admin: currentUserId,
      isGroup: true,
    }, (response: GroupResponse) => {
      if (response.success) {
        resolve(response.group);
      } else {
        reject(new Error(response.error || "Failed to create group"));
      }
    });
  });
}

