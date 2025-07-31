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
    if (!feedback.admin_response || !feedback.responded_at) {
      return false;
    }

    try {
      await NotificationManager.addFeedbackReplyNotification(
        feedback.id,
        feedback.message,
        feedback.admin_response,
        'Admin Team'
      );
      
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

    return notificationsCreated;
  }


  /**
   * Simple method to add a feedback reply notification manually
   */
  static async addFeedbackReply(
    feedbackId: number | undefined,
    originalMessage: string,
    adminReply: string,
    adminName?: string
  ): Promise<void> {
    await NotificationManager.addFeedbackReplyNotification(
      feedbackId,
      originalMessage,
      adminReply,
      adminName || 'Admin'
    );
  }

  /**
   * Check if a feedback item should trigger a notification
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

}

export const processFeedbackForNotifications = FeedbackNotificationHelper.processFeedbackArray;
export const checkSingleFeedbackForNotification = FeedbackNotificationHelper.checkSingleFeedback;

