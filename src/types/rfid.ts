// RFID Types for VALET Parking App
// Used by Admin and Security roles for RFID management and monitoring

// ============================================
// Core Data Models
// ============================================

export type RfidTagStatus = 'active' | 'expired' | 'suspended' | 'lost';
export type GuestAccessStatus = 'pending' | 'approved' | 'denied' | 'expired' | 'checked_in' | 'checked_out';
export type ParkingEntryStatus = 'active' | 'completed' | 'cancelled';
export type ScanStatus = 'valid' | 'invalid' | 'expired' | 'unknown';
export type ReaderStatus = 'online' | 'offline' | 'error';
export type AlertType = 'invalid_rfid' | 'expired_rfid' | 'suspended_rfid' | 'unknown_rfid' | 'suspicious_activity';

export interface RfidTag {
  id: number;
  uid: string;
  user_id: number | null;
  vehicle_id: number | null;
  status: RfidTagStatus;
  expiry_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields from relationships
  user_name?: string;
  user_email?: string;
  user_employee_id?: string;
  vehicle_plate?: string;
  vehicle_model?: string;
  vehicle_color?: string;
}

export interface GuestAccess {
  id: number;
  guest_id: string;
  name: string;
  vehicle_plate: string;
  phone: string;
  purpose: string;
  valid_from: string;
  valid_until: string;
  status: GuestAccessStatus;
  approved_by: number | null;
  approved_by_name?: string;
  notes: string | null;
  created_by: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface ParkingEntry {
  id: number;
  entry_type: 'rfid' | 'guest' | 'manual';
  rfid_tag_id: number | null;
  guest_access_id: number | null;
  user_id: number | null;
  vehicle_plate: string;
  entry_time: string;
  exit_time: string | null;
  duration_minutes: number | null;
  status: ParkingEntryStatus;
  entry_gate_mac: string | null;
  exit_gate_mac: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  user_name?: string;
  rfid_uid?: string;
  guest_name?: string;
}

export interface RfidScanEvent {
  id: string;
  timestamp: string;
  reader_id: string;
  reader_name?: string;
  reader_location?: string;
  rfid_uid: string;
  scan_type: 'entry' | 'exit';
  status: ScanStatus;
  message: string;
  duration?: number; // seconds gate stays open
  // Associated data if found
  tag?: RfidTag;
  user_name?: string;
  vehicle_plate?: string;
}

export interface RfidReader {
  id: string;
  mac_address: string;
  name: string;
  location: string;
  type: 'entry' | 'exit';
  status: ReaderStatus;
  last_heartbeat: string;
  scan_count_today: number;
  error_count_today: number;
  firmware_version?: string;
  ip_address?: string;
}

export interface RfidAlert {
  id: string;
  scan_event_id: string;
  scan_event: RfidScanEvent;
  alert_type: AlertType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  acknowledged: boolean;
  acknowledged_by: number | null;
  acknowledged_by_name?: string;
  acknowledged_at: string | null;
  notes: string | null;
  created_at: string;
}

// ============================================
// Form & Input Types
// ============================================

export interface RfidTagFormData {
  uid: string;
  user_id?: number;
  vehicle_id?: number;
  expiry_date?: string;
  status: RfidTagStatus;
  notes?: string;
}

export interface GuestAccessFormData {
  name: string;
  vehicle_plate: string;
  phone: string;
  purpose: string;
  valid_from: string;
  valid_until: string;
  notes?: string;
}

export interface ManualEntryFormData {
  vehicle_plate: string;
  entry_type: 'manual';
  notes?: string;
}

// ============================================
// Filter & Query Types
// ============================================

export interface RfidTagFilters {
  status?: RfidTagStatus;
  search?: string; // Search by UID, user name, or vehicle plate
  expiring_soon?: boolean; // Tags expiring within 30 days
  user_id?: number;
}

export interface ScanHistoryFilters {
  from_date?: string;
  to_date?: string;
  status?: ScanStatus;
  scan_type?: 'entry' | 'exit';
  reader_id?: string;
  search?: string; // Search by UID or vehicle plate
}

export interface GuestFilters {
  status?: GuestAccessStatus;
  search?: string;
  date?: string; // Filter by validity date
}

export interface AlertFilters {
  acknowledged?: boolean;
  alert_type?: AlertType;
  severity?: RfidAlert['severity'];
  from_date?: string;
  to_date?: string;
}

// ============================================
// Statistics & Dashboard Types
// ============================================

export interface RfidDashboardStats {
  total_tags: number;
  active_tags: number;
  expired_tags: number;
  suspended_tags: number;
  lost_tags: number;
  expiring_soon: number; // Within 30 days
  readers_online: number;
  readers_offline: number;
  readers_error: number;
  today_entries: number;
  today_exits: number;
  today_invalid_scans: number;
  current_parked: number;
}

export interface SecurityDashboardStats {
  today_entries: number;
  today_exits: number;
  current_parked: number;
  active_alerts: number;
  pending_guests: number;
  approved_guests_today: number;
  invalid_scans_today: number;
  last_scan?: RfidScanEvent;
}

export interface ReaderStats {
  reader_id: string;
  reader_name: string;
  total_scans: number;
  successful_scans: number;
  failed_scans: number;
  uptime_percentage: number;
}

// ============================================
// API Response Types
// ============================================

export interface RfidApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

export interface VerificationResult {
  valid: boolean;
  message: string;
  duration: number;
  uid?: string;
  user_name?: string;
  vehicle_plate?: string;
  scan_time: string;
  user?: {
    name: string;
    vehicle_plate: string;
    entry_time?: string;
  };
}

// ============================================
// Service Callback Types
// ============================================

export type ScanUpdateCallback = (scans: RfidScanEvent[]) => void;
export type AlertCallback = (alerts: RfidAlert[]) => void;
export type ConnectionStatusCallback = (status: 'connected' | 'disconnected' | 'error') => void;
export type StatsUpdateCallback = (stats: SecurityDashboardStats) => void;

// ============================================
// Type Guards
// ============================================

export const isRfidTagStatus = (value: string): value is RfidTagStatus => {
  return ['active', 'expired', 'suspended', 'lost'].includes(value);
};

export const isScanStatus = (value: string): value is ScanStatus => {
  return ['valid', 'invalid', 'expired', 'unknown'].includes(value);
};

export const isGuestAccessStatus = (value: string): value is GuestAccessStatus => {
  return ['pending', 'approved', 'denied', 'expired', 'checked_in', 'checked_out'].includes(value);
};

export const isAlertType = (value: string): value is AlertType => {
  return ['invalid_rfid', 'expired_rfid', 'suspended_rfid', 'unknown_rfid', 'suspicious_activity'].includes(value);
};

// ============================================
// Utility Functions
// ============================================

export const getStatusColor = (status: RfidTagStatus | ScanStatus | GuestAccessStatus): string => {
  const colorMap: Record<string, string> = {
    // RfidTagStatus
    active: '#48D666',
    expired: '#FF6B6B',
    suspended: '#FF9801',
    lost: '#9E9E9E',
    // ScanStatus
    valid: '#48D666',
    invalid: '#FF6B6B',
    unknown: '#9E9E9E',
    // GuestAccessStatus
    pending: '#FF9801',
    approved: '#48D666',
    denied: '#FF6B6B',
    checked_in: '#2196F3',
    checked_out: '#9E9E9E',
  };
  return colorMap[status] || '#9E9E9E';
};

export const getReaderStatusColor = (status: ReaderStatus): string => {
  switch (status) {
    case 'online': return '#48D666';
    case 'offline': return '#9E9E9E';
    case 'error': return '#FF6B6B';
    default: return '#9E9E9E';
  }
};

export const getAlertSeverityColor = (severity: RfidAlert['severity']): string => {
  switch (severity) {
    case 'low': return '#2196F3';
    case 'medium': return '#FF9801';
    case 'high': return '#FF6B6B';
    case 'critical': return '#B22020';
    default: return '#9E9E9E';
  }
};

export const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

export const isTagExpiringSoon = (expiryDate: string | null, daysThreshold: number = 30): boolean => {
  if (!expiryDate) return false;
  const expiry = new Date(expiryDate);
  const now = new Date();
  const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays > 0 && diffDays <= daysThreshold;
};
