// WebSocket service for real-time notifications

const WS_BASE_URL = process.env.REACT_APP_WS_URL || 'wss://api.rawneeded.com/raw-needed';

export interface NotificationMessage {
  id: string;
  type: string;
  titleEn: string;
  titleAr: string;
  messageEn: string;
  messageAr: string;
  read: boolean;
  createdAt: string;
  relatedEntityId?: string;
  relatedEntityType?: string;
}

type NotificationCallback = (notification: NotificationMessage) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private listeners: NotificationCallback[] = [];
  private userId: string | null = null;
  private token: string | null = null;

  connect(userId: string, token: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    this.userId = userId;
    this.token = token;

    try {
      const wsUrl = `${WS_BASE_URL}/ws/notifications?userId=${userId}&token=${token}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'NOTIFICATION') {
            this.notifyListeners(data.notification);
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.attemptReconnect();
      };
    } catch (err) {
      console.error('Failed to connect WebSocket:', err);
      this.attemptReconnect();
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.userId && this.token) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);
        this.connect(this.userId!, this.token!);
      }, this.reconnectDelay);
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.userId = null;
    this.token = null;
    this.reconnectAttempts = 0;
  }

  subscribe(callback: NotificationCallback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  private notifyListeners(notification: NotificationMessage) {
    this.listeners.forEach(callback => callback(notification));
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const websocketService = new WebSocketService();
