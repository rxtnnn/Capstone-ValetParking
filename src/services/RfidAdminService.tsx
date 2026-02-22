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
      const response = await apiClient.get('/rfid/tags', { params: filters });
      if (response.data?.data) {
        this.tags = response.data.data;
        return {
          success: true,
          data: response.data.data,
          pagination: response.data.pagination || {
            current_page: 1,
            per_page: 50,
            total: response.data.data.length,
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
      const response = await apiClient.get(`/rfid/tags/${id}`);
      return response.data?.data || response.data || null;
    } catch (error: any) {
      console.log('RFID tag detail API not available:', error?.message);
      return this.tags.find(tag => tag.id === id) || null;
    }
  }

  async getTagByUid(uid: string): Promise<RfidTag | null> {
    try {
      const response = await apiClient.get(`/rfid/tags/uid/${uid.toUpperCase()}`);
      return response.data?.data || response.data || null;
    } catch (error: any) {
      console.log('RFID tag UID lookup API not available:', error?.message);
      return this.tags.find(tag => tag.uid.toUpperCase() === uid.toUpperCase()) || null;
    }
  }

  async createTag(data: RfidTagFormData): Promise<RfidApiResponse<RfidTag>> {
    try {
      const response = await apiClient.post('/rfid/tags', {
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
      const response = await apiClient.put(`/rfid/tags/${id}`, {
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
      const response = await apiClient.patch(`/rfid/tags/${id}/deactivate`);
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
      const response = await apiClient.delete(`/rfid/tags/${id}`);
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
      const response = await apiClient.get('/rfid/readers');
      if (response.data?.data) {
        this.readers = response.data.data;
        return response.data.data;
      }
    } catch (error: any) {
      console.log('RFID readers API not available:', error?.message);
    }

    return [...this.readers];
  }

  async getReaderById(id: string): Promise<RfidReader | null> {
    try {
      const response = await apiClient.get(`/rfid/readers/${id}`);
      return response.data?.data || response.data || null;
    } catch (error: any) {
      console.log('RFID reader detail API not available:', error?.message);
      return this.readers.find(r => r.id === id) || null;
    }
  }

  async restartReader(readerId: string): Promise<RfidApiResponse<void>> {
    try {
      const response = await apiClient.post(`/rfid/readers/${readerId}/restart`);
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
      const response = await apiClient.get('/public/parking/dashboard');
      const data = response.data;

      // Map backend parking dashboard to RFID dashboard stats
      return {
        total_tags: data?.total_tags ?? 0,
        active_tags: data?.active_tags ?? 0,
        expired_tags: data?.expired_tags ?? 0,
        suspended_tags: data?.suspended_tags ?? 0,
        lost_tags: data?.lost_tags ?? 0,
        expiring_soon: data?.expiring_soon ?? 0,
        readers_online: data?.readers_online ?? 0,
        readers_offline: data?.readers_offline ?? 0,
        readers_error: data?.readers_error ?? 0,
        today_entries: data?.today_entries ?? data?.entries_today ?? 0,
        today_exits: data?.today_exits ?? data?.exits_today ?? 0,
        today_invalid_scans: data?.today_invalid_scans ?? data?.invalid_scans_today ?? 0,
        current_parked: data?.current_parked ?? data?.currently_parked ?? 0,
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
