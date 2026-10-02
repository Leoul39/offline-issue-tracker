import type { Report, SyncStatus } from '../types';

const DB_NAME = 'offline_tracker_db';
const DB_VERSION = 1;
const STORE_NAME = 'reports';

export function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB is not supported in this environment'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('sync_status', 'sync_status', { unique: false });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('reported_at', 'reported_at', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveReportLocally(report: Report): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(report);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getReportLocally(id: string): Promise<Report | undefined> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(id);

    req.onsuccess = () => resolve(req.result as Report | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllReportsLocally(): Promise<Report[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();

    req.onsuccess = () => {
      const reports = (req.result as Report[]) || [];
      reports.sort((a, b) => new Date(b.reported_at).getTime() - new Date(a.reported_at).getTime());
      resolve(reports);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getPendingOrFailedReports(): Promise<Report[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();

    req.onsuccess = () => {
      const all = (req.result as Report[]) || [];
      const pending = all.filter(r => r.sync_status === 'PENDING' || r.sync_status === 'FAILED');
      resolve(pending);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function updateReportSyncState(
  id: string, 
  sync_status: SyncStatus, 
  error?: string
): Promise<void> {
  const existing = await getReportLocally(id);
  if (!existing) return;

  existing.sync_status = sync_status;
  existing.last_sync_attempt = new Date().toISOString();
  if (error !== undefined) {
    existing.sync_error = error;
  } else if (sync_status === 'SYNCED') {
    existing.sync_error = undefined;
  }

  await saveReportLocally(existing);
}

export async function mergeServerReports(serverReports: Array<Omit<Report, 'sync_status'>>): Promise<void> {
  const localReports = await getAllReportsLocally();
  const localMap = new Map(localReports.map(r => [r.id, r]));

  for (const sRep of serverReports) {
    const existing = localMap.get(sRep.id);
    if (existing) {
      if (existing.sync_status === 'PENDING' || existing.sync_status === 'FAILED') {
        continue;
      }
      await saveReportLocally({
        ...sRep,
        sync_status: 'SYNCED',
        last_sync_attempt: existing.last_sync_attempt
      });
    } else {
      await saveReportLocally({
        ...sRep,
        sync_status: 'SYNCED'
      });
    }
  }
}
