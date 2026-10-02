import React, { useEffect, useState } from 'react';
import type { Report, ReportHistoryItem, ReportStatus, UserRole } from '../types';
import { fetchReportHistory, updateServerReportStatus } from '../services/api';
import { 
  X, 
  MapPin, 
  Clock, 
  RefreshCw, 
  AlertCircle, 
  Activity, 
  ShieldCheck, 
  Send
} from 'lucide-react';

interface ReportDetailModalProps {
  report: Report | null;
  isOpen: boolean;
  onClose: () => void;
  role: UserRole;
  isOnline: boolean;
  onStatusUpdated: (updatedReport: Report) => void;
  onRetrySync: (report: Report) => Promise<void>;
}

export const ReportDetailModal: React.FC<ReportDetailModalProps> = ({
  report,
  isOpen,
  onClose,
  role,
  isOnline,
  onStatusUpdated,
  onRetrySync
}) => {
  const [history, setHistory] = useState<ReportHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [targetStatus, setTargetStatus] = useState<ReportStatus | ''>('');
  const [statusNote, setStatusNote] = useState<string>('');
  const [statusError, setStatusError] = useState<string>('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);
  const [isRetryingSync, setIsRetryingSync] = useState<boolean>(false);

  useEffect(() => {
    if (report && isOpen) {
      setTargetStatus('');
      setStatusNote('');
      setStatusError('');
      loadHistory(report.id);
    }
  }, [report, isOpen]);

  const loadHistory = async (reportId: string) => {
    setHistoryLoading(true);
    try {
      if (isOnline) {
        const hist = await fetchReportHistory(reportId);
        setHistory(hist);
      } else {
        setHistory([]);
      }
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  if (!isOpen || !report) return null;

  // Determine permitted transitions for the coordinator based on current status
  const getAllowedTransitions = (curr: ReportStatus): ReportStatus[] => {
    switch (curr) {
      case 'DRAFT':
        return ['SUBMITTED'];
      case 'SUBMITTED':
        return ['ASSIGNED', 'REJECTED'];
      case 'ASSIGNED':
        return ['IN_PROGRESS', 'REJECTED'];
      case 'IN_PROGRESS':
        return ['RESOLVED', 'REJECTED'];
      case 'RESOLVED':
      case 'REJECTED':
      default:
        return []; // Terminal states
    }
  };

  const allowedTransitions = getAllowedTransitions(report.status);

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStatus) return;

    setStatusError('');
    setIsUpdatingStatus(true);

    try {
      const updated = await updateServerReportStatus(report.id, targetStatus as ReportStatus, statusNote);
      onStatusUpdated(updated);
      setTargetStatus('');
      setStatusNote('');
      await loadHistory(report.id);
    } catch (err: any) {
      setStatusError(err.message || 'Status transition was rejected.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleSyncRetryClick = async () => {
    setIsRetryingSync(true);
    try {
      await onRetrySync(report);
      await loadHistory(report.id);
    } finally {
      setIsRetryingSync(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container detail-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="header-meta">
              <span className={`priority-badge ${report.priority.toLowerCase()}`}>
                {report.priority}
              </span>
              <span className={`status-badge ${report.status.toLowerCase()}`}>
                {report.status.replace('_', ' ')}
              </span>
              <span className={`sync-badge ${report.sync_status.toLowerCase()}`}>
                {report.sync_status}
              </span>
            </div>
            <h2>{report.category}</h2>
            <span className="report-id-sub">UUID: {report.id}</span>
          </div>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body-scrollable">
          {/* Description Section */}
          <div className="detail-section">
            <label className="section-label">Description</label>
            <p className="detail-description">{report.description}</p>
          </div>

          {/* Location & Metadata Section */}
          <div className="detail-grid">
            <div className="detail-item">
              <div className="item-label">
                <MapPin size={14} />
                <span>Coordinates</span>
              </div>
              <div className="item-value">
                {report.latitude.toFixed(6)}, {report.longitude.toFixed(6)}
              </div>
            </div>

            <div className="detail-item">
              <div className="item-label">
                <Clock size={14} />
                <span>Reported At</span>
              </div>
              <div className="item-value">
                {new Date(report.reported_at).toLocaleString()}
              </div>
            </div>

            <div className="detail-item">
              <div className="item-label">
                <Activity size={14} />
                <span>Sync State</span>
              </div>
              <div className="item-value">
                {report.sync_status === 'SYNCED' && <span className="text-emerald">✓ Synced to Server</span>}
                {report.sync_status === 'PENDING' && <span className="text-amber">⏳ Pending Sync</span>}
                {report.sync_status === 'SYNCING' && <span className="text-blue">🔄 Syncing...</span>}
                {report.sync_status === 'FAILED' && <span className="text-rose">⚠ Failed Sync</span>}
              </div>
            </div>
          </div>

          {/* Sync Error / Retry Section for Field Workers */}
          {(report.sync_status === 'FAILED' || report.sync_status === 'PENDING') && (
            <div className="sync-retry-box">
              <div className="retry-info">
                <AlertCircle size={18} className="text-amber" />
                <div>
                  <strong>Report not yet synced with server.</strong>
                  {report.sync_error && <p className="error-note">Reason: {report.sync_error}</p>}
                </div>
              </div>
              <button
                type="button"
                className="btn-retry-action"
                onClick={handleSyncRetryClick}
                disabled={isRetryingSync || !isOnline}
              >
                <RefreshCw size={15} className={isRetryingSync ? 'spin' : ''} />
                <span>{isRetryingSync ? 'Retrying...' : 'Retry Sync'}</span>
              </button>
            </div>
          )}

          {/* Coordinator Action Panel */}
          {role === 'COORDINATOR' && (
            <div className="coordinator-panel">
              <div className="panel-title">
                <ShieldCheck size={18} />
                <span>Coordinator Status Control</span>
              </div>

              {allowedTransitions.length > 0 ? (
                <form onSubmit={handleUpdateStatus} className="status-update-form">
                  {statusError && (
                    <div className="error-banner small">
                      <AlertCircle size={14} />
                      <span>{statusError}</span>
                    </div>
                  )}

                  <div className="form-row">
                    <div className="form-group flex-1">
                      <label htmlFor="select-transition">Transition Status To:</label>
                      <select
                        id="select-transition"
                        value={targetStatus}
                        onChange={(e) => setTargetStatus(e.target.value as ReportStatus)}
                        required
                      >
                        <option value="">Select next status...</option>
                        {allowedTransitions.map((st) => (
                          <option key={st} value={st}>
                            {st.replace('_', ' ')}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group flex-2">
                      <label htmlFor="input-note">Action Note (Optional):</label>
                      <input
                        id="input-note"
                        type="text"
                        placeholder="e.g., Assigned to Maintenance Unit 2"
                        value={statusNote}
                        onChange={(e) => setStatusNote(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="status-action-row">
                    <button
                      type="submit"
                      id="btn-update-status"
                      className="btn-primary"
                      disabled={!targetStatus || isUpdatingStatus || !isOnline}
                    >
                      <Send size={14} />
                      <span>{isUpdatingStatus ? 'Updating...' : 'Apply Transition'}</span>
                    </button>
                    {!isOnline && (
                      <span className="offline-warning-txt">
                        (Coordinator updates require active connection)
                      </span>
                    )}
                  </div>
                </form>
              ) : (
                <p className="terminal-state-text">
                  This report is in a terminal status (<strong>{report.status}</strong>). No further transitions are permitted.
                </p>
              )}
            </div>
          )}

          {/* Audit Trail / History Timeline */}
          <div className="history-section">
            <label className="section-label">Audit Trail & History</label>
            {historyLoading ? (
              <div className="history-loading">Loading timeline...</div>
            ) : history.length > 0 ? (
              <div className="timeline">
                {history.map((h) => (
                  <div key={h.id} className="timeline-item">
                    <div className="timeline-marker"></div>
                    <div className="timeline-content">
                      <div className="timeline-header">
                        <span className="event-type-tag">{h.event_type}</span>
                        {h.new_value && <span className="event-value">→ {h.new_value}</span>}
                        <span className="timeline-date">{new Date(h.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}</span>
                      </div>
                      {h.message && <p className="timeline-msg">{h.message}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-history">
                <span>{isOnline ? 'No server history recorded yet.' : 'Timeline unavailable while offline.'}</span>
              </div>
            )}
          </div>
        </div>

        <div className="modal-actions border-top">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
