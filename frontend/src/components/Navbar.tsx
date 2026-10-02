import React from 'react';
import type { UserRole } from '../types';
import { Wifi, WifiOff, RefreshCw, HardHat, ShieldCheck } from 'lucide-react';

interface NavbarProps {
  role: UserRole;
  setRole: (role: UserRole) => void;
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  onSyncNow: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  role,
  setRole,
  isOnline,
  isSyncing,
  pendingCount,
  onSyncNow
}) => {
  return (
    <header className="app-header">
      <div className="header-left">
        <div className="brand-badge">WEDER</div>
        <div className="title-group">
          <h1>Offline Field Issue Tracker</h1>
          <span className="subtitle">Infrastructure & Field Maintenance System</span>
        </div>
      </div>

      <div className="header-actions">
        {/* Role Switcher */}
        <div className="role-switcher">
          <label htmlFor="role-select" className="role-label">Active Role:</label>
          <div className="role-pill-group">
            <button
              id="role-field-worker"
              type="button"
              className={`role-pill ${role === 'FIELD_WORKER' ? 'active' : ''}`}
              onClick={() => setRole('FIELD_WORKER')}
            >
              <HardHat size={16} />
              <span>Field Worker</span>
            </button>
            <button
              id="role-coordinator"
              type="button"
              className={`role-pill ${role === 'COORDINATOR' ? 'active' : ''}`}
              onClick={() => setRole('COORDINATOR')}
            >
              <ShieldCheck size={16} />
              <span>Coordinator</span>
            </button>
          </div>
        </div>

        {/* Sync Trigger */}
        <button
          id="btn-sync-all"
          type="button"
          className="btn-sync"
          onClick={onSyncNow}
          disabled={isSyncing || !isOnline}
          title={isOnline ? 'Synchronize pending reports with backend server' : 'Offline - sync unavailable'}
        >
          <RefreshCw size={16} className={isSyncing ? 'spin' : ''} />
          <span>{isSyncing ? 'Syncing...' : 'Sync'}</span>
          {pendingCount > 0 && (
            <span className="pending-badge" title={`${pendingCount} reports pending sync`}>
              {pendingCount}
            </span>
          )}
        </button>

        {/* Online / Offline Status */}
        <div className={`status-pill ${isOnline ? 'online' : 'offline'}`} id="network-status-indicator">
          {isOnline ? (
            <>
              <span className="status-dot"></span>
              <Wifi size={15} />
              <span>Online</span>
            </>
          ) : (
            <>
              <span className="status-dot"></span>
              <WifiOff size={15} />
              <span>Offline</span>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
