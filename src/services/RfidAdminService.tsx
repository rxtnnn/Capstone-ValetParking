// RFID Admin Service - Handles tag management, reader status, and statistics
// Uses mock data until backend endpoints are available

import {
  RfidTag,
  RfidReader,
  RfidTagFormData,
  RfidTagFilters,
  RfidDashboardStats,
  RfidApiResponse,
  PaginatedResponse,
} from '../types/rfid';

// ============================================
// Mock Data
// ============================================

const MOCK_TAGS: RfidTag[] = [
  {
    id: 1,
    uid: 'A1B2C3D4',
    user_id: 1,
    vehicle_id: 1,
    status: 'active',
    expiry_date: '2026-12-31',
    notes: null,
    created_at: '2025-01-15T08:00:00Z',
    updated_at: '2025-01-15T08:00:00Z',
    user_name: 'John Doe',
    user_email: 'john.doe@example.com',
    user_employee_id: 'EMP001',
    vehicle_plate: 'ABC 1234',
    vehicle_model: 'Toyota Corolla',
    vehicle_color: 'White',
  },
  {
    id: 2,
    uid: 'E5F6G7H8',
    user_id: 2,
    vehicle_id: 2,
    status: 'active',
    expiry_date: '2026-06-15',
    notes: 'VIP parking access',
    created_at: '2025-01-10T09:30:00Z',
    updated_at: '2025-01-10T09:30:00Z',
    user_name: 'Jane Smith',
    user_email: 'jane.smith@example.com',
    user_employee_id: 'EMP002',
    vehicle_plate: 'XYZ 5678',
    vehicle_model: 'Honda Civic',
    vehicle_color: 'Black',
  },
  {
    id: 3,
    uid: 'I9J0K1L2',
    user_id: 3,
    vehicle_id: 3,
    status: 'expired',
    expiry_date: '2025-01-01',
    notes: null,
    created_at: '2024-06-01T10:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    user_name: 'Bob Wilson',
    user_email: 'bob.wilson@example.com',
    user_employee_id: 'EMP003',
    vehicle_plate: 'DEF 9012',
    vehicle_model: 'Ford Focus',
    vehicle_color: 'Blue',
  },
  {
    id: 4,
    uid: 'M3N4O5P6',
    user_id: 4,
    vehicle_id: 4,
    status: 'suspended',
    expiry_date: '2026-08-20',
    notes: 'Suspended due to parking violations',
    created_at: '2025-01-05T14:00:00Z',
    updated_at: '2025-01-25T16:30:00Z',
    user_name: 'Alice Brown',
    user_email: 'alice.brown@example.com',
    user_employee_id: 'EMP004',
    vehicle_plate: 'GHI 3456',
    vehicle_model: 'Nissan Altima',
    vehicle_color: 'Silver',
  },
  {
    id: 5,
    uid: 'Q7R8S9T0',
    user_id: 5,
    vehicle_id: 5,
    status: 'lost',
    expiry_date: '2026-10-10',
    notes: 'Reported lost on 2025-01-20',
    created_at: '2024-10-10T11:00:00Z',
    updated_at: '2025-01-20T09:00:00Z',
    user_name: 'Charlie Davis',
    user_email: 'charlie.davis@example.com',
    user_employee_id: 'EMP005',
    vehicle_plate: 'JKL 7890',
    vehicle_model: 'Chevrolet Malibu',
    vehicle_color: 'Red',
  },
  {
    id: 6,
    uid: 'U1V2W3X4',
    user_id: 6,
    vehicle_id: 6,
    status: 'active',
    expiry_date: '2026-02-28',
    notes: null,
    created_at: '2025-01-20T08:00:00Z',
    updated_at: '2025-01-20T08:00:00Z',
    user_name: 'Diana Evans',
    user_email: 'diana.evans@example.com',
    user_employee_id: 'EMP006',
    vehicle_plate: 'MNO 1234',
    vehicle_model: 'Hyundai Elantra',
    vehicle_color: 'Gray',
  },
];

const MOCK_READERS: RfidReader[] = [
  {
    id: 'reader-001',
    mac_address: 'AA:BB:CC:DD:EE:01',
    name: 'Main Entrance Gate',
    location: 'Building A - Ground Floor',
    type: 'entry',
    status: 'online',
    last_heartbeat: new Date().toISOString(),
    scan_count_today: 147,
    error_count_today: 3,
    firmware_version: '2.1.0',
    ip_address: '192.168.1.101',
  },
  {
    id: 'reader-002',
    mac_address: 'AA:BB:CC:DD:EE:02',
    name: 'Main Exit Gate',
    location: 'Building A - Ground Floor',
    type: 'exit',
    status: 'online',
    last_heartbeat: new Date().toISOString(),
    scan_count_today: 132,
    error_count_today: 1,
    firmware_version: '2.1.0',
    ip_address: '192.168.1.102',
  },
  {
    id: 'reader-003',
    mac_address: 'AA:BB:CC:DD:EE:03',
    name: 'Secondary Entrance',
    location: 'Building B - Side Gate',
    type: 'entry',
    status: 'offline',
    last_heartbeat: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    scan_count_today: 0,
    error_count_today: 0,
    firmware_version: '2.0.5',
    ip_address: '192.168.1.103',
  },
  {
    id: 'reader-004',
    mac_address: 'AA:BB:CC:DD:EE:04',
    name: 'VIP Entrance',
    location: 'Building A - VIP Section',
    type: 'entry',
    status: 'error',
    last_heartbeat: new Date(Date.now() - 300000).toISOString(), // 5 min ago
    scan_count_today: 12,
    error_count_today: 8,
    firmware_version: '2.0.5',
    ip_address: '192.168.1.104',
  },
];

// ============================================
// Service Class
// ============================================

class RfidAdminServiceClass {
  private tags: RfidTag[] = [...MOCK_TAGS];
  private readers: RfidReader[] = [...MOCK_READERS];
  private nextTagId: number = 7;

  // ----------------------------------------
  // Tag Management
  // ----------------------------------------

  async getAllTags(filters?: RfidTagFilters): Promise<PaginatedResponse<RfidTag>> {
    // Simulate API delay
    await this.simulateDelay();

    let filteredTags = [...this.tags];

    if (filters) {
      // Filter by status
      if (filters.status) {
        filteredTags = filteredTags.filter(tag => tag.status === filters.status);
      }

      // Filter by search query
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredTags = filteredTags.filter(tag =>
          tag.uid.toLowerCase().includes(searchLower) ||
          tag.user_name?.toLowerCase().includes(searchLower) ||
          tag.vehicle_plate?.toLowerCase().includes(searchLower) ||
          tag.user_email?.toLowerCase().includes(searchLower)
        );
      }

      // Filter by expiring soon
      if (filters.expiring_soon) {
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        filteredTags = filteredTags.filter(tag => {
          if (!tag.expiry_date || tag.status !== 'active') return false;
          const expiryDate = new Date(tag.expiry_date);
          return expiryDate <= thirtyDaysFromNow && expiryDate > new Date();
        });
      }

      // Filter by user
      if (filters.user_id) {
        filteredTags = filteredTags.filter(tag => tag.user_id === filters.user_id);
      }
    }

    // Sort by created_at descending
    filteredTags.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

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
    await this.simulateDelay();
    return this.tags.find(tag => tag.id === id) || null;
  }

  async getTagByUid(uid: string): Promise<RfidTag | null> {
    await this.simulateDelay();
    return this.tags.find(tag => tag.uid.toUpperCase() === uid.toUpperCase()) || null;
  }

  async createTag(data: RfidTagFormData): Promise<RfidApiResponse<RfidTag>> {
    await this.simulateDelay();

    // Check for duplicate UID
    const existingTag = this.tags.find(t => t.uid.toUpperCase() === data.uid.toUpperCase());
    if (existingTag) {
      return {
        success: false,
        message: 'A tag with this UID already exists',
        errors: { uid: ['UID must be unique'] },
      };
    }

    const newTag: RfidTag = {
      id: this.nextTagId++,
      uid: data.uid.toUpperCase(),
      user_id: data.user_id || null,
      vehicle_id: data.vehicle_id || null,
      status: data.status,
      expiry_date: data.expiry_date || null,
      notes: data.notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_name: data.user_id ? 'New User' : undefined,
      vehicle_plate: data.vehicle_id ? 'NEW 0000' : undefined,
    };

    this.tags.push(newTag);

    return {
      success: true,
      message: 'RFID tag created successfully',
      data: newTag,
    };
  }

  async updateTag(id: number, data: Partial<RfidTagFormData>): Promise<RfidApiResponse<RfidTag>> {
    await this.simulateDelay();

    const tagIndex = this.tags.findIndex(t => t.id === id);
    if (tagIndex === -1) {
      return {
        success: false,
        message: 'Tag not found',
      };
    }

    // Check for duplicate UID if changing
    if (data.uid) {
      const existingTag = this.tags.find(t =>
        t.uid.toUpperCase() === data.uid!.toUpperCase() && t.id !== id
      );
      if (existingTag) {
        return {
          success: false,
          message: 'A tag with this UID already exists',
          errors: { uid: ['UID must be unique'] },
        };
      }
    }

    const updatedTag: RfidTag = {
      ...this.tags[tagIndex],
      ...data,
      uid: data.uid ? data.uid.toUpperCase() : this.tags[tagIndex].uid,
      updated_at: new Date().toISOString(),
    };

    this.tags[tagIndex] = updatedTag;

    return {
      success: true,
      message: 'RFID tag updated successfully',
      data: updatedTag,
    };
  }

  async deactivateTag(id: number): Promise<RfidApiResponse<void>> {
    await this.simulateDelay();

    const tagIndex = this.tags.findIndex(t => t.id === id);
    if (tagIndex === -1) {
      return {
        success: false,
        message: 'Tag not found',
      };
    }

    this.tags[tagIndex] = {
      ...this.tags[tagIndex],
      status: 'suspended',
      updated_at: new Date().toISOString(),
    };

    return {
      success: true,
      message: 'RFID tag deactivated successfully',
    };
  }

  async deleteTag(id: number): Promise<RfidApiResponse<void>> {
    await this.simulateDelay();

    const tagIndex = this.tags.findIndex(t => t.id === id);
    if (tagIndex === -1) {
      return {
        success: false,
        message: 'Tag not found',
      };
    }

    this.tags.splice(tagIndex, 1);

    return {
      success: true,
      message: 'RFID tag deleted successfully',
    };
  }

  // ----------------------------------------
  // Reader Management
  // ----------------------------------------

  async getReaders(): Promise<RfidReader[]> {
    await this.simulateDelay();

    // Update heartbeat for online readers to simulate real-time
    return this.readers.map(reader => ({
      ...reader,
      last_heartbeat: reader.status === 'online'
        ? new Date().toISOString()
        : reader.last_heartbeat,
    }));
  }

  async getReaderById(id: string): Promise<RfidReader | null> {
    await this.simulateDelay();
    return this.readers.find(r => r.id === id) || null;
  }

  async restartReader(readerId: string): Promise<RfidApiResponse<void>> {
    await this.simulateDelay(2000); // Longer delay for restart

    const readerIndex = this.readers.findIndex(r => r.id === readerId);
    if (readerIndex === -1) {
      return {
        success: false,
        message: 'Reader not found',
      };
    }

    // Simulate restart success (change error/offline to online)
    this.readers[readerIndex] = {
      ...this.readers[readerIndex],
      status: 'online',
      last_heartbeat: new Date().toISOString(),
      error_count_today: 0,
    };

    return {
      success: true,
      message: 'Reader restart initiated successfully',
    };
  }

  // ----------------------------------------
  // Statistics
  // ----------------------------------------

  async getDashboardStats(): Promise<RfidDashboardStats> {
    await this.simulateDelay();

    const activeTags = this.tags.filter(t => t.status === 'active').length;
    const expiredTags = this.tags.filter(t => t.status === 'expired').length;
    const suspendedTags = this.tags.filter(t => t.status === 'suspended').length;
    const lostTags = this.tags.filter(t => t.status === 'lost').length;

    // Count tags expiring within 30 days
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const expiringSoon = this.tags.filter(tag => {
      if (!tag.expiry_date || tag.status !== 'active') return false;
      const expiryDate = new Date(tag.expiry_date);
      return expiryDate <= thirtyDaysFromNow && expiryDate > new Date();
    }).length;

    const readersOnline = this.readers.filter(r => r.status === 'online').length;
    const readersOffline = this.readers.filter(r => r.status === 'offline').length;
    const readersError = this.readers.filter(r => r.status === 'error').length;

    return {
      total_tags: this.tags.length,
      active_tags: activeTags,
      expired_tags: expiredTags,
      suspended_tags: suspendedTags,
      lost_tags: lostTags,
      expiring_soon: expiringSoon,
      readers_online: readersOnline,
      readers_offline: readersOffline,
      readers_error: readersError,
      today_entries: 147 + 12, // Mock data
      today_exits: 132,
      today_invalid_scans: 8,
      current_parked: 27,
    };
  }

  // ----------------------------------------
  // Utility Methods
  // ----------------------------------------

  private async simulateDelay(ms: number = 500): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Reset mock data (useful for testing)
  resetMockData(): void {
    this.tags = [...MOCK_TAGS];
    this.readers = [...MOCK_READERS];
    this.nextTagId = 7;
  }
}

// Export singleton instance
export const RfidAdminService = new RfidAdminServiceClass();
