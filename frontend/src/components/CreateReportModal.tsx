import React, { useState } from 'react';
import { CATEGORIES, PRIORITIES } from '../types';
import type { Priority, Report } from '../types';
import { X, MapPin, Compass, AlertCircle } from 'lucide-react';

interface CreateReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (report: Report) => Promise<void>;
  isOnline: boolean;
}

const PRESET_LOCATIONS = [
  { name: 'Addis Ababa (Center)', lat: 9.0320, lon: 38.7460 },
  { name: 'Adama / Nazret', lat: 8.5400, lon: 39.2700 },
  { name: 'Hawassa Post', lat: 7.0504, lon: 38.4955 },
  { name: 'Bahir Dar Station', lat: 11.5936, lon: 37.3908 },
  { name: 'Dire Dawa Junction', lat: 9.6009, lon: 41.8501 },
];

export const CreateReportModal: React.FC<CreateReportModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isOnline
}) => {
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [description, setDescription] = useState<string>('');
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [latitude, setLatitude] = useState<string>('9.0320');
  const [longitude, setLongitude] = useState<string>('38.7460');
  const [locationStatus, setLocationStatus] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  if (!isOpen) return null;

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('Geolocation is not supported by your browser.');
      return;
    }

    setLocationStatus('Acquiring GPS coordinates...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setLocationStatus('GPS coordinates acquired successfully.');
      },
      (err) => {
        setLocationStatus(`Could not acquire location: ${err.message}. Please enter manually or select a preset.`);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handlePresetSelect = (lat: number, lon: number) => {
    setLatitude(lat.toFixed(6));
    setLongitude(lon.toFixed(6));
    setLocationStatus('Location preset loaded.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Frontend validation
    if (!category.trim()) {
      setErrorMessage('Please select an issue category.');
      return;
    }
    if (description.trim().length < 5) {
      setErrorMessage('Description must be at least 5 characters long.');
      return;
    }

    const latNum = parseFloat(latitude);
    const lonNum = parseFloat(longitude);

    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      setErrorMessage('Latitude must be a valid number between -90 and 90.');
      return;
    }

    if (isNaN(lonNum) || lonNum < -180 || lonNum > 180) {
      setErrorMessage('Longitude must be a valid number between -180 and 180.');
      return;
    }

    setIsSubmitting(true);

    try {
      const newReport: Report = {
        id: crypto.randomUUID(),
        category,
        description: description.trim(),
        latitude: latNum,
        longitude: lonNum,
        priority,
        status: 'SUBMITTED',
        reported_at: new Date().toISOString(),
        sync_status: 'PENDING'
      };

      await onSubmit(newReport);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred while saving.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-header">
          <div className="modal-title-group">
            <h2>Log New Field Issue</h2>
            <p className="modal-subtitle">
              {isOnline ? 'Online mode: report will sync immediately.' : 'Offline mode: report will save to IndexedDB and sync when online.'}
            </p>
          </div>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {errorMessage && (
          <div className="error-banner" role="alert">
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="issue-category">Issue Category *</label>
            <select
              id="issue-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="issue-description">Description *</label>
            <textarea
              id="issue-description"
              rows={4}
              placeholder="Describe the nature of the infrastructure failure, affected community/equipment, and urgency..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
            <span className="char-count">{description.length}/2000 characters</span>
          </div>

          <div className="form-group">
            <label>Priority Level</label>
            <div className="priority-button-group">
              {PRIORITIES.map((p) => (
                <button
                  type="button"
                  key={p}
                  className={`priority-btn ${p.toLowerCase()} ${priority === p ? 'selected' : ''}`}
                  onClick={() => setPriority(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="form-section location-section">
            <div className="section-title">
              <MapPin size={16} />
              <span>Location Coordinates</span>
            </div>

            <div className="coord-grid">
              <div className="form-group">
                <label htmlFor="coord-latitude">Latitude (-90 to 90) *</label>
                <input
                  id="coord-latitude"
                  type="number"
                  step="any"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="coord-longitude">Longitude (-180 to 180) *</label>
                <input
                  id="coord-longitude"
                  type="number"
                  step="any"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="location-helpers">
              <button
                type="button"
                className="btn-location-gps"
                onClick={handleUseMyLocation}
              >
                <Compass size={15} />
                <span>Use My Location (GPS)</span>
              </button>

              <div className="preset-quickpicks">
                <span className="preset-label">Quick Presets:</span>
                {PRESET_LOCATIONS.map((loc) => (
                  <button
                    type="button"
                    key={loc.name}
                    className="preset-chip"
                    onClick={() => handlePresetSelect(loc.lat, loc.lon)}
                  >
                    {loc.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            {locationStatus && (
              <div className="location-status-msg">
                <span>{locationStatus}</span>
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" id="btn-submit-report" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving Report...' : 'Save & Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
