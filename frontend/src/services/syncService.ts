import { 
  getPendingOrFailedReports, 
  updateReportSyncState, 
  mergeServerReports, 
  saveReportLocally
} from '../db/indexedDB';
import { postReportToServer, fetchServerReports, checkBackendHealth } from './api';
import type { Report } from '../types';

type SyncListener = () => void;
const listeners = new Set<SyncListener>();

let isSyncing = false;

export function subscribeToSync(listener: SyncListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      console.error('Error in sync listener:', e);
    }
  });
}

export function getIsSyncing(): boolean {
  return isSyncing;
}

export async function syncSingleReport(report: Report): Promise<{ success: boolean; error?: string }> {
  try {
    await updateReportSyncState(report.id, 'SYNCING');
    notifyListeners();

    const { report: syncedReport } = await postReportToServer(report);
    await saveReportLocally(syncedReport);
    notifyListeners();
    return { success: true };
  } catch (err: any) {
    const errorMsg = err?.message || 'Network error during synchronization';
    await updateReportSyncState(report.id, 'FAILED', errorMsg);
    notifyListeners();
    return { success: false, error: errorMsg };
  }
}

export async function runFullSync(): Promise<{ total: number; succeeded: number; failed: number }> {
  if (isSyncing) {
    return { total: 0, succeeded: 0, failed: 0 };
  }

  isSyncing = true;
  notifyListeners();

  let succeeded = 0;
  let failed = 0;
  let pendingReports: Report[] = [];

  try {
    const isOnline = navigator.onLine && (await checkBackendHealth());
    if (!isOnline) {
      isSyncing = false;
      notifyListeners();
      return { total: 0, succeeded: 0, failed: 0 };
    }

    pendingReports = await getPendingOrFailedReports();

    for (const report of pendingReports) {
      const res = await syncSingleReport(report);
      if (res.success) {
        succeeded++;
      } else {
        failed++;
      }
    }

    try {
      const serverReports = await fetchServerReports();
      await mergeServerReports(serverReports);
    } catch (serverErr) {
      console.warn('Could not refresh server reports after sync:', serverErr);
    }

  } catch (e) {
    console.error('Global sync execution error:', e);
  } finally {
    isSyncing = false;
    notifyListeners();
  }

  return { total: pendingReports.length, succeeded, failed };
}

export function initializeSyncListeners() {
  window.addEventListener('online', () => {
    console.log('Browser online event detected. Initiating background sync...');
    runFullSync();
  });

  setTimeout(() => {
    runFullSync();
  }, 1000);
}
