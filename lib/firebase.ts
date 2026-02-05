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

          toast(`${notificationTitle}: ${notificationBody}`, {
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
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');

    console.log('🚀 [FCM] Initializing native push notifications...');

    try {
      // 1. Check/Request Permissions
      let permStatus = await PushNotifications.checkPermissions();
      if (permStatus.receive === 'prompt' || permStatus.receive === 'prompt-with-rationale') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        console.warn('🚫 [FCM] Push permission not granted:', permStatus.receive);
        return;
      }

      // 2. Local Notification Permissions
      let localPermStatus = await LocalNotifications.checkPermissions();
      if (localPermStatus.display === 'prompt') {
        localPermStatus = await LocalNotifications.requestPermissions();
      }

      // 3. Create High Priority Channel for Android
      if (Capacitor.getPlatform() === 'android') {
        await LocalNotifications.createChannel({
          id: '1xstore_foreground',
          name: '1XSTORE Notifications',
          description: 'Notifications de l\'application 1XSTORE en premier plan',
          importance: 5, // High
          visibility: 1, // Public
          sound: 'default',
          vibration: true,
          lights: true
        });
        console.log('✅ [FCM] High priority channel created');
      }

      // 4. Set up Listeners BEFORE registration
      PushNotifications.addListener('registration', async (token) => {
        console.log('🔔 [FCM] Registration success! Token:', token.value);
        this.token = token.value;
        localStorage.setItem('fcm_token', token.value);
        await this.sendTokenToServer(token.value);
      });

      PushNotifications.addListener('registrationError', (error) => {
        console.error('❌ [FCM] Registration error:', error);
      });

      PushNotifications.addListener('pushNotificationReceived', async (notification) => {
        console.log('📨 [FCM] Foreground push received:', notification);

        // Schedule local notification for head-up display
        try {
          await LocalNotifications.schedule({
            notifications: [{
              title: notification.title || 'Notification',
              body: notification.body || '',
              id: Math.floor(Math.random() * 2147483647),
              schedule: { at: new Date(Date.now() + 100) },
              sound: 'default',
              extra: notification.data,
              channelId: '1xstore_foreground',
              smallIcon: 'ic_notification', // Ensure this exists in Android resources
            }]
          });
        } catch (error) {
          console.error('❌ [FCM] Error scheduling local notification:', error);
        }
      });

      PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        console.log('👆 [FCM] Action performed:', action);
      });

      // 5. Register for push notifications
      await PushNotifications.register();

      // 6. Fallback: Get token via Firebase Messaging plugin if registration listener didn't fire yet or for extra reliability
      try {
        const result = await FirebaseMessaging.getToken();
        if (result.token && result.token !== this.token) {
          this.token = result.token;
          localStorage.setItem('fcm_token', result.token);
          await this.sendTokenToServer(result.token);
        }
      } catch (error) {
        console.error('❌ [FCM] Firebase Messaging token error:', error);
      }

    } catch (error) {
      console.error('❌ [FCM] Initialization error:', error);
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

      await api.post('/mobcash/devices/', {
        registration_id: token,
        type: this.platform === 'ios' ? 'ios' : 'android',
        user_id: userId,
      });

      console.log('✅ [FCM] Token registered on server');
    } catch (error) {
      console.error('❌ [FCM] Error sending token to server:', error);
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
