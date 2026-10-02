import React, { useState, useEffect, useCallback } from 'react';
import type { Report, UserRole } from './types';
import { 
  getAllReportsLocally, 
  saveReportLocally, 
  openDatabase
} from './db/indexedDB';
import { 
  runFullSync, 
  syncSingleReport, 
  subscribeToSync, 
  initializeSyncListeners,
  getIsSyncing
} from './services/syncService';
import { checkBackendHealth } from './services/api';
import { Navbar } from './components/Navbar';
import { OfflineBanner } from './components/OfflineBanner';
import { DashboardStats } from './components/DashboardStats';
import { ReportList } from './components/ReportList';
import { CreateReportModal } from './components/CreateReportModal';
import { ReportDetailModal } from './components/ReportDetailModal';

export const App: React.FC = () => {
  const [role, setRole] = useState<UserRole>('FIELD_WORKER');
  const [reports, setReports] = useState<Report[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Reload all reports directly from IndexedDB
  const reloadReports = useCallback(async () => {
    try {
      const local = await getAllReportsLocally();
      setReports(local);

      // Keep selected report updated if it's currently open
      if (selectedReport) {
        const fresh = local.find(r => r.id === selectedReport.id);
        if (fresh) {
          setSelectedReport(fresh);
        }
      }
    } catch (err) {
      console.error('Error reading reports from IndexedDB:', err);
    }
  }, [selectedReport]);

  // Monitor network status
  useEffect(() => {
    const handleOnline = async () => {
      const healthy = await checkBackendHealth();
      setIsOnline(healthy);
      if (healthy) {
        showToast('Connection restored. Initiating automatic sync...', 'success');
        await runFullSync();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      showToast('Switched to offline mode. All changes saved locally.', 'info');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    checkBackendHealth().then((healthy) => {
      setIsOnline(navigator.onLine && healthy);
    });

    const healthInterval = setInterval(async () => {
      if (navigator.onLine) {
        const healthy = await checkBackendHealth();
        setIsOnline(healthy);
      } else {
        setIsOnline(false);
      }
    }, 15000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(healthInterval);
    };
  }, []);

  // Initialize IndexedDB and sync listeners on startup
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const init = async () => {
      try {
        await openDatabase();
        await reloadReports();
        initializeSyncListeners();

        unsubscribe = subscribeToSync(() => {
          setIsSyncing(getIsSyncing());
          reloadReports();
        });

        // Trigger startup sync
        runFullSync();
      } catch (err) {
        console.error('Failed to initialize app storage:', err);
      }
    };

    init();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [reloadReports]);

  // Create report handler (Offline-first!)
  const handleCreateReport = async (newReport: Report) => {
    // 1. Immediately persist to IndexedDB
    await saveReportLocally(newReport);
    await reloadReports();

    if (!isOnline) {
      showToast('Report saved locally! Waiting for network connectivity to synchronize.', 'info');
      return;
    }

    // 2. If online, attempt background sync immediately
    showToast('Report saved locally. Synchronizing with server...', 'info');
    const result = await syncSingleReport(newReport);
    if (result.success) {
      showToast('Report synchronized successfully with server!', 'success');
    } else {
      showToast(`Saved locally, but sync failed: ${result.error}`, 'error');
    }
    await reloadReports();
  };

  // Status update handler (Coordinator)
  const handleStatusUpdated = async (updated: Report) => {
    await saveReportLocally(updated);
    await reloadReports();
    setSelectedReport(updated);
    showToast(`Status updated to ${updated.status}.`, 'success');
  };

  // Manual retry handler
  const handleRetrySync = async (report: Report) => {
    showToast(`Retrying sync for #${report.id.substring(0, 8)}...`, 'info');
    const result = await syncSingleReport(report);
    if (result.success) {
      showToast('Synchronization completed successfully!', 'success');
    } else {
      showToast(`Synchronization failed: ${result.error}`, 'error');
    }
    await reloadReports();
  };

  // Manual full sync trigger
  const handleManualFullSync = async () => {
    showToast('Starting full synchronization...', 'info');
    const res = await runFullSync();
    if (res.total === 0) {
      showToast('All reports are up to date with server.', 'info');
    } else if (res.failed === 0) {
      showToast(`Synchronized ${res.succeeded} pending report(s) successfully!`, 'success');
    } else {
      showToast(`Sync finished: ${res.succeeded} succeeded, ${res.failed} failed.`, 'error');
    }
    await reloadReports();
  };

  const pendingCount = reports.filter(
    r => r.sync_status === 'PENDING' || r.sync_status === 'FAILED'
  ).length;

  return (
    <div className="app-layout">
      <Navbar
        role={role}
        setRole={setRole}
        isOnline={isOnline}
        isSyncing={isSyncing}
        pendingCount={pendingCount}
        onSyncNow={handleManualFullSync}
      />

      <OfflineBanner isOnline={isOnline} pendingCount={pendingCount} />

      <main className="main-content">
        <DashboardStats reports={reports} />

        <ReportList
          reports={reports}
          role={role}
          onSelectReport={(rep) => setSelectedReport(rep)}
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
          onRetrySync={handleRetrySync}
          isOnline={isOnline}
        />
      </main>

      {/* Create Modal */}
      <CreateReportModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateReport}
        isOnline={isOnline}
      />

      {/* Details / Coordinator Modal */}
      <ReportDetailModal
        report={selectedReport}
        isOpen={!!selectedReport}
        onClose={() => setSelectedReport(null)}
        role={role}
        isOnline={isOnline}
        onStatusUpdated={handleStatusUpdated}
        onRetrySync={handleRetrySync}
      />

      {/* Notification Toast */}
      {toast && (
        <div className={`toast-notification ${toast.type}`} role="status">
          <span>{toast.message}</span>
          <button className="toast-close" onClick={() => setToast(null)}>×</button>
        </div>
      )}
    </div>
  );
};

export default App;
