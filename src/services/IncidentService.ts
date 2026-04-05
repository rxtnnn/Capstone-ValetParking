import apiClient from '../config/api';
import { API_ENDPOINTS } from '../constants/AppConst';
import {
  Incident,
  IncidentFormData,
  IncidentFilters,
  IncidentListResponse,
} from '../types/incident';

export const IncidentService = {
  async create(
    data: IncidentFormData,
  ): Promise<{ success: boolean; data?: Incident; message?: string }> {
    try {
      const response = await apiClient.post(API_ENDPOINTS.incidents, data);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          'Failed to file incident report.',
      };
    }
  },

  async list(filters?: IncidentFilters): Promise<IncidentListResponse> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.incidents, {
        params: filters,
      });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        data: [],
        meta: { total: 0, per_page: 20, current_page: 1, last_page: 1 },
      };
    }
  },

  async getById(
    id: number,
  ): Promise<{ success: boolean; data?: Incident; message?: string }> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.incidentById(id));
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          'Failed to fetch incident.',
      };
    }
  },

  async update(
    id: number,
    data: { status?: string; action_taken?: string },
  ): Promise<{ success: boolean; data?: Incident; message?: string }> {
    try {
      const response = await apiClient.put(
        API_ENDPOINTS.incidentById(id),
        data,
      );
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          'Failed to update incident.',
      };
    }
  },
};
