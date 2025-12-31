
export type Theme = 'light' | 'dark';

export interface User {
  id: string;
  name: string;
  email: string; // Added email for login
  avatar: string;
  status: 'online' | 'offline';
  isMe?: boolean;
}

export interface Attachment {
  url: string;
  name: string;
  mimeType: string;
  size: number;
  isImage: boolean;
}

export interface Message {
  id: string;
  senderId: string;
  recipientId?: string; // Target user for personal chats
  text?: string;
  attachment?: Attachment;
  timestamp: number;
  groupId?: string; // Target group for group chats
}

export interface Group {
  id: string;
  name: string;
  creatorId: string;
  members: string[]; // User IDs
  deniedMembers: string[]; // User IDs blocked from this group
  lastMessage?: string;
}

export type ChatType = 'personal' | 'group';

export interface ChatSession {
  type: ChatType;
  id: string; // Target user ID or Group ID
}