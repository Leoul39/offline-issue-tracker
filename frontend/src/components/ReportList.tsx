import React, { useState, useMemo } from 'react';
import { CATEGORIES, PRIORITIES } from '../types';
import type { Report } from '../types';
import { 
  Search, 
  Filter, 
  Plus, 
  MapPin, 
  Clock, 
  RefreshCw, 
  ExternalLink 
} from 'lucide-react';

interface ReportListProps {
  reports: Report[];
  role: string;
  onSelectReport: (report: Report) => void;
  onOpenCreateModal: () => void;
  onRetrySync: (report: Report) => void;
  isOnline: boolean;
}

export const ReportList: React.FC<ReportListProps> = ({
  reports,
  onSelectReport,
  onOpenCreateModal,
  onRetrySync,
  isOnline
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedSyncStatus, setSelectedSyncStatus] = useState<string>('ALL');

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      // Search
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesCategory = report.category.toLowerCase().includes(term);
        const matchesDesc = report.description.toLowerCase().includes(term);
        const matchesId = report.id.toLowerCase().includes(term);
        if (!matchesCategory && !matchesDesc && !matchesId) {
          return false;
        }
      }

      // Category
      if (selectedCategory !== 'ALL' && report.category !== selectedCategory) {
        return false;
      }

      // Priority
      if (selectedPriority !== 'ALL' && report.priority !== selectedPriority) {
        return false;
      }

      // Status
      if (selectedStatus !== 'ALL' && report.status !== selectedStatus) {
        return false;
      }

      // Sync status
      if (selectedSyncStatus !== 'ALL' && report.sync_status !== selectedSyncStatus) {
        return false;
      }

      return true;
    });
  }, [reports, searchTerm, selectedCategory, selectedPriority, selectedStatus, selectedSyncStatus]);

  return (
    <div className="report-list-container">
      {/* Action Header & Filter Controls */}
      <div className="list-controls-bar">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            id="search-input"
            type="text"
            placeholder="Search reports by description, category, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="btn-clear-search" onClick={() => setSearchTerm('')}>
              ×
            </button>
          )}
        </div>

        <div className="filter-group">
          <div className="select-wrapper">
            <select
              id="filter-category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="ALL">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="select-wrapper">
            <select
              id="filter-priority"
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
            >
              <option value="ALL">All Priorities</option>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="select-wrapper">
            <select
              id="filter-status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="SUBMITTED">SUBMITTED</option>
              <option value="ASSIGNED">ASSIGNED</option>
              <option value="IN_PROGRESS">IN PROGRESS</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </div>

          <div className="select-wrapper">
            <select
              id="filter-sync"
              value={selectedSyncStatus}
              onChange={(e) => setSelectedSyncStatus(e.target.value)}
            >
              <option value="ALL">All Sync States</option>
              <option value="SYNCED">Synced</option>
              <option value="PENDING">Pending Sync</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
        </div>

        <button
          id="btn-new-report"
          type="button"
          className="btn-primary btn-add-report"
          onClick={onOpenCreateModal}
        >
          <Plus size={18} />
          <span>New Report</span>
        </button>
      </div>

      {/* Reports Grid */}
      {filteredReports.length === 0 ? (
        <div className="empty-state-box">
          <Filter size={36} className="empty-icon" />
          <h3>No reports found</h3>
          <p>
            {searchTerm || selectedCategory !== 'ALL' || selectedPriority !== 'ALL' || selectedStatus !== 'ALL'
              ? 'Try changing or clearing your search filters.'
              : 'No issues logged yet. Click "New Report" to register your first field problem.'}
          </p>
          {(searchTerm || selectedCategory !== 'ALL' || selectedPriority !== 'ALL' || selectedStatus !== 'ALL') && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('ALL');
                setSelectedPriority('ALL');
                setSelectedStatus('ALL');
                setSelectedSyncStatus('ALL');
              }}
            >
              Clear All Filters
            </button>
          )}
        </div>
      ) : (
        <div className="reports-grid">
          {filteredReports.map((report) => (
            <div
              key={report.id}
              className={`report-card ${report.sync_status.toLowerCase()}`}
              onClick={() => onSelectReport(report)}
            >
              <div className="card-top">
                <div className="badges-row">
                  <span className={`priority-badge ${report.priority.toLowerCase()}`}>
                    {report.priority}
                  </span>
                  <span className={`status-badge ${report.status.toLowerCase()}`}>
                    {report.status.replace('_', ' ')}
                  </span>
                  <span className={`sync-badge ${report.sync_status.toLowerCase()}`}>
                    {report.sync_status === 'SYNCED' && '✓ Synced'}
                    {report.sync_status === 'PENDING' && '⏳ Pending'}
                    {report.sync_status === 'SYNCING' && '🔄 Syncing'}
                    {report.sync_status === 'FAILED' && '⚠ Failed'}
                  </span>
                </div>
              </div>

              <h3 className="card-title">{report.category}</h3>
              <p className="card-description">{report.description}</p>

              <div className="card-meta">
                <div className="meta-item">
                  <MapPin size={13} />
                  <span>{report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}</span>
                </div>
                <div className="meta-item">
                  <Clock size={13} />
                  <span>{new Date(report.reported_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>

              <div className="card-footer">
                <span className="card-id-preview">#{report.id.substring(0, 8)}</span>

                <div className="card-actions">
                  {(report.sync_status === 'FAILED' || report.sync_status === 'PENDING') && (
                    <button
                      type="button"
                      className="btn-card-retry"
                      title="Retry sync for this report"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRetrySync(report);
                      }}
                      disabled={!isOnline}
                    >
                      <RefreshCw size={13} />
                      <span>Retry</span>
                    </button>
                  )}
                  <span className="view-details-prompt">
                    Details <ExternalLink size={12} />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
