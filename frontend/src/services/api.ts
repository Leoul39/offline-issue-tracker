import type { Report, ReportHistoryItem, ReportStatus } from '../types';

const API_BASE = 'http://localhost:8000/api';

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch('http://localhost:8000/health', {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(3000)
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.status === 'healthy';
  } catch {
    return false;
  }
}

export async function fetchServerReports(): Promise<Report[]> {
  const res = await fetch(`${API_BASE}/reports`, {
    signal: AbortSignal.timeout(6000)
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch reports from server: ${res.statusText}`);
  }
  const rawList = await res.json();
  return rawList.map((r: any) => ({
    ...r,
    sync_status: 'SYNCED' as const
  }));
}

export async function postReportToServer(report: Report): Promise<{ report: Report; is_duplicate?: boolean }> {
  const payload = {
    id: report.id,
    category: report.category,
    description: report.description,
    latitude: report.latitude,
    longitude: report.longitude,
    priority: report.priority,
    status: report.status,
    reported_at: report.reported_at
  };

  const res = await fetch(`${API_BASE}/reports/${report.id}/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(8000)
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    const message = errorBody?.detail?.message || errorBody?.detail || `Server returned ${res.status}: ${res.statusText}`;
    throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
  }

  const data = await res.json();
  return {
    report: { ...data.report, sync_status: 'SYNCED' },
    is_duplicate: data.is_duplicate
  };
}

export async function updateServerReportStatus(
  reportId: string, 
  status: ReportStatus, 
  note?: string
): Promise<Report> {
  const res = await fetch(`${API_BASE}/reports/${reportId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ status, note }),
    signal: AbortSignal.timeout(6000)
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const detail = errData.detail;
    if (detail && typeof detail === 'object' && detail.message) {
      throw new Error(detail.message);
    }
    throw new Error(typeof detail === 'string' ? detail : `Status update failed (${res.status})`);
  }

  const updated = await res.json();
  return { ...updated, sync_status: 'SYNCED' };
}

export async function fetchReportHistory(reportId: string): Promise<ReportHistoryItem[]> {
  const res = await fetch(`${API_BASE}/reports/${reportId}/history`, {
    signal: AbortSignal.timeout(6000)
  });

  if (!res.ok) {
    throw new Error(`Failed to load history: ${res.statusText}`);
  }

  return res.json();
}
