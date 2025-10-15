import { NotificationManager } from '../services/NotifManager';
import { FeedbackData } from '../types/feedback';


export class FeedbackNotificationHelper {
  
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
      console.log('Error creating feedback notification:', error);
      return false;
    }
  }

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

  static shouldNotify(feedback: FeedbackData): boolean {
    return !!(feedback.admin_response && 
              feedback.admin_response.trim().length > 0 && 
              feedback.responded_at);
  }

  static getNotifiableFeedback(feedbackArray: FeedbackData[]): FeedbackData[] {
    return feedbackArray.filter(feedback => this.shouldNotify(feedback));
  }

}

export const processFeedbackForNotifications = FeedbackNotificationHelper.processFeedbackArray;
export const checkSingleFeedbackForNotification = FeedbackNotificationHelper.checkSingleFeedback;

