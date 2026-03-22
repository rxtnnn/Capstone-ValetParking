// RFID Admin Service - Fetches real data from backend API
// Uses /public/parking/dashboard for stats and /public/rfid/verify for verification

import {
  RfidTag,
  RfidReader,
  RfidTagFormData,
  RfidTagFilters,
  RfidDashboardStats,
  RfidApiResponse,
  PaginatedResponse,
} from '../types/rfid';
import apiClient from '../config/api';
import { API_ENDPOINTS } from '../constants/AppConst';

// ============================================
// Service Class
// ============================================

class RfidAdminServiceClass {
  // Local cache for tags/readers (populated from API when endpoints become available)
  private tags: RfidTag[] = [];
  private readers: RfidReader[] = [];

  // ----------------------------------------
  // Tag Management
  // ----------------------------------------

  async getAllTags(filters?: RfidTagFilters): Promise<PaginatedResponse<RfidTag>> {
    try {
      // Try to fetch from backend API
      const response = await apiClient.get(API_ENDPOINTS.publicRfidTags, { params: filters });
      const tags = response.data?.tags ?? response.data?.data ?? (Array.isArray(response.data) ? response.data : null);
      if (tags) {
        this.tags = tags;
        return {
          success: true,
          data: tags,
          pagination: {
            current_page: 1,
            per_page: 50,
            total: response.data?.count ?? tags.length,
            total_pages: 1,
          },
        };
      }
    } catch (error: any) {
      console.log('RFID tags API not available yet:', error?.message);
    }

    // Return local cache if API not available
    let filteredTags = [...this.tags];

    if (filters) {
      if (filters.status) {
        filteredTags = filteredTags.filter(tag => tag.status === filters.status);
      }
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredTags = filteredTags.filter(tag =>
          tag.uid.toLowerCase().includes(searchLower) ||
          tag.user_name?.toLowerCase().includes(searchLower) ||
          tag.vehicle_plate?.toLowerCase().includes(searchLower) ||
          tag.user_email?.toLowerCase().includes(searchLower)
        );
      }
    }

    return {
      success: true,
      data: filteredTags,
      pagination: {
        current_page: 1,
        per_page: 50,
        total: filteredTags.length,
        total_pages: 1,
      },
    };
  }

  async getTagById(id: number): Promise<RfidTag | null> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.rfidTagById(id));
      return response.data?.data || response.data || null;
    } catch (error: any) {
      console.log('RFID tag detail API not available:', error?.message);
      return this.tags.find(tag => tag.id === id) || null;
    }
  }

  async getTagByUid(uid: string): Promise<RfidTag | null> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.rfidTagByUid(uid.toUpperCase()));
      return response.data?.data || response.data || null;
    } catch (error: any) {
      console.log('RFID tag UID lookup API not available:', error?.message);
      return this.tags.find(tag => tag.uid.toUpperCase() === uid.toUpperCase()) || null;
    }
  }

  async createTag(data: RfidTagFormData): Promise<RfidApiResponse<RfidTag>> {
    try {
      const response = await apiClient.post(API_ENDPOINTS.rfidTags, {
        ...data,
        uid: data.uid.toUpperCase(),
      });
      return {
        success: true,
        message: response.data?.message || 'RFID tag created successfully',
        data: response.data?.data || response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error?.response?.data?.message || 'Failed to create tag. API not available.',
        errors: error?.response?.data?.errors,
      };
    }
  }

  async updateTag(id: number, data: Partial<RfidTagFormData>): Promise<RfidApiResponse<RfidTag>> {
    try {
      const response = await apiClient.put(API_ENDPOINTS.rfidTagById(id), {
        ...data,
        uid: data.uid ? data.uid.toUpperCase() : undefined,
      });
      return {
        success: true,
        message: response.data?.message || 'RFID tag updated successfully',
        data: response.data?.data || response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error?.response?.data?.message || 'Failed to update tag. API not available.',
        errors: error?.response?.data?.errors,
      };
    }
  }

  async deactivateTag(id: number): Promise<RfidApiResponse<void>> {
    try {
      const response = await apiClient.patch(API_ENDPOINTS.rfidTagDeactivate(id));
      return {
        success: true,
        message: response.data?.message || 'RFID tag deactivated successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error?.response?.data?.message || 'Failed to deactivate tag. API not available.',
      };
    }
  }

  async deleteTag(id: number): Promise<RfidApiResponse<void>> {
    try {
      const response = await apiClient.delete(API_ENDPOINTS.rfidTagById(id));
      return {
        success: true,
        message: response.data?.message || 'RFID tag deleted successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error?.response?.data?.message || 'Failed to delete tag. API not available.',
      };
    }
  }

  // ----------------------------------------
  // Reader Management
  // ----------------------------------------

  async getReaders(): Promise<RfidReader[]> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.rfidReaders);
      if (response.data?.data) {
        this.readers = response.data.data;
        return response.data.data;
      }
    } catch (error: any) {
      console.log('RFID readers API not available:', error?.message);
    }

    return [...this.readers];
  }

  async getReaderById(id: string | number): Promise<RfidReader | null> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.rfidReaderById(Number(id)));
      return response.data?.data || response.data || null;
    } catch (error: any) {
      console.log('RFID reader detail API not available:', error?.message);
      return this.readers.find(r => r.id === id) || null;
    }
  }

  async restartReader(readerId: string | number): Promise<RfidApiResponse<void>> {
    try {
      const response = await apiClient.post(API_ENDPOINTS.rfidReaderRestart(Number(readerId)));
      return {
        success: true,
        message: response.data?.message || 'Reader restart initiated successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error?.response?.data?.message || 'Failed to restart reader. API not available.',
      };
    }
  }

  // ----------------------------------------
  // Statistics - Uses real parking dashboard API
  // ----------------------------------------

  async getDashboardStats(): Promise<RfidDashboardStats> {
    try {
      const [tagsRes, scansRes] = await Promise.all([
        apiClient.get(API_ENDPOINTS.publicRfidTags),
        apiClient.get(API_ENDPOINTS.publicRfidScans, { params: { minutes: 1440 } }),
      ]);

      const tags: any[] = tagsRes.data?.tags ?? tagsRes.data?.data ?? (Array.isArray(tagsRes.data) ? tagsRes.data : []);
      const scans: any[] = scansRes.data?.scans ?? (Array.isArray(scansRes.data) ? scansRes.data : []);

      const today = new Date().toDateString();
      const todayScans = scans.filter(s => new Date(s.timestamp).toDateString() === today);

      const total_tags = tags.length;
      const active_tags = tags.filter(t => t.status === 'active' || t.status === 'valid').length;
      const expired_tags = tags.filter(t => t.status === 'expired').length;
      const suspended_tags = tags.filter(t => t.status === 'suspended').length;
      const lost_tags = tags.filter(t => t.status === 'lost').length;

      const today_entries = todayScans.filter(s => s.scan_type === 'entry' && s.status === 'valid').length;
      const today_exits = todayScans.filter(s => s.scan_type === 'exit').length;
      const today_invalid_scans = todayScans.filter(s => s.status !== 'valid').length;
      const current_parked = today_entries - today_exits > 0 ? today_entries - today_exits : 0;

      return {
        total_tags,
        active_tags,
        expired_tags,
        suspended_tags,
        lost_tags,
        expiring_soon: 0,
        readers_online: 0,
        readers_offline: 0,
        readers_error: 0,
        today_entries,
        today_exits,
        today_invalid_scans,
        current_parked,
      };
    } catch (error) {
      console.log('Error fetching dashboard stats:', error);
      return {
        total_tags: 0,
        active_tags: 0,
        expired_tags: 0,
        suspended_tags: 0,
        lost_tags: 0,
        expiring_soon: 0,
        readers_online: 0,
        readers_offline: 0,
        readers_error: 0,
        today_entries: 0,
        today_exits: 0,
        today_invalid_scans: 0,
        current_parked: 0,
      };
    }
  }
}

// Export singleton instance
export const RfidAdminService = new RfidAdminServiceClass();
