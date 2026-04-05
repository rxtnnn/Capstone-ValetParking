export type IncidentCategory =
  | 'debris'
  | 'damaged'
  | 'blocked'
  | 'light_issue'
  | 'sensor_issue'
  | 'other';

export type IncidentStatus = 'open' | 'in_progress' | 'resolved';

export const INCIDENT_CATEGORY_LABELS: Record<IncidentCategory, string> = {
  debris: 'Debris / Obstruction',
  damaged: 'Damaged Spot',
  blocked: 'Blocked Area',
  light_issue: 'Light Issue',
  sensor_issue: 'Sensor Issue',
  other: 'Other',
};

export const INCIDENT_STATUS_LABELS: Record<IncidentStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
};

export const INCIDENT_STATUS_COLORS: Record<IncidentStatus, string> = {
  open: '#FF6B6B',
  in_progress: '#FF9801',
  resolved: '#48D666',
};

export const FLOOR_LEVELS = [
  '1st Floor',
  '2nd Floor',
  '3rd Floor',
  '4th Floor',
  'Basement',
  'Rooftop',
];

export interface Incident {
  id: number;
  floor_level: string;
  category: IncidentCategory;
  space_code: string | null;
  incident_at: string | null;
  involved_party: string | null;
  notes: string | null;
  action_taken: string | null;
  status: IncidentStatus;
  reported_by: number;
  reported_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface IncidentFormData {
  floor_level: string;
  category: IncidentCategory;
  space_code?: string;
  incident_at?: string;
  involved_party?: string;
  notes?: string;
  action_taken?: string;
}

export interface IncidentListMeta {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
}

export interface IncidentListResponse {
  success: boolean;
  data: Incident[];
  meta: IncidentListMeta;
}

export interface IncidentFilters {
  status?: IncidentStatus;
  category?: IncidentCategory;
  floor_level?: string;
  date?: string;
  per_page?: number;
  page?: number;
}
