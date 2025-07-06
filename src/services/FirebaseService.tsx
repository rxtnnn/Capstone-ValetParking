// src/services/FirebaseService.ts
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  limit, 
  where, 
  serverTimestamp,
  onSnapshot,
  startAfter,
  QueryDocumentSnapshot,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface FeedbackData {
  id?: string;
  type: 'general' | 'bug' | 'feature' | 'parking';
  message: string;
  rating?: number;
  email?: string;
  issues?: string[];
  timestamp: any; // Firestore timestamp
  status: 'pending' | 'reviewed' | 'resolved';
  userId?: string;
  deviceInfo?: {
    platform: string;
    version: string;
    model: string;
    systemVersion?: string;
    appVersion?: string;
    buildNumber?: string;
  };
  createdAt?: string;
  updatedAt?: any;
  adminResponse?: string;
  adminId?: string;
  respondedAt?: any;
}

export interface FeedbackStats {
  totalFeedback: number;
  pendingFeedback: number;
  avgRating: number;
  feedbackByType: {
    general: number;
    bug: number;
    feature: number;
    parking: number;
  };
  feedbackByStatus: {
    pending: number;
    reviewed: number;
    resolved: number;
  };
  recentFeedback: FeedbackData[];
}

class FirebaseService {
  private feedbackCollection = collection(db, 'feedback');

  // Submit feedback from mobile app
  async submitFeedback(feedbackData: Omit<FeedbackData, 'id' | 'status' | 'timestamp'>): Promise<string> {
    try {
      // Clean the data to remove undefined values
      const cleanedData = this.cleanDataForFirestore({
        ...feedbackData,
        status: 'pending',
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString(),
      });

      console.log('Submitting cleaned data:', cleanedData);
      
      const docRef = await addDoc(this.feedbackCollection, cleanedData);
      
      console.log('Feedback submitted with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error submitting feedback:', error);
      throw new Error('Failed to submit feedback. Please try again.');
    }
  }

  // Helper method to clean data for Firestore (remove undefined values)
  private cleanDataForFirestore(data: any): any {
    const cleaned: any = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && value !== null) {
        if (typeof value === 'object' && !Array.isArray(value) && value.constructor === Object) {
          // Recursively clean nested objects
          const cleanedNested = this.cleanDataForFirestore(value);
          if (Object.keys(cleanedNested).length > 0) {
            cleaned[key] = cleanedNested;
          }
        } else if (Array.isArray(value) && value.length > 0) {
          // Include non-empty arrays
          cleaned[key] = value;
        } else if (!Array.isArray(value)) {
          // Include non-array, non-undefined values
          cleaned[key] = value;
        }
      }
    }
    
    return cleaned;
  }

  // Get all feedback with pagination
  async getAllFeedback(limitCount: number = 50, lastDoc?: QueryDocumentSnapshot): Promise<{feedback: FeedbackData[], lastDoc: QueryDocumentSnapshot | null}> {
    try {
      let q = query(
        this.feedbackCollection,
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      if (lastDoc) {
        q = query(
          this.feedbackCollection,
          orderBy('timestamp', 'desc'),
          startAfter(lastDoc),
          limit(limitCount)
        );
      }

      const querySnapshot = await getDocs(q);

      const feedback = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: this.convertTimestamp(doc.data().timestamp)
      })) as FeedbackData[];

      const lastDocument = querySnapshot.docs[querySnapshot.docs.length - 1] || null;

      return { feedback, lastDoc: lastDocument };
    } catch (error) {
      console.error('Error getting feedback:', error);
      throw new Error('Failed to get feedback data');
    }
  }

  // Get feedback by type
  async getFeedbackByType(type: FeedbackData['type'], limitCount: number = 50): Promise<FeedbackData[]> {
    try {
      const q = query(
        this.feedbackCollection,
        where('type', '==', type),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: this.convertTimestamp(doc.data().timestamp)
      })) as FeedbackData[];
    } catch (error) {
      console.error('Error getting feedback by type:', error);
      throw new Error(`Failed to get ${type} feedback`);
    }
  }

  // Get feedback by status
  async getFeedbackByStatus(status: FeedbackData['status'], limitCount: number = 50): Promise<FeedbackData[]> {
    try {
      const q = query(
        this.feedbackCollection,
        where('status', '==', status),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: this.convertTimestamp(doc.data().timestamp)
      })) as FeedbackData[];
    } catch (error) {
      console.error('Error getting feedback by status:', error);
      throw new Error(`Failed to get ${status} feedback`);
    }
  }

  // Update feedback status
  async updateFeedbackStatus(feedbackId: string, status: FeedbackData['status']): Promise<void> {
    try {
      const feedbackDoc = doc(db, 'feedback', feedbackId);
      await updateDoc(feedbackDoc, {
        status,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating feedback status:', error);
      throw new Error('Failed to update feedback status');
    }
  }

  // Get single feedback by ID
  async getFeedbackById(feedbackId: string): Promise<FeedbackData | null> {
    try {
      const feedbackDoc = doc(db, 'feedback', feedbackId);
      const docSnap = await getDocs(query(collection(db, 'feedback'), where('__name__', '==', feedbackId)));
      
      if (docSnap.empty) {
        return null;
      }

      const docData = docSnap.docs[0];
      return {
        id: docData.id,
        ...docData.data(),
        timestamp: this.convertTimestamp(docData.data().timestamp)
      } as FeedbackData;
    } catch (error) {
      console.error('Error getting feedback by ID:', error);
      throw new Error('Failed to get feedback details');
    }
  }

  // Get feedback statistics
  async getFeedbackStats(): Promise<FeedbackStats> {
    try {
      const querySnapshot = await getDocs(this.feedbackCollection);
      const allFeedback = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: this.convertTimestamp(doc.data().timestamp)
      })) as FeedbackData[];

      const stats: FeedbackStats = {
        totalFeedback: allFeedback.length,
        pendingFeedback: allFeedback.filter(f => f.status === 'pending').length,
        avgRating: 0,
        feedbackByType: {
          general: 0,
          bug: 0,
          feature: 0,
          parking: 0,
        },
        feedbackByStatus: {
          pending: 0,
          reviewed: 0,
          resolved: 0,
        },
        recentFeedback: allFeedback.slice(0, 5)
      };

      // Calculate average rating
      const ratingsOnly = allFeedback.filter(f => f.rating && f.rating > 0);
      if (ratingsOnly.length > 0) {
        stats.avgRating = ratingsOnly.reduce((sum, f) => sum + (f.rating || 0), 0) / ratingsOnly.length;
      }

      // Count feedback by type and status
      allFeedback.forEach(feedback => {
        if (feedback.type in stats.feedbackByType) {
          stats.feedbackByType[feedback.type]++;
        }
        if (feedback.status in stats.feedbackByStatus) {
          stats.feedbackByStatus[feedback.status]++;
        }
      });

      return stats;
    } catch (error) {
      console.error('Error getting feedback stats:', error);
      throw new Error('Failed to get feedback statistics');
    }
  }

  // Listen to real-time feedback updates
  listenToFeedbackUpdates(callback: (feedback: FeedbackData[]) => void, errorCallback?: (error: Error) => void) {
    const q = query(
      this.feedbackCollection,
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    return onSnapshot(
      q,
      (querySnapshot) => {
        const feedback = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: this.convertTimestamp(doc.data().timestamp)
        })) as FeedbackData[];
        callback(feedback);
      },
      (error) => {
        console.error('Error listening to feedback updates:', error);
        if (errorCallback) {
          errorCallback(new Error('Failed to listen to feedback updates'));
        }
      }
    );
  }

  // Delete feedback
  async deleteFeedback(feedbackId: string): Promise<void> {
    try {
      const feedbackDoc = doc(db, 'feedback', feedbackId);
      await deleteDoc(feedbackDoc);
    } catch (error) {
      console.error('Error deleting feedback:', error);
      throw new Error('Failed to delete feedback');
    }
  }

  // Search feedback
  async searchFeedback(searchTerm: string, limitCount: number = 50): Promise<FeedbackData[]> {
    try {
      // Note: Firestore doesn't support full-text search natively
      const querySnapshot = await getDocs(
        query(this.feedbackCollection, orderBy('timestamp', 'desc'), limit(limitCount * 2))
      );

      const allFeedback = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: this.convertTimestamp(doc.data().timestamp)
      })) as FeedbackData[];

      return allFeedback.filter(feedback =>
        feedback.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        feedback.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        feedback.type.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, limitCount);
    } catch (error) {
      console.error('Error searching feedback:', error);
      throw new Error('Failed to search feedback');
    }
  }

  // Add admin response
  async addAdminResponse(feedbackId: string, response: string, adminId: string): Promise<void> {
    try {
      const feedbackDoc = doc(db, 'feedback', feedbackId);
      await updateDoc(feedbackDoc, {
        adminResponse: response,
        adminId,
        respondedAt: serverTimestamp(),
        status: 'reviewed',
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error adding admin response:', error);
      throw new Error('Failed to add admin response');
    }
  }

  // Helper function to convert Firestore timestamps
  private convertTimestamp(timestamp: any): string {
    if (!timestamp) return new Date().toISOString();
    
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate().toISOString();
    }
    
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toISOString();
    }
    
    return new Date().toISOString();
  }

  // Test connection
  async testConnection(): Promise<boolean> {
    try {
      const testDoc = await addDoc(collection(db, 'test'), {
        test: true,
        timestamp: serverTimestamp(),
      });
      
      // Clean up test document
      await deleteDoc(doc(db, 'test', testDoc.id));
      
      console.log('Firebase connection successful!');
      return true;
    } catch (error) {
      console.error('Firebase connection failed:', error);
      return false;
    }
  }
}

export default new FirebaseService();