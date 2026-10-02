import React from 'react';
import { CloudOff, AlertCircle } from 'lucide-react';

interface OfflineBannerProps {
  isOnline: boolean;
  pendingCount: number;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ isOnline, pendingCount }) => {
  if (isOnline && pendingCount === 0) {
    return null;
  }

  if (!isOnline) {
    return (
      <div className="offline-alert-banner" role="alert" id="offline-alert-banner">
        <CloudOff size={18} className="banner-icon" />
        <div className="banner-content">
          <strong>Operating in Offline Mode.</strong> Reports created now are safely preserved in your browser's persistent IndexedDB and will automatically synchronize when connectivity is restored.
        </div>
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <div className="sync-pending-banner" role="status" id="sync-pending-banner">
        <AlertCircle size={18} className="banner-icon" />
        <div className="banner-content">
          You have <strong>{pendingCount} report{pendingCount > 1 ? 's' : ''}</strong> waiting to synchronize. Click <em>"Sync"</em> or wait for automatic background sync.
        </div>
      </div>
    );
  }

  return null;
};
