// src/utils/feedbackNotificationHelper.ts
import { NotificationManager } from '../services/NotifManager';
import { FeedbackData } from '../types/feedback';

/**
 * Helper class to integrate feedback replies with notification system
 */
export class FeedbackNotificationHelper {
  
  /**
   * Check a single feedback item and create notification if it has a new admin reply
   */
  static async checkSingleFeedback(feedback: FeedbackData): Promise<boolean> {
    // Check if feedback has admin response
    if (!feedback.admin_response || !feedback.responded_at) {
      return false;
    }

    // Create notification for this feedback reply
    try {
      await NotificationManager.addFeedbackReplyNotification(
        feedback.id, // ✅ FIXED: Can handle undefined now
        feedback.message,
        feedback.admin_response,
        'Admin Team' // You can pass real admin name if available
      );
      
      console.log(`📱 Created feedback notification for feedback ID: ${feedback.id || 'unknown'}`);
      return true;
    } catch (error) {
      console.error('Error creating feedback notification:', error);
      return false;
    }
  }

  /**
   * Process an array of feedback and create notifications for items with replies
   */
  static async processFeedbackArray(feedbackArray: FeedbackData[]): Promise<number> {
    let notificationsCreated = 0;

    for (const feedback of feedbackArray) {
      const success = await this.checkSingleFeedback(feedback);
      if (success) {
        notificationsCreated++;
      }
    }

    console.log(`📱 Created ${notificationsCreated} feedback notifications`);
    return notificationsCreated;
  }

  /**
   * Create a test feedback notification for development
   */
  static async createTestNotification(): Promise<void> {
    await NotificationManager.addFeedbackReplyNotification(
      999, // ✅ FIXED: Explicit number instead of undefined
      'Test feedback: The parking sensors are not working properly on Floor 4',
      'Thank you for your feedback! Our technical team has investigated and fixed the sensor issues on Floor 4. The sensors should now be working correctly.',
      'Admin Team'
    );
    console.log('🧪 Test feedback notification created');
  }

  /**
   * Simple method to add a feedback reply notification manually
   */
  static async addFeedbackReply(
    feedbackId: number | undefined, // ✅ FIXED: Accept undefined
    originalMessage: string,
    adminReply: string,
    adminName?: string
  ): Promise<void> {
    await NotificationManager.addFeedbackReplyNotification(
      feedbackId, // ✅ FIXED: Pass as-is, handler deals with undefined
      originalMessage,
      adminReply,
      adminName || 'Admin'
    );
  }

  /**
   * Check if a feedback item should trigger a notification
   * (has admin_response and responded_at fields)
   */
  static shouldNotify(feedback: FeedbackData): boolean {
    return !!(feedback.admin_response && 
              feedback.admin_response.trim().length > 0 && 
              feedback.responded_at);
  }

  /**
   * Get notification-worthy feedback items from an array
   */
  static getNotifiableFeedback(feedbackArray: FeedbackData[]): FeedbackData[] {
    return feedbackArray.filter(feedback => this.shouldNotify(feedback));
  }

  /**
   * ✅ NEW: Quick test method that creates multiple notifications
   */
  static async createMultipleTestNotifications(): Promise<void> {
    // Create multiple test notifications
    const testData = [
      {
        id: 1,
        message: 'The parking app keeps crashing when I try to search for spots',
        reply: 'We apologize for the inconvenience. Our development team has released a fix for this crash issue in version 2.1.4. Please update your app.',
        admin: 'Technical Support'
      },
      {
        id: 2,
        message: 'Sensors on Floor 3 show occupied spots as available',
        reply: 'Thank you for reporting this sensor issue. Our maintenance team has recalibrated all sensors on Floor 3. They should now display accurate status.',
        admin: 'Maintenance Team'
      },
      {
        id: 3,
        message: 'Would love to see a dark mode option in the app',
        reply: 'Great suggestion! Dark mode is being developed and will be available in our next major update. Thank you for your feedback!',
        admin: 'Product Team'
      }
    ];

    for (const test of testData) {
      await NotificationManager.addFeedbackReplyNotification(
        test.id,
        test.message,
        test.reply,
        test.admin
      );
    }

    console.log(`🧪 Created ${testData.length} test feedback notifications`);
  }
}

// ✅ SIMPLE EXPORT: Easy functions to use directly
export const createTestFeedbackNotification = FeedbackNotificationHelper.createTestNotification;
export const processFeedbackForNotifications = FeedbackNotificationHelper.processFeedbackArray;
export const checkSingleFeedbackForNotification = FeedbackNotificationHelper.checkSingleFeedback;

// Example usage:
/*
// In your component or service:

import { FeedbackNotificationHelper } from '../utils/feedbackNotificationHelper';

// Method 1: Process all feedback
const feedback = await fetchFeedback();
await FeedbackNotificationHelper.processFeedbackArray(feedback);

// Method 2: Check single feedback item
await FeedbackNotificationHelper.checkSingleFeedback(singleFeedbackItem);

// Method 3: Manual notification
await FeedbackNotificationHelper.addFeedbackReply(
  123,
  "Original feedback message",
  "Admin reply message",
  "Admin Name"
);

// Method 4: Test notification
await FeedbackNotificationHelper.createTestNotification();
*/