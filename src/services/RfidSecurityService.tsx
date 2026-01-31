// RFID Security Service - Real-time scan monitoring and alert management
// Follows the polling pattern from RealtimeParkingService

import {
  RfidScanEvent,
  RfidAlert,
  GuestAccess,
  SecurityDashboardStats,
  ScanUpdateCallback,
  AlertCallback,
  ConnectionStatusCallback,
  StatsUpdateCallback,
  ScanHistoryFilters,
  GuestFilters,
  AlertFilters,
  VerificationResult,
  RfidApiResponse,
  PaginatedResponse,
} from '../types/rfid';

// ============================================
// Mock Data Generators
// ============================================

const MOCK_USER_NAMES = [
  'John Doe', 'Jane Smith', 'Bob Wilson', 'Alice Brown', 'Charlie Davis',
  'Diana Evans', 'Frank Garcia', 'Grace Hill', 'Henry Irving', 'Ivy Johnson',
];

const MOCK_PLATES = [
  'ABC 1234', 'XYZ 5678', 'DEF 9012', 'GHI 3456', 'JKL 7890',
  'MNO 1234', 'PQR 5678', 'STU 9012', 'VWX 3456', 'YZA 7890',
];

const MOCK_READER_NAMES = ['Main Entrance', 'Main Exit', 'VIP Entrance', 'Side Gate'];
const MOCK_READER_LOCATIONS = ['Building A', 'Building A', 'Building A - VIP', 'Building B'];

const generateMockScan = (index: number = 0): RfidScanEvent => {
  const isValid = Math.random() > 0.2; // 80% valid scans
  const statuses: RfidScanEvent['status'][] = isValid
    ? ['valid']
    : ['invalid', 'expired', 'unknown'];
  const status = statuses[Math.floor(Math.random() * statuses.length)];
  const scanType = Math.random() > 0.5 ? 'entry' : 'exit';
  const readerIndex = Math.floor(Math.random() * MOCK_READER_NAMES.length);

  const messages: Record<RfidScanEvent['status'], string> = {
    valid: 'Access granted',
    invalid: 'RFID not registered. Please go to office.',
    expired: 'RFID expired. Please go to office.',
    unknown: 'Unknown card detected',
  };

  return {
    id: `scan-${Date.now()}-${index}`,
    timestamp: new Date(Date.now() - index * 30000).toISOString(), // Each scan 30s apart
    reader_id: `reader-00${readerIndex + 1}`,
    reader_name: MOCK_READER_NAMES[readerIndex],
    reader_location: MOCK_READER_LOCATIONS[readerIndex],
    rfid_uid: generateRandomUID(),
    scan_type: scanType,
    status: status,
    message: messages[status],
    duration: isValid ? 7 : 10,
    user_name: isValid ? MOCK_USER_NAMES[Math.floor(Math.random() * MOCK_USER_NAMES.length)] : undefined,
    vehicle_plate: isValid ? MOCK_PLATES[Math.floor(Math.random() * MOCK_PLATES.length)] : undefined,
  };
};

const generateRandomUID = (): string => {
  const chars = 'ABCDEF0123456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

const generateMockAlert = (scan: RfidScanEvent): RfidAlert => {
  const alertTypes: Record<RfidScanEvent['status'], RfidAlert['alert_type']> = {
    invalid: 'invalid_rfid',
    expired: 'expired_rfid',
    unknown: 'unknown_rfid',
    valid: 'suspicious_activity', // Shouldn't happen
  };

  const severities: Record<RfidAlert['alert_type'], RfidAlert['severity']> = {
    invalid_rfid: 'medium',
    expired_rfid: 'low',
    suspended_rfid: 'high',
    unknown_rfid: 'medium',
    suspicious_activity: 'critical',
  };

  const alertType = alertTypes[scan.status] || 'unknown_rfid';

  return {
    id: `alert-${scan.id}`,
    scan_event_id: scan.id,
    scan_event: scan,
    alert_type: alertType,
    severity: severities[alertType],
    acknowledged: false,
    acknowledged_by: null,
    acknowledged_at: null,
    notes: null,
    created_at: scan.timestamp,
  };
};

// ============================================
// Mock Guest Data
// ============================================

const MOCK_GUESTS: GuestAccess[] = [
  {
    id: 1,
    guest_id: 'GUEST-2026-001',
    name: 'Michael Johnson',
    vehicle_plate: 'GUEST 001',
    phone: '+1234567890',
    purpose: 'Business Meeting',
    valid_from: new Date().toISOString(),
    valid_until: new Date(Date.now() + 86400000).toISOString(), // 24 hours
    status: 'pending',
    approved_by: null,
    notes: 'Meeting with CEO',
    created_by: 1,
    created_by_name: 'Admin User',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 2,
    guest_id: 'GUEST-2026-002',
    name: 'Sarah Williams',
    vehicle_plate: 'GUEST 002',
    phone: '+0987654321',
    purpose: 'Delivery',
    valid_from: new Date().toISOString(),
    valid_until: new Date(Date.now() + 14400000).toISOString(), // 4 hours
    status: 'approved',
    approved_by: 1,
    approved_by_name: 'Security Guard',
    notes: 'Package delivery',
    created_by: 1,
    created_by_name: 'Admin User',
    created_at: new Date(Date.now() - 7200000).toISOString(),
    updated_at: new Date(Date.now() - 3000000).toISOString(),
  },
  {
    id: 3,
    guest_id: 'GUEST-2026-003',
    name: 'Robert Brown',
    vehicle_plate: 'GUEST 003',
    phone: '+1122334455',
    purpose: 'Interview',
    valid_from: new Date().toISOString(),
    valid_until: new Date(Date.now() + 43200000).toISOString(), // 12 hours
    status: 'pending',
    approved_by: null,
    notes: 'Job interview - HR Department',
    created_by: 2,
    created_by_name: 'HR Manager',
    created_at: new Date(Date.now() - 1800000).toISOString(),
    updated_at: new Date(Date.now() - 1800000).toISOString(),
  },
];

// ============================================
// Service Class
// ============================================

class RfidSecurityServiceClass {
  // Callbacks
  private scanCallbacks: ScanUpdateCallback[] = [];
  private alertCallbacks: AlertCallback[] = [];
  private connectionCallbacks: ConnectionStatusCallback[] = [];
  private statsCallbacks: StatsUpdateCallback[] = [];

  // Polling state
  private updateInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private shouldStop: boolean = false;
  private pollingIntervalMs: number = 3000;

  // Connection state
  private connectionStatus: 'connected' | 'disconnected' | 'error' = 'disconnected';
  private consecutiveErrors: number = 0;
  private maxConsecutiveErrors: number = 5;

  // Data storage
  private recentScans: RfidScanEvent[] = [];
  private alerts: RfidAlert[] = [];
  private guests: GuestAccess[] = [...MOCK_GUESTS];
  private lastStats: SecurityDashboardStats | null = null;

  constructor() {
    // Initialize with some mock scan history
    this.initializeMockData();
  }

  private initializeMockData(): void {
    // Generate 20 mock historical scans
    for (let i = 0; i < 20; i++) {
      const scan = generateMockScan(i);
      this.recentScans.push(scan);

      // Create alerts for invalid scans
      if (scan.status !== 'valid') {
        this.alerts.push(generateMockAlert(scan));
      }
    }
  }

  // ----------------------------------------
  // Real-time Monitoring (Polling)
  // ----------------------------------------

  start(): void {
    if (this.updateInterval) {
      console.log('RfidSecurityService already running');
      return;
    }

    console.log('Starting RfidSecurityService');
    this.isRunning = true;
    this.shouldStop = false;
    this.consecutiveErrors = 0;

    // Initial fetch
    this.fetchAndUpdate();

    // Set up polling
    this.updateInterval = setInterval(() => {
      if (!this.shouldStop && this.isRunning) {
        this.fetchAndUpdate();
      }
    }, this.pollingIntervalMs);
  }

  stop(): void {
    console.log('Stopping RfidSecurityService');
    this.shouldStop = true;
    this.isRunning = false;

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    this.setConnectionStatus('disconnected');
  }

  setPollingInterval(ms: number): void {
    this.pollingIntervalMs = Math.max(1000, Math.min(60000, ms));

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = setInterval(() => {
        if (!this.shouldStop && this.isRunning) {
          this.fetchAndUpdate();
        }
      }, this.pollingIntervalMs);
    }
  }

  private async fetchAndUpdate(): Promise<void> {
    try {
      // Simulate API call - in production, this would fetch from backend
      await this.simulateApiDelay();

      // Generate a new scan occasionally (30% chance)
      if (Math.random() < 0.3) {
        const newScan = generateMockScan();
        newScan.timestamp = new Date().toISOString();
        this.recentScans.unshift(newScan);

        // Keep only last 100 scans
        if (this.recentScans.length > 100) {
          this.recentScans = this.recentScans.slice(0, 100);
        }

        // Create alert for invalid scans
        if (newScan.status !== 'valid') {
          const alert = generateMockAlert(newScan);
          this.alerts.unshift(alert);
        }
      }

      // Update stats
      this.updateStats();

      // Notify callbacks
      this.notifyScanUpdate();
      this.notifyAlertUpdate();
      this.notifyStatsUpdate();

      // Reset error counter and set connected
      this.consecutiveErrors = 0;
      this.setConnectionStatus('connected');

    } catch (error) {
      console.log('Error in RfidSecurityService fetch:', error);
      this.consecutiveErrors++;

      if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
        this.setConnectionStatus('error');
      }
    }
  }

  private updateStats(): void {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const todayScans = this.recentScans.filter(s =>
      new Date(s.timestamp) >= todayStart
    );

    this.lastStats = {
      today_entries: todayScans.filter(s => s.scan_type === 'entry').length,
      today_exits: todayScans.filter(s => s.scan_type === 'exit').length,
      current_parked: Math.max(0,
        todayScans.filter(s => s.scan_type === 'entry' && s.status === 'valid').length -
        todayScans.filter(s => s.scan_type === 'exit' && s.status === 'valid').length
      ) + 15, // Base count
      active_alerts: this.alerts.filter(a => !a.acknowledged).length,
      pending_guests: this.guests.filter(g => g.status === 'pending').length,
      approved_guests_today: this.guests.filter(g =>
        g.status === 'approved' && new Date(g.updated_at) >= todayStart
      ).length,
      invalid_scans_today: todayScans.filter(s => s.status !== 'valid').length,
      last_scan: this.recentScans[0],
    };
  }

  // ----------------------------------------
  // Subscription Methods
  // ----------------------------------------

  onScanUpdate(callback: ScanUpdateCallback): () => void {
    this.scanCallbacks.push(callback);

    // Send current data immediately
    if (this.recentScans.length > 0) {
      try {
        callback([...this.recentScans]);
      } catch (error) {
        console.log('Error in scan callback:', error);
      }
    }

    // Auto-start if not running
    if (!this.updateInterval) {
      this.start();
    }

    return () => {
      const index = this.scanCallbacks.indexOf(callback);
      if (index > -1) {
        this.scanCallbacks.splice(index, 1);
      }
    };
  }

  onAlertUpdate(callback: AlertCallback): () => void {
    this.alertCallbacks.push(callback);

    // Send current alerts immediately
    if (this.alerts.length > 0) {
      try {
        callback([...this.alerts]);
      } catch (error) {
        console.log('Error in alert callback:', error);
      }
    }

    return () => {
      const index = this.alertCallbacks.indexOf(callback);
      if (index > -1) {
        this.alertCallbacks.splice(index, 1);
      }
    };
  }

  onConnectionStatus(callback: ConnectionStatusCallback): () => void {
    this.connectionCallbacks.push(callback);

    // Send current status immediately
    try {
      callback(this.connectionStatus);
    } catch (error) {
      console.log('Error in connection callback:', error);
    }

    return () => {
      const index = this.connectionCallbacks.indexOf(callback);
      if (index > -1) {
        this.connectionCallbacks.splice(index, 1);
      }
    };
  }

  onStatsUpdate(callback: StatsUpdateCallback): () => void {
    this.statsCallbacks.push(callback);

    // Send current stats immediately
    if (this.lastStats) {
      try {
        callback({ ...this.lastStats });
      } catch (error) {
        console.log('Error in stats callback:', error);
      }
    }

    return () => {
      const index = this.statsCallbacks.indexOf(callback);
      if (index > -1) {
        this.statsCallbacks.splice(index, 1);
      }
    };
  }

  // ----------------------------------------
  // Notification Methods
  // ----------------------------------------

  private notifyScanUpdate(): void {
    for (const callback of this.scanCallbacks) {
      try {
        callback([...this.recentScans]);
      } catch (error) {
        console.log('Error in scan callback:', error);
      }
    }
  }

  private notifyAlertUpdate(): void {
    for (const callback of this.alertCallbacks) {
      try {
        callback([...this.alerts]);
      } catch (error) {
        console.log('Error in alert callback:', error);
      }
    }
  }

  private notifyStatsUpdate(): void {
    if (!this.lastStats) return;

    for (const callback of this.statsCallbacks) {
      try {
        callback({ ...this.lastStats });
      } catch (error) {
        console.log('Error in stats callback:', error);
      }
    }
  }

  private setConnectionStatus(status: 'connected' | 'disconnected' | 'error'): void {
    if (this.connectionStatus !== status) {
      this.connectionStatus = status;

      for (const callback of this.connectionCallbacks) {
        try {
          callback(status);
        } catch (error) {
          console.log('Error in connection callback:', error);
        }
      }
    }
  }

  // ----------------------------------------
  // Data Access Methods
  // ----------------------------------------

  async getRecentScans(filters?: ScanHistoryFilters): Promise<PaginatedResponse<RfidScanEvent>> {
    await this.simulateApiDelay();

    let filteredScans = [...this.recentScans];

    if (filters) {
      if (filters.status) {
        filteredScans = filteredScans.filter(s => s.status === filters.status);
      }
      if (filters.scan_type) {
        filteredScans = filteredScans.filter(s => s.scan_type === filters.scan_type);
      }
      if (filters.reader_id) {
        filteredScans = filteredScans.filter(s => s.reader_id === filters.reader_id);
      }
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredScans = filteredScans.filter(s =>
          s.rfid_uid.toLowerCase().includes(searchLower) ||
          s.user_name?.toLowerCase().includes(searchLower) ||
          s.vehicle_plate?.toLowerCase().includes(searchLower)
        );
      }
      if (filters.from_date) {
        const fromDate = new Date(filters.from_date);
        filteredScans = filteredScans.filter(s => new Date(s.timestamp) >= fromDate);
      }
      if (filters.to_date) {
        const toDate = new Date(filters.to_date);
        filteredScans = filteredScans.filter(s => new Date(s.timestamp) <= toDate);
      }
    }

    return {
      success: true,
      data: filteredScans,
      pagination: {
        current_page: 1,
        per_page: 50,
        total: filteredScans.length,
        total_pages: 1,
      },
    };
  }

  async getActiveAlerts(filters?: AlertFilters): Promise<RfidAlert[]> {
    await this.simulateApiDelay();

    let filteredAlerts = [...this.alerts];

    if (filters) {
      if (filters.acknowledged !== undefined) {
        filteredAlerts = filteredAlerts.filter(a => a.acknowledged === filters.acknowledged);
      }
      if (filters.alert_type) {
        filteredAlerts = filteredAlerts.filter(a => a.alert_type === filters.alert_type);
      }
      if (filters.severity) {
        filteredAlerts = filteredAlerts.filter(a => a.severity === filters.severity);
      }
    }

    return filteredAlerts;
  }

  async acknowledgeAlert(alertId: string, notes?: string): Promise<RfidApiResponse<void>> {
    await this.simulateApiDelay();

    const alertIndex = this.alerts.findIndex(a => a.id === alertId);
    if (alertIndex === -1) {
      return { success: false, message: 'Alert not found' };
    }

    this.alerts[alertIndex] = {
      ...this.alerts[alertIndex],
      acknowledged: true,
      acknowledged_by: 1, // Mock security user ID
      acknowledged_by_name: 'Security Guard',
      acknowledged_at: new Date().toISOString(),
      notes: notes || null,
    };

    this.notifyAlertUpdate();
    this.updateStats();
    this.notifyStatsUpdate();

    return { success: true, message: 'Alert acknowledged' };
  }

  // ----------------------------------------
  // Guest Management
  // ----------------------------------------

  async getPendingGuests(): Promise<GuestAccess[]> {
    await this.simulateApiDelay();
    return this.guests.filter(g => g.status === 'pending');
  }

  async getAllGuests(filters?: GuestFilters): Promise<PaginatedResponse<GuestAccess>> {
    await this.simulateApiDelay();

    let filteredGuests = [...this.guests];

    if (filters) {
      if (filters.status) {
        filteredGuests = filteredGuests.filter(g => g.status === filters.status);
      }
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredGuests = filteredGuests.filter(g =>
          g.name.toLowerCase().includes(searchLower) ||
          g.vehicle_plate.toLowerCase().includes(searchLower) ||
          g.guest_id.toLowerCase().includes(searchLower)
        );
      }
    }

    return {
      success: true,
      data: filteredGuests,
      pagination: {
        current_page: 1,
        per_page: 50,
        total: filteredGuests.length,
        total_pages: 1,
      },
    };
  }

  async approveGuest(guestId: number): Promise<RfidApiResponse<void>> {
    await this.simulateApiDelay();

    const guestIndex = this.guests.findIndex(g => g.id === guestId);
    if (guestIndex === -1) {
      return { success: false, message: 'Guest not found' };
    }

    this.guests[guestIndex] = {
      ...this.guests[guestIndex],
      status: 'approved',
      approved_by: 1, // Mock security user ID
      approved_by_name: 'Security Guard',
      updated_at: new Date().toISOString(),
    };

    this.updateStats();
    this.notifyStatsUpdate();

    return { success: true, message: 'Guest approved successfully' };
  }

  async denyGuest(guestId: number, reason?: string): Promise<RfidApiResponse<void>> {
    await this.simulateApiDelay();

    const guestIndex = this.guests.findIndex(g => g.id === guestId);
    if (guestIndex === -1) {
      return { success: false, message: 'Guest not found' };
    }

    this.guests[guestIndex] = {
      ...this.guests[guestIndex],
      status: 'denied',
      notes: reason || this.guests[guestIndex].notes,
      updated_at: new Date().toISOString(),
    };

    this.updateStats();
    this.notifyStatsUpdate();

    return { success: true, message: 'Guest denied' };
  }

  // ----------------------------------------
  // Manual Verification
  // ----------------------------------------

  async verifyRfidManually(uid: string): Promise<VerificationResult> {
    await this.simulateApiDelay();

    // Simulate verification - in production would call /rfid/verify
    const isValid = Math.random() > 0.3;

    if (isValid) {
      return {
        valid: true,
        message: 'Access granted',
        duration: 7,
        uid: uid.toUpperCase(),
        user_name: MOCK_USER_NAMES[Math.floor(Math.random() * MOCK_USER_NAMES.length)],
        vehicle_plate: MOCK_PLATES[Math.floor(Math.random() * MOCK_PLATES.length)],
        scan_time: Date.now().toString(),
        user: {
          name: 'John Doe',
          vehicle_plate: 'ABC 1234',
          entry_time: new Date().toISOString(),
        },
      };
    }

    return {
      valid: false,
      message: 'RFID not registered. Please go to office.',
      duration: 10,
      user_name: 'N/A',
      vehicle_plate: 'N/A',
      scan_time: Date.now().toString(),
    };
  }

  // ----------------------------------------
  // Dashboard Stats
  // ----------------------------------------

  async getDashboardStats(): Promise<SecurityDashboardStats> {
    await this.simulateApiDelay();
    this.updateStats();
    return this.lastStats!;
  }

  getLastStats(): SecurityDashboardStats | null {
    return this.lastStats;
  }

  // ----------------------------------------
  // Service Status
  // ----------------------------------------

  getServiceStatus() {
    return {
      isRunning: this.isRunning,
      pollingInterval: this.pollingIntervalMs,
      connectionStatus: this.connectionStatus,
      scansCount: this.recentScans.length,
      alertsCount: this.alerts.filter(a => !a.acknowledged).length,
      pendingGuests: this.guests.filter(g => g.status === 'pending').length,
    };
  }

  // ----------------------------------------
  // Utility Methods
  // ----------------------------------------

  private async simulateApiDelay(ms: number = 300): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Reset mock data (useful for testing)
  resetMockData(): void {
    this.recentScans = [];
    this.alerts = [];
    this.guests = [...MOCK_GUESTS];
    this.lastStats = null;
    this.initializeMockData();
  }
}

// Export singleton instance
export const RfidSecurityService = new RfidSecurityServiceClass();
