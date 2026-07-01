import React from 'react';
import { Cloud, CheckCircle, Loader2 } from 'lucide-react';

/**
 * A subtle indicator for autosave status.
 * 
 * @param {Object} props
 * @param {Date|string|number|null} props.lastSaved - The timestamp of the last successful save.
 * @param {boolean} props.isSaving - Whether a save is currently in progress.
 * @param {string} props.className - Additional CSS classes.
 */
const AutoSaveIndicator = ({ lastSaved, isSaving, lastCloudSaved, isCloudSync, className = '' }) => {
  if (!lastSaved && !isSaving && !lastCloudSaved && !isCloudSync) return null;

  const formatTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className={`flex items-center space-x-3 text-xs sm:text-sm transition-all duration-300 ${className}`}>
      {isCloudSync ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
          <span className="text-blue-600 font-semibold italic">Syncing to cloud...</span>
        </>
      ) : isSaving ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin text-gray-500" />
          <span className="text-gray-500">Auto-saving local...</span>
        </>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 gap-1">
          {lastCloudSaved && (
            <div className="flex items-center space-x-1.5 text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
              <Cloud className="h-3 w-3" />
              <span className="font-medium">Cloud saved {formatTime(lastCloudSaved)}</span>
            </div>
          )}
          {lastSaved && (
            <div className="flex items-center space-x-1.5 text-gray-500">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span>Local {formatTime(lastSaved)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AutoSaveIndicator;
