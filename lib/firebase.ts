import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
//import { isPlatform } from '@ionic/core';
import { Capacitor } from '@capacitor/core';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize messaging only for web
let messaging: Messaging | null = null;
if (typeof window !== 'undefined' && Capacitor.getPlatform() === 'web') {
  messaging = getMessaging(app);
}

export { messaging };

// VAPID key for web push notifications
const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

// Unified notification service for Web and Mobile
export class UnifiedFCMService {
  private static instance: UnifiedFCMService;
  private token: string | null = null;
  private isInitialized = false;
  private platform: 'web' | 'ios' | 'android' = 'web';

  private constructor() {
    if (typeof window !== 'undefined') {
      this.platform = Capacitor.getPlatform() as 'web' | 'ios' | 'android';
    }
  }

  public static getInstance(): UnifiedFCMService {
    if (!UnifiedFCMService.instance) {
      UnifiedFCMService.instance = new UnifiedFCMService();
    }
    return UnifiedFCMService.instance;
  }

  /**
   * Initialize FCM service (works for both web and mobile)
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      if (this.platform === 'web') {
        await this.initializeWeb();
      } else {
        await this.initializeMobile();
      }
      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing FCM:', error);
    }
  }

  /**
   * Initialize web notifications
   */
  private async initializeWeb(): Promise<void> {
    if (typeof window === 'undefined' || !messaging) return;

    // Request notification permission
    const permission = await this.requestNotificationPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }

    // Get FCM token
    this.token = await getToken(messaging, { vapidKey });

    if (this.token) {
      console.log('FCM Token (Web):', this.token);
      localStorage.setItem('fcm_token', this.token);
      await this.sendTokenToServer(this.token);
    }

    // Setup foreground message listener
    onMessage(messaging, async (payload) => {
      console.log('Foreground message received (Web):', payload);

      // Show in-app notification
      if (typeof window !== 'undefined') {
        try {
          const toast = (await import('react-hot-toast')).default;
          const notificationTitle = payload.notification?.title || 'Notification';
          const notificationBody = payload.notification?.body || '';

          toast(notificationTitle, {
            description: notificationBody,
            duration: 5000,
            style: {
              background: '#333',
              color: '#fff',
            },
          });
        } catch (error) {
          console.error('Error showing in-app notification:', error);
        }
      }
    });
  }

  /**
   * Initialize mobile notifications
   */
  private async initializeMobile(): Promise<void> {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');

    // Request permission
    const permissionStatus = await PushNotifications.requestPermissions();
    
    if (permissionStatus.receive === 'granted') {
      // Register for push notifications
      await PushNotifications.register();

      // Get FCM token
      const result = await FirebaseMessaging.getToken();
      this.token = result.token;

      if (this.token) {
        console.log('FCM Token (Mobile):', this.token);
        localStorage.setItem('fcm_token', this.token);
        await this.sendTokenToServer(this.token);
      }

      // Listen for notification received
      PushNotifications.addListener('pushNotificationReceived', async (notification) => {
        console.log('Push notification received (Mobile):', notification);

        // Show in-app notification
        if (typeof window !== 'undefined') {
          try {
            const toast = (await import('react-hot-toast')).default;
            toast(notification.title || 'Notification', {
              description: notification.body || '',
              duration: 5000,
              style: {
                background: '#333',
                color: '#fff',
              },
            });
          } catch (error) {
            console.error('Error showing in-app notification:', error);
          }
        }
      });

      // Listen for notification action performed
      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('Push notification action performed:', notification);
      });
    }
  }

  /**
   * Request notification permission
   */
  public async requestNotificationPermission(): Promise<string> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      return 'denied';
    }

    const permission = await Notification.requestPermission();
    return permission;
  }

  /**
   * Get current FCM token
   */
  public getToken(): string | null {
    return this.token || localStorage.getItem('fcm_token');
  }

  /**
   * Send token to your backend server
   */
  private async sendTokenToServer(token: string): Promise<void> {
    try {
      // Import api here to avoid circular dependencies
      const api = (await import('@/lib/api')).default;

      // Get user data from localStorage
      const userStr = localStorage.getItem('user');
      let userId = null;
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          userId = user.id;
        } catch (error) {
          console.error('Error parsing user data:', error);
        }
      }

      if (!userId) {
        console.warn('No user ID available, skipping FCM token registration');
        return;
      }

      const response = await api.post('/mobcash/devices/', {
        registration_id: token,
        type: this.platform === 'ios' ? 'ios' : 'android', // Use 'ios' for iOS, 'android' for others
        user_id: userId,
      });

      console.log('FCM token sent to server successfully');
    } catch (error) {
      console.error('Error sending token to server:', error);
    }
  }

  /**
   * Get platform
   */
  public getPlatform(): string {
    return this.platform;
  }
}

// Export singleton instance
export const unifiedFcmService = UnifiedFCMService.getInstance();

export default app;