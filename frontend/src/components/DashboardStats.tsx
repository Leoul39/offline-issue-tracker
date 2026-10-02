import React from 'react';
import type { Report } from '../types';
import { FileText, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface DashboardStatsProps {
  reports: Report[];
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ reports }) => {
  const total = reports.length;
  const pendingSync = reports.filter(r => r.sync_status === 'PENDING' || r.sync_status === 'FAILED').length;
  const inProgress = reports.filter(r => r.status === 'IN_PROGRESS' || r.status === 'ASSIGNED').length;
  const resolved = reports.filter(r => r.status === 'RESOLVED').length;

  return (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-icon-wrapper blue">
          <FileText size={20} />
        </div>
        <div className="stat-details">
          <span className="stat-label">Total Reports</span>
          <span className="stat-value" id="stat-total-reports">{total}</span>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon-wrapper amber">
          <Clock size={20} />
        </div>
        <div className="stat-details">
          <span className="stat-label">Pending Sync</span>
          <span className="stat-value" id="stat-pending-sync">{pendingSync}</span>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon-wrapper purple">
          <AlertTriangle size={20} />
        </div>
        <div className="stat-details">
          <span className="stat-label">Active / In Progress</span>
          <span className="stat-value" id="stat-in-progress">{inProgress}</span>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon-wrapper emerald">
          <CheckCircle2 size={20} />
        </div>
        <div className="stat-details">
          <span className="stat-label">Resolved Issues</span>
          <span className="stat-value" id="stat-resolved">{resolved}</span>
        </div>
      </div>
    </div>
  );
};
