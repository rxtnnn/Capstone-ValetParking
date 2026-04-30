import { COLORS } from './AppConst';

export type UserRole = 'admin' | 'security' | 'ssd';

export type QuickActionConfig = {
  key: string;
  title: string;
  icon: string;
  color: string;
  screen: string;
  roles: UserRole[];
  isVerify?: boolean;
};

export const QUICK_ACTIONS: QuickActionConfig[] = [
  {
    key: 'view_tags',
    title: 'View All Tags',
    icon: 'list',
    color: COLORS.blue,
    screen: 'RfidTagList',
    roles: ['admin'],
  },
  {
    key: 'live_monitor',
    title: 'Live Monitor',
    icon: 'radio',
    color: COLORS.primary,
    screen: 'ScanMonitor',
    roles: ['admin', 'security', 'ssd'],
  },
  {
    key: 'view_alerts',
    title: 'View Alerts',
    icon: 'alert-circle',
    color: '#FF6B6B',
    screen: 'AlertsScreen',
    roles: ['admin', 'security', 'ssd'],
  },
  {
    key: 'guest_requests',
    title: 'Guest Requests',
    icon: 'people',
    color: COLORS.limited,
    screen: 'GuestManagement',
    roles: ['admin', 'security', 'ssd'],
  },
  {
    key: 'scan_history',
    title: 'Scan History',
    icon: 'time',
    color: COLORS.blue,
    screen: 'ScanHistory',
    roles: ['admin', 'security', 'ssd'],
  },
  {
    key: 'verify_vehicle',
    title: 'Verify Vehicle',
    icon: 'search',
    color: '#9C27B0',
    screen: '',
    isVerify: true,
    roles: ['admin', 'security', 'ssd'],
  },
  {
    key: 'file_incident',
    title: 'File Incident',
    icon: 'warning',
    color: '#E65100',
    screen: 'IncidentReport',
    roles: ['admin', 'security', 'ssd'],
  },
  {
    key: 'incident_log',
    title: 'Incident Log',
    icon: 'document-text',
    color: '#5C6BC0',
    screen: 'IncidentLog',
    roles: ['admin', 'security', 'ssd'],
  },
];

export const getQuickActionsForRole = (role: UserRole): QuickActionConfig[] =>
  QUICK_ACTIONS.filter((action) => action.roles.includes(role));
