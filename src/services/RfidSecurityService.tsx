// RFID Security Service - Real-time monitoring using backend API
// Polls /public/rfid/scans for scan events and triggers local notifications
// Follows the same pattern as RealtimeParkingService

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
import apiClient, { TokenManager } from '../config/api';
import NotificationService from './NotificationService';
import { NotificationManager } from './NotifManager';
import { RealTimeParkingService } from './RealtimeParkingService';
import { API_ENDPOINTS } from '../constants/AppConst';

// Invalid statuses that should trigger alerts/notifications
const INVALID_STATUSES = new Set(['invalid', 'expired', 'suspended', 'lost', 'unknown']);

// Map scan status to alert type
const STATUS_TO_ALERT_TYPE: Record<string, RfidAlert['alert_type']> = {
  invalid: 'invalid_rfid',
  expired: 'expired_rfid',
  suspended: 'suspended_rfid',
  lost: 'suspended_rfid',
  unknown: 'unknown_rfid',
};

// Map scan status to notification alert type
const STATUS_TO_NOTIF_TYPE: Record<string, 'invalid' | 'expired' | 'suspended' | 'unknown'> = {
  invalid: 'invalid',
  expired: 'expired',
  suspended: 'suspended',
  lost: 'suspended',
  unknown: 'unknown',
};

// Map scan status to severity
const STATUS_TO_SEVERITY: Record<string, RfidAlert['severity']> = {
  invalid: 'medium',
  expired: 'low',
  suspended: 'high',
  lost: 'high',
  unknown: 'medium',
};

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
  private pollingIntervalMs: number = 10000; // 10 seconds like web team suggested
  private isFetching: boolean = false;

  // Connection state
  private connectionStatus: 'connected' | 'disconnected' | 'error' = 'disconnected';
  private consecutiveErrors: number = 0;
  private maxConsecutiveErrors: number = 5;

  // Data storage
  private recentScans: RfidScanEvent[] = [];
  private alerts: RfidAlert[] = [];
  private guests: GuestAccess[] = [];
  private lastStats: SecurityDashboardStats | null = null;

  // Track processed scan IDs to avoid duplicate notifications
  private processedScanIds: Set<number> = new Set();

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
      if (!this.shouldStop && this.isRunning && !this.isFetching) {
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

    this.isFetching = false;
    this.setConnectionStatus('disconnected');
  }

  setPollingInterval(ms: number): void {
    this.pollingIntervalMs = Math.max(5000, Math.min(60000, ms));

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = setInterval(() => {
        if (!this.shouldStop && this.isRunning && !this.isFetching) {
          this.fetchAndUpdate();
        }
      }, this.pollingIntervalMs);
    }
  }

  private async fetchAndUpdate(): Promise<void> {
    if (this.isFetching || this.shouldStop || !this.isRunning) return;

    this.isFetching = true;

    try {
      // Fetch real RFID scan data from backend
      const response = await apiClient.get(API_ENDPOINTS.publicRfidScans, {
        params: { minutes: 60 },
      });

      const data = response.data;
      const scans: any[] = data?.scans || [];

      if (this.shouldStop || !this.isRunning) return;

      // Process new scans and detect changes
      this.processNewScans(scans);

      // Update stats from scan data
      this.updateStatsFromScans(scans);

      // Notify callbacks
      this.notifyScanUpdate();
      this.notifyAlertUpdate();
      this.notifyStatsUpdate();

      // Reset error counter and set connected
      this.consecutiveErrors = 0;
      this.setConnectionStatus('connected');

    } catch (error: any) {
      if (this.shouldStop) return;
      console.log('Error in RfidSecurityService fetch:', error?.message);
      this.consecutiveErrors++;

      if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
        this.setConnectionStatus('error');
      }
    } finally {
      this.isFetching = false;
    }
  }

  private async processNewScans(apiScans: any[]): Promise<void> {
    const newInvalidScans: RfidScanEvent[] = [];

    for (const raw of apiScans) {
      const scanId = raw.id;

      // Skip processed scans
      if (this.processedScanIds.has(scanId)) continue;

      // Mark as processed
      this.processedScanIds.add(scanId);

      // Map API response to RfidScanEvent
      const scan: RfidScanEvent = {
        id: `scan-${scanId}`,
        timestamp: raw.timestamp || new Date().toISOString(),
        reader_id: raw.gate_mac || 'unknown',
        reader_name: raw.gate_mac || 'Gate',
        reader_location: raw.gate_mac || 'Unknown Location',
        rfid_uid: raw.uid || 'Unknown',
        scan_type: raw.scan_type || 'entry',
        status: raw.status || 'unknown',
        message: raw.message || '',
        duration: raw.status === 'valid' ? 7 : 10,
        user_name: raw.user_name || undefined,
        vehicle_plate: raw.vehicle_plate || undefined,
      };

      // Add to recent scans (newest first)
      this.recentScans.unshift(scan);

      // for notification logic
      if (scan.status === 'valid') {
        const currentUser = TokenManager.getUser();
        const matchesUser = currentUser && (
          (raw.user_id && raw.user_id === currentUser.id) ||
          (raw.user_name && currentUser.name && raw.user_name.toLowerCase() === currentUser.name.toLowerCase())
        );

        if (matchesUser) {
          if (scan.scan_type === 'entry') {
            NotificationManager.setRfidEntryDetected(true);
            await NotificationManager.resumeSpotNotifications();
            RealTimeParkingService.resetNotificationDedup();
            // Force immediate parking poll so newly-available spots are detected right away
            setTimeout(() => RealTimeParkingService.forceUpdate(), 500);
          } else if (scan.scan_type === 'exit') {
            NotificationManager.setRfidEntryDetected(false);
            await NotificationManager.pauseSpotNotifications();
          }
        }
      }

      // If invalid, create alert and queue for notification
      // Exclude "Vehicle already inside" — not a security threat
      const isAlreadyInsideMsg = scan.message?.toLowerCase().includes('already inside');
      if (INVALID_STATUSES.has(scan.status) && !isAlreadyInsideMsg) {
        const alert = this.createAlertFromScan(scan);
        this.alerts.unshift(alert);
        newInvalidScans.push(scan);
      }
    }

    // Keep only last 100 scans and 100 alerts
    if (this.recentScans.length > 100) {
      this.recentScans = this.recentScans.slice(0, 100);
    }
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(0, 100);
    }

    // Keep processedScanIds from growing too large
    if (this.processedScanIds.size > 500) {
      const idsArray = Array.from(this.processedScanIds);
      this.processedScanIds = new Set(idsArray.slice(-200));
    }

    // Trigger local notifications for new invalid scans
    // (Same pattern as RealtimeParkingService triggering NotificationService)
    for (const scan of newInvalidScans) {
      this.triggerLocalNotification(scan);
    }
  }

  private createAlertFromScan(scan: RfidScanEvent): RfidAlert {
    return {
      id: `alert-${scan.id}`,
      scan_event_id: scan.id,
      scan_event: scan,
      alert_type: STATUS_TO_ALERT_TYPE[scan.status] || 'unknown_rfid',
      severity: STATUS_TO_SEVERITY[scan.status] || 'medium',
      acknowledged: false,
      acknowledged_by: null,
      acknowledged_at: null,
      notes: null,
      created_at: scan.timestamp,
    };
  }

  private async triggerLocalNotification(scan: RfidScanEvent): Promise<void> {
    try {
      // Only send RFID alert notifications to security and admin roles
      const currentUser = TokenManager.getUser();
      if (!currentUser || !['security', 'admin', 'ssd'].includes(currentUser.role)) {
        return;
      }

      const alertType = STATUS_TO_NOTIF_TYPE[scan.status] || 'unknown';

      // Device push notification
      await NotificationService.showRfidAlertNotification(
        alertType,
        scan.rfid_uid,
        scan.reader_name ?? 'Unknown',
        {
          userName: scan.user_name || undefined,
          vehiclePlate: scan.vehicle_plate || undefined,
          message: scan.message || undefined,
        }
      );

      // Persist to AsyncStorage so it appears in-app and survives restarts
      await NotificationManager.addRfidAlertNotification({
        alertType,
        rfidUid: scan.rfid_uid,
        readerLocation: scan.reader_name ?? 'Unknown',
        userName: scan.user_name || undefined,
        vehiclePlate: scan.vehicle_plate || undefined,
        message: scan.message || undefined,
      });

      console.log(`RFID local notification triggered: ${alertType} - ${scan.rfid_uid}`);
    } catch (error) {
      console.log('Error triggering RFID local notification:', error);
    }
  }

  private updateStatsFromScans(apiScans: any[]): void {
    const validEntries = apiScans.filter(s => s.status === 'valid' && s.scan_type === 'entry').length;
    const validExits = apiScans.filter(s => s.status === 'valid' && s.scan_type === 'exit').length;
    const invalidScans = apiScans.filter(s => INVALID_STATUSES.has(s.status)).length;

    this.lastStats = {
      today_entries: validEntries,
      today_exits: validExits,
      current_parked: Math.max(0, validEntries - validExits),
      active_alerts: this.alerts.filter(a => !a.acknowledged).length,
      pending_guests: this.guests.filter(g => g.status === 'pending').length,
      approved_guests_today: this.guests.filter(g => g.status === 'approved').length,
      invalid_scans_today: invalidScans,
      last_scan: this.recentScans.length > 0 ? this.recentScans[0] : undefined,
    };
  }

  // ----------------------------------------
  // Subscription Methods
  // ----------------------------------------

  onScanUpdate(callback: ScanUpdateCallback): () => void {
    this.scanCallbacks.push(callback);

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
      if (index > -1) this.scanCallbacks.splice(index, 1);
    };
  }

  onAlertUpdate(callback: AlertCallback): () => void {
    this.alertCallbacks.push(callback);

    if (this.alerts.length > 0) {
      try {
        callback([...this.alerts]);
      } catch (error) {
        console.log('Error in alert callback:', error);
      }
    }

    return () => {
      const index = this.alertCallbacks.indexOf(callback);
      if (index > -1) this.alertCallbacks.splice(index, 1);
    };
  }

  onConnectionStatus(callback: ConnectionStatusCallback): () => void {
    this.connectionCallbacks.push(callback);

    try {
      callback(this.connectionStatus);
    } catch (error) {
      console.log('Error in connection callback:', error);
    }

    return () => {
      const index = this.connectionCallbacks.indexOf(callback);
      if (index > -1) this.connectionCallbacks.splice(index, 1);
    };
  }

  onStatsUpdate(callback: StatsUpdateCallback): () => void {
    this.statsCallbacks.push(callback);

    if (this.lastStats) {
      try {
        callback({ ...this.lastStats });
      } catch (error) {
        console.log('Error in stats callback:', error);
      }
    }

    // Auto-start if not running
    if (!this.updateInterval) {
      this.start();
    }

    return () => {
      const index = this.statsCallbacks.indexOf(callback);
      if (index > -1) this.statsCallbacks.splice(index, 1);
    };
  }

  // ----------------------------------------
  // Callback Notification Methods
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
  // Guest Notification
  // ----------------------------------------

  async notifyNewGuestRequest(guest: GuestAccess): Promise<void> {
    try {
      // Device push notification
      await NotificationService.showGuestRequestNotification(
        guest.name,
        guest.vehicle_plate,
        guest.purpose,
        String(guest.id)
      );

      // Persist to AsyncStorage so it appears in-app and survives restarts
      await NotificationManager.addGuestRequestNotification({
        guestName: guest.name,
        vehiclePlate: guest.vehicle_plate,
        purpose: guest.purpose,
        guestId: String(guest.id),
      });

      console.log(`Guest request notification sent for: ${guest.name}`);
    } catch (error) {
      console.log('Error sending guest request notification:', error);
    }
  }

  // ----------------------------------------
  // Data Access Methods
  // ----------------------------------------

  async getRecentScans(filters?: ScanHistoryFilters): Promise<PaginatedResponse<RfidScanEvent>> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.publicRfidScans, {
        params: { minutes: 1440 }, // last 24 hours
      });
      const data = response.data;
      const apiScans: any[] = data?.scans || [];
      const mapped: RfidScanEvent[] = apiScans.map((raw: any) => ({
        id: `scan-${raw.id}`,
        timestamp: raw.timestamp || new Date().toISOString(),
        reader_id: raw.gate_mac || 'unknown',
        reader_name: raw.gate_mac || 'Gate',
        reader_location: raw.gate_mac || 'Unknown Location',
        rfid_uid: raw.uid || 'Unknown',
        scan_type: raw.scan_type || 'entry',
        status: raw.status || 'unknown',
        message: raw.message || '',
        duration: raw.status === 'valid' ? 7 : 10,
        user_name: raw.user_name || undefined,
        vehicle_plate: raw.vehicle_plate || undefined,
      }));
      // Merge with in-memory and deduplicate by id
      const merged = [...mapped];
      const ids = new Set(mapped.map(s => s.id));
      for (const s of this.recentScans) {
        if (!ids.has(s.id)) merged.push(s);
      }
      let filteredScans = merged;

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
    } catch {
      return { success: false, data: [], pagination: { current_page: 1, per_page: 50, total: 0, total_pages: 1 } };
    }
  }

  async restoreRfidStateForUser(userName: string): Promise<void> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.publicRfidScans, { params: { minutes: 1440 } });
      const scans: any[] = response.data?.scans ?? [];
      // Find the most recent valid scan for this user
      const userScans = scans
        .filter(s => s.status === 'valid' && s.user_name?.toLowerCase() === userName.toLowerCase())
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      if (userScans.length > 0) {
        const latest = userScans[0];
        if (latest.scan_type === 'entry') {
          NotificationManager.setRfidEntryDetected(true);
          await NotificationManager.resumeSpotNotifications();
          RealTimeParkingService.resetNotificationDedup();
          setTimeout(() => RealTimeParkingService.forceUpdate(), 500);
        } else if (latest.scan_type === 'exit') {
          NotificationManager.setRfidEntryDetected(false);
          await NotificationManager.pauseSpotNotifications();
        }
      }
    } catch {
      // silent fail — state remains as loaded from AsyncStorage
    }
  }

  async getActiveAlerts(filters?: AlertFilters): Promise<RfidAlert[]> {
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
    const alertIndex = this.alerts.findIndex(a => a.id === alertId);
    if (alertIndex === -1) {
      return { success: false, message: 'Alert not found' };
    }

    this.alerts[alertIndex] = {
      ...this.alerts[alertIndex],
      acknowledged: true,
      acknowledged_by: 1,
      acknowledged_by_name: 'Security Guard',
      acknowledged_at: new Date().toISOString(),
      notes: notes || null,
    };

    this.notifyAlertUpdate();
    if (this.lastStats) {
      this.lastStats.active_alerts = this.alerts.filter(a => !a.acknowledged).length;
      this.notifyStatsUpdate();
    }

    return { success: true, message: 'Alert acknowledged' };
  }

  // ----------------------------------------
  // Guest Management
  // ----------------------------------------

  async getPendingGuests(): Promise<GuestAccess[]> {
    return this.guests.filter(g => g.status === 'pending');
  }

  async getAllGuests(filters?: GuestFilters): Promise<PaginatedResponse<GuestAccess>> {
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
    const guestIndex = this.guests.findIndex(g => g.id === guestId);
    if (guestIndex === -1) {
      return { success: false, message: 'Guest not found' };
    }

    this.guests[guestIndex] = {
      ...this.guests[guestIndex],
      status: 'approved',
      approved_by: 1,
      approved_by_name: 'Security Guard',
      updated_at: new Date().toISOString(),
    };

    if (this.lastStats) {
      this.lastStats.pending_guests = this.guests.filter(g => g.status === 'pending').length;
      this.lastStats.approved_guests_today = this.guests.filter(g => g.status === 'approved').length;
      this.notifyStatsUpdate();
    }

    return { success: true, message: 'Guest approved successfully' };
  }

  async denyGuest(guestId: number, reason?: string): Promise<RfidApiResponse<void>> {
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

    if (this.lastStats) {
      this.lastStats.pending_guests = this.guests.filter(g => g.status === 'pending').length;
      this.notifyStatsUpdate();
    }

    return { success: true, message: 'Guest denied' };
  }

  // ----------------------------------------
  // Manual Verification - Uses real API
  // ----------------------------------------

  async verifyRfidManually(uid: string): Promise<VerificationResult> {
    try {
      const response = await apiClient.post(API_ENDPOINTS.publicRfidVerify, { uid: uid.toUpperCase() });
      const data = response.data;

      const scan: RfidScanEvent = {
        id: `scan-manual-${Date.now()}`,
        timestamp: new Date().toISOString(),
        reader_id: 'manual',
        reader_name: 'Manual Verification',
        reader_location: 'Security App',
        rfid_uid: uid.toUpperCase(),
        scan_type: 'entry',
        status: data.valid ? 'valid' : 'invalid',
        message: data.message || (data.valid ? 'Access granted' : 'RFID not registered'),
        duration: data.duration || (data.valid ? 7 : 10),
        user_name: data.user_name || data.user?.name,
        vehicle_plate: data.vehicle_plate || data.user?.vehicle_plate,
      };

      this.recentScans.unshift(scan);
      this.notifyScanUpdate();

      return {
        valid: data.valid,
        message: data.message,
        duration: data.duration,
        uid: uid.toUpperCase(),
        user_name: data.user_name || data.user?.name,
        vehicle_plate: data.vehicle_plate || data.user?.vehicle_plate,
        scan_time: data.scan_time || Date.now().toString(),
        user: data.user,
      };
    } catch (error: any) {
      console.log('Error verifying RFID:', error);
      return {
        valid: false,
        message: error?.response?.data?.message || 'Verification failed. Check connection.',
        duration: 10,
        user_name: 'N/A',
        vehicle_plate: 'N/A',
        scan_time: Date.now().toString(),
      };
    }
  }

  // ----------------------------------------
  // Dashboard Stats
  // ----------------------------------------

  async getDashboardStats(): Promise<SecurityDashboardStats> {
    // Trigger a fresh fetch if we have no stats
    if (!this.lastStats) {
      await this.fetchAndUpdate();
    }

    return this.lastStats || {
      today_entries: 0,
      today_exits: 0,
      current_parked: 0,
      active_alerts: 0,
      pending_guests: 0,
      approved_guests_today: 0,
      invalid_scans_today: 0,
    };
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
      processedIds: this.processedScanIds.size,
    };
  }

  clearData(): void {
    this.recentScans = [];
    this.alerts = [];
    this.guests = [];
    this.lastStats = null;
    this.processedScanIds.clear();
  }
}

// Export singleton instance
export const RfidSecurityService = new RfidSecurityServiceClass();
