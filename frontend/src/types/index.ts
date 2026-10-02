export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ReportStatus = 
  | 'DRAFT' 
  | 'SUBMITTED' 
  | 'ASSIGNED' 
  | 'IN_PROGRESS' 
  | 'RESOLVED' 
  | 'REJECTED';

export type SyncStatus = 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';

export interface Report {
  id: string; // Client-generated UUID
  category: string;
  description: string;
  latitude: number;
  longitude: number;
  priority: Priority;
  status: ReportStatus;
  reported_at: string;
  created_at?: string;
  updated_at?: string;
  
  // Local synchronization state
  sync_status: SyncStatus;
  last_sync_attempt?: string;
  sync_error?: string;
}

export interface ReportHistoryItem {
  id: number;
  report_id: string;
  event_type: 'CREATED' | 'SYNCED' | 'STATUS_CHANGED' | 'SYNC_FAILED' | string;
  old_value?: string | null;
  new_value?: string | null;
  message?: string | null;
  created_at: string;
}

export type UserRole = 'FIELD_WORKER' | 'COORDINATOR';

export const CATEGORIES = [
  'Broken Water Point',
  'Damaged Equipment',
  'Service Interruption',
  'Safety Concern',
  'Maintenance Required',
  'Damaged Solar Equipment',
  'Other'
] as const;

export const PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
