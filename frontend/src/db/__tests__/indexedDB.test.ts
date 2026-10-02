import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { 
  saveReportLocally, 
  getReportLocally, 
  getAllReportsLocally, 
  getPendingOrFailedReports,
  updateReportSyncState,
  mergeServerReports
} from '../indexedDB';
import type { Report } from '../../types';

describe('IndexedDB Offline Persistence Service', () => {
  const sampleReport: Report = {
    id: '11111111-2222-3333-4444-555555555555',
    category: 'Broken Water Point',
    description: 'Community borehole hand pump handle broken in Sector 4.',
    latitude: 9.032,
    longitude: 38.746,
    priority: 'HIGH',
    status: 'SUBMITTED',
    reported_at: new Date('2026-10-01T10:00:00Z').toISOString(),
    sync_status: 'PENDING'
  };

  it('persists report locally in IndexedDB', async () => {
    await saveReportLocally(sampleReport);
    const retrieved = await getReportLocally(sampleReport.id);

    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(sampleReport.id);
    expect(retrieved?.category).toBe('Broken Water Point');
    expect(retrieved?.sync_status).toBe('PENDING');
  });

  it('retrieves all locally stored reports sorted newest first', async () => {
    const olderReport: Report = {
      ...sampleReport,
      id: '22222222-3333-4444-5555-666666666666',
      reported_at: new Date('2026-09-25T10:00:00Z').toISOString(),
      sync_status: 'SYNCED'
    };
    await saveReportLocally(olderReport);

    const all = await getAllReportsLocally();
    expect(all.length).toBeGreaterThanOrEqual(2);
    expect(new Date(all[0].reported_at).getTime()).toBeGreaterThanOrEqual(
      new Date(all[1].reported_at).getTime()
    );
  });

  it('filters pending or failed synchronization reports', async () => {
    const pendingList = await getPendingOrFailedReports();
    expect(pendingList.some(r => r.id === sampleReport.id)).toBe(true);
    expect(pendingList.every(r => r.sync_status === 'PENDING' || r.sync_status === 'FAILED')).toBe(true);
  });

  it('updates synchronization status to SYNCED', async () => {
    await updateReportSyncState(sampleReport.id, 'SYNCED');
    const updated = await getReportLocally(sampleReport.id);

    expect(updated?.sync_status).toBe('SYNCED');
    expect(updated?.last_sync_attempt).toBeDefined();
    expect(updated?.sync_error).toBeUndefined();
  });

  it('records synchronization failure with error message', async () => {
    await updateReportSyncState(sampleReport.id, 'FAILED', 'Connection refused (ECONNREFUSED)');
    const failed = await getReportLocally(sampleReport.id);

    expect(failed?.sync_status).toBe('FAILED');
    expect(failed?.sync_error).toContain('ECONNREFUSED');
  });

  it('merges server reports without overwriting local unsynced pending drafts', async () => {
    const localDraft: Report = {
      id: 'draft-9999-0000-1111-222222222222',
      category: 'Safety Concern',
      description: 'Unsynced local draft description',
      latitude: 9.0,
      longitude: 38.0,
      priority: 'CRITICAL',
      status: 'SUBMITTED',
      reported_at: new Date().toISOString(),
      sync_status: 'PENDING'
    };
    await saveReportLocally(localDraft);

    await mergeServerReports([
      {
        id: localDraft.id,
        category: 'Safety Concern',
        description: 'Server version',
        latitude: 9.0,
        longitude: 38.0,
        priority: 'CRITICAL',
        status: 'RESOLVED',
        reported_at: localDraft.reported_at
      }
    ]);

    const protectedDraft = await getReportLocally(localDraft.id);
    expect(protectedDraft?.sync_status).toBe('PENDING');
    expect(protectedDraft?.description).toBe('Unsynced local draft description');
  });
});
