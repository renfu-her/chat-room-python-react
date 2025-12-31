
export type Theme = 'light' | 'dark';

export interface User {
  id: number; // Changed to number to match API
  name: string;
  email: string;
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
  id: number; // Changed to number to match API
  senderId: number; // Changed to number
  recipientId?: number; // Changed to number
  text?: string;
  attachment?: Attachment;
  timestamp: number; // Will convert from ISO string
  groupId?: number; // Changed to number
}

export interface Group {
  id: number; // Changed to number to match API
  name: string;
  creatorId: number; // Changed to number
  members: number[]; // Changed to number[]
  deniedMembers: number[]; // Changed to number[]
  lastMessage?: string;
}

export type ChatType = 'personal' | 'group';

export interface ChatSession {
  type: ChatType;
  id: number; // Changed to number to match API
}