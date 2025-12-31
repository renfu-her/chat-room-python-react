// API Client for Chat Room Backend
const API_BASE_URL = 'http://localhost:8000/api';

// Helper function to convert snake_case to camelCase
function toCamelCase(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(toCamelCase);
  }
  
  if (typeof obj === 'object') {
    const camelObj: any = {};
    for (const key in obj) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      camelObj[camelKey] = toCamelCase(obj[key]);
    }
    return camelObj;
  }
  
  return obj;
}

// Helper function to convert camelCase to snake_case
function toSnakeCase(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(toSnakeCase);
  }
  
  if (typeof obj === 'object') {
    const snakeObj: any = {};
    for (const key in obj) {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      snakeObj[snakeKey] = toSnakeCase(obj[key]);
    }
    return snakeObj;
  }
  
  return obj;
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config: RequestInit = {
    ...options,
    credentials: 'include', // Include cookies for session
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };
  
  // Convert body to snake_case if it's an object
  if (config.body && typeof config.body === 'string') {
    try {
      const bodyObj = JSON.parse(config.body);
      config.body = JSON.stringify(toSnakeCase(bodyObj));
    } catch {
      // If not JSON, leave as is
    }
  }
  
  const response = await fetch(url, config);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || error.message || `HTTP ${response.status}`);
  }
  
  const data = await response.json();
  return toCamelCase(data) as T;
}

// Auth API
export const authApi = {
  register: async (name: string, email: string, password: string) => {
    return apiRequest<{ user: User; sessionId: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
  },
  
  login: async (email: string, password: string) => {
    return apiRequest<{ user: User; sessionId: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
  
  logout: async () => {
    return apiRequest('/auth/logout', {
      method: 'POST',
    });
  },
  
  getMe: async () => {
    return apiRequest<User>('/auth/me');
  },
};

// Users API
export const usersApi = {
  getUsers: async () => {
    return apiRequest<User[]>('/users');
  },
  
  getUser: async (userId: number) => {
    return apiRequest<User>(`/users/${userId}`);
  },
  
  updateMe: async (updates: { name?: string; email?: string }) => {
    return apiRequest<User>('/users/me', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },
  
  uploadAvatar: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_BASE_URL}/users/me/avatar`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || error.message || `HTTP ${response.status}`);
    }
    
    const data = await response.json();
    return toCamelCase(data) as { avatar: string; attachment: Attachment };
  },
};

// Friends API
export const friendsApi = {
  getFriends: async () => {
    return apiRequest<User[]>('/friends');
  },
  
  addFriend: async (userId: number) => {
    return apiRequest(`/friends/${userId}`, {
      method: 'POST',
    });
  },
  
  removeFriend: async (userId: number) => {
    return apiRequest(`/friends/${userId}`, {
      method: 'DELETE',
    });
  },
};

// Groups API
export const groupsApi = {
  getGroups: async () => {
    return apiRequest<Group[]>('/groups');
  },
  
  createGroup: async (name: string, memberIds: number[]) => {
    return apiRequest<Group>('/groups', {
      method: 'POST',
      body: JSON.stringify({ name, memberIds }),
    });
  },
  
  getGroup: async (groupId: number) => {
    return apiRequest<Group>(`/groups/${groupId}`);
  },
  
  updateGroup: async (groupId: number, updates: { name?: string; memberIds?: number[] }) => {
    return apiRequest<Group>(`/groups/${groupId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },
  
  deleteGroup: async (groupId: number) => {
    return apiRequest(`/groups/${groupId}`, {
      method: 'DELETE',
    });
  },
  
  addMember: async (groupId: number, userId: number) => {
    return apiRequest(`/groups/${groupId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  },
  
  removeMember: async (groupId: number, userId: number) => {
    return apiRequest(`/groups/${groupId}/members/${userId}`, {
      method: 'DELETE',
    });
  },
  
  denyMember: async (groupId: number, userId: number) => {
    return apiRequest(`/groups/${groupId}/deny/${userId}`, {
      method: 'POST',
    });
  },
  
  unDenyMember: async (groupId: number, userId: number) => {
    return apiRequest(`/groups/${groupId}/deny/${userId}`, {
      method: 'DELETE',
    });
  },
};

// Messages API
export const messagesApi = {
  getMessages: async (
    chatType: 'personal' | 'group',
    targetId: number,
    limit: number = 50,
    offset: number = 0
  ) => {
    const params = new URLSearchParams({
      chat_type: chatType,
      target_id: targetId.toString(),
      limit: limit.toString(),
      offset: offset.toString(),
    });
    return apiRequest<Message[]>(`/messages?${params}`);
  },
  
  sendMessage: async (text: string, recipientId?: number, groupId?: number) => {
    return apiRequest<Message>('/messages', {
      method: 'POST',
      body: JSON.stringify({ text, recipientId, groupId }),
    });
  },
  
  markMessageRead: async (messageId: number) => {
    return apiRequest(`/messages/${messageId}/read`, {
      method: 'POST',
    });
  },
  
  uploadMessage: async (file: File, recipientId?: number, groupId?: number) => {
    const formData = new FormData();
    formData.append('file', file);
    if (recipientId !== undefined) formData.append('recipient_id', recipientId.toString());
    if (groupId !== undefined) formData.append('group_id', groupId.toString());
    
    const response = await fetch(`${API_BASE_URL}/messages/upload`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || error.message || `HTTP ${response.status}`);
    }
    
    const data = await response.json();
    return toCamelCase(data) as Message;
  },
};

// Types (matching API response format)
export interface User {
  id: number;
  name: string;
  email: string;
  avatar: string;
  status: 'online' | 'offline';
}

export interface Attachment {
  url: string;
  name: string;
  mimeType: string;
  size: number;
  isImage: boolean;
}

export interface Message {
  id: number;
  senderId: number;
  recipientId?: number;
  groupId?: number;
  text?: string;
  attachment?: Attachment;
  timestamp: string; // ISO string
}

export interface Group {
  id: number;
  name: string;
  creatorId: number;
  members: number[];
  deniedMembers: number[];
}
