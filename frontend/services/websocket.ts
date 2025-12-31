// WebSocket Client for Chat Room

const WS_BASE_URL = 'ws://localhost:8000/ws/chat';

export interface WebSocketMessage {
  type: 'message' | 'connected' | 'error' | 'user_status_update' | 'friend_change' | 'group_change' | 'message_read' | 'user_login' | 'user_logout' | 'system_message' | 'message_notification';
  id?: number;
  senderId?: number;
  recipientId?: number;
  groupId?: number;
  text?: string;
  attachment?: {
    url: string;
    name: string;
    mimeType: string;
    size: number;
    isImage: boolean;
  };
  timestamp?: string;
  message?: string;
  userId?: number;
  // User status update
  status?: 'online' | 'offline';
  userName?: string;
  // Friend change
  action?: string; // 'added' | 'removed' | 'created' | 'updated' | 'deleted' | 'member_added' | 'member_removed'
  friendId?: number;
  // Group change
  data?: any;
  groupName?: string;
  userInfo?: { id: number; name: string };
  // Message read
  messageId?: number;
  // Message notification
  senderName?: string;
  groupName?: string;
}

export type MessageHandler = (message: WebSocketMessage) => void;
export type ErrorHandler = (error: Event) => void;
export type ConnectHandler = () => void;
export type DisconnectHandler = () => void;

export class ChatWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private messageHandlers: MessageHandler[] = [];
  private errorHandlers: ErrorHandler[] = [];
  private connectHandlers: ConnectHandler[] = [];
  private disconnectHandlers: DisconnectHandler[] = [];
  private isManualClose = false;

  connect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    this.isManualClose = false;
    this.ws = new WebSocket(WS_BASE_URL);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.connectHandlers.forEach(handler => handler());
      
      // Start heartbeat to keep connection alive
      this.startHeartbeat();
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        this.messageHandlers.forEach(handler => handler(message));
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.errorHandlers.forEach(handler => handler(error));
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.stopHeartbeat();
      this.disconnectHandlers.forEach(handler => handler());
      
      // Attempt to reconnect if not manually closed
      if (!this.isManualClose && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        console.log(`Reconnecting in ${delay}ms... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        setTimeout(() => this.connect(), delay);
      }
    };
  }

  disconnect(): void {
    this.stopHeartbeat();
    this.isManualClose = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }


  sendMessage(
    text?: string,
    attachment?: {
      url: string;
      name: string;
      mimeType: string;
      size: number;
      isImage: boolean;
    },
    recipientId?: number,
    groupId?: number
  ): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    const message = {
      type: 'message',
      text,
      attachment,
      recipient_id: recipientId,
      group_id: groupId,
    };

    this.ws.send(JSON.stringify(message));
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.push(handler);
    return () => {
      const index = this.messageHandlers.indexOf(handler);
      if (index > -1) {
        this.messageHandlers.splice(index, 1);
      }
    };
  }

  onError(handler: ErrorHandler): () => void {
    this.errorHandlers.push(handler);
    return () => {
      const index = this.errorHandlers.indexOf(handler);
      if (index > -1) {
        this.errorHandlers.splice(index, 1);
      }
    };
  }

  onConnect(handler: ConnectHandler): () => void {
    this.connectHandlers.push(handler);
    return () => {
      const index = this.connectHandlers.indexOf(handler);
      if (index > -1) {
        this.connectHandlers.splice(index, 1);
      }
    };
  }

  onDisconnect(handler: DisconnectHandler): () => void {
    this.disconnectHandlers.push(handler);
    return () => {
      const index = this.disconnectHandlers.indexOf(handler);
      if (index > -1) {
        this.disconnectHandlers.splice(index, 1);
      }
    };
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  private startHeartbeat(): void {
    // Clear existing interval
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    // Send ping every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ type: 'ping' }));
        } catch (error) {
          console.error('Failed to send heartbeat:', error);
        }
      }
    }, 30000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}

// Singleton instance
let wsInstance: ChatWebSocket | null = null;

export function getWebSocket(): ChatWebSocket {
  if (!wsInstance) {
    wsInstance = new ChatWebSocket();
  }
  return wsInstance;
}
