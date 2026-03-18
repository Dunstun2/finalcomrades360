import React, { useState, useEffect, useRef } from 'react';

// Real User Monitoring (RUM) Performance Dashboard
const PerformanceDashboard = ({ 
  isVisible = false,
  onClose = () => {},
  refreshInterval = 5000 
}) => {
  const [metrics, setMetrics] = useState({
    pageLoadTime: 0,
    domContentLoaded: 0,
    firstPaint: 0,
    firstContentfulPaint: 0,
    largestContentfulPaint: 0,
    firstInputDelay: 0,
    cumulativeLayoutShift: 0,
    totalBlockingTime: 0,
    connectionType: 'unknown',
    cacheHitRate: 0,
    apiResponseTimes: {},
    memoryUsage: 0,
    activeConnections: 0
  });

  const [historicalData, setHistoricalData] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const intervalRef = useRef(null);

  // Performance Observer for Core Web Vitals
  useEffect(() => {
    if (!('PerformanceObserver' in window)) {
      console.warn('PerformanceObserver not supported');
      return;
    }

    const observers = [];

    // Largest Contentful Paint
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          updateMetrics({ largestContentfulPaint: lastEntry.startTime });
        }
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      observers.push(lcpObserver);
    } catch (e) {
      console.warn('LCP observer not supported:', e);
    }

    // First Input Delay
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          updateMetrics({ firstInputDelay: entry.processingStart - entry.startTime });
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
      observers.push(fidObserver);
    } catch (e) {
      console.warn('FID observer not supported:', e);
    }

    // Cumulative Layout Shift
    try {
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0;
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        updateMetrics({ cumulativeLayoutShift: clsValue });
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      observers.push(clsObserver);
    } catch (e) {
      console.warn('CLS observer not supported:', e);
    }

    return () => {
      observers.forEach(observer => observer.disconnect());
    };
  }, []);

  // Get Navigation Timing data
  const getNavigationTiming = () => {
    if (!window.performance || !window.performance.timing) {
      return {};
    }

    const timing = window.performance.timing;
    const navigation = performance.timing.navigationStart;

    return {
      pageLoadTime: timing.loadEventEnd - navigation,
      domContentLoaded: timing.domContentLoadedEventEnd - navigation,
      firstPaint: timing.responseEnd - navigation,
      firstContentfulPaint: timing.domContentLoadedEventEnd - navigation
    };
  };

  // Get connection information
  const getConnectionInfo = () => {
    if ('connection' in navigator) {
      const connection = navigator.connection;
      return {
        connectionType: connection.effectiveType || 'unknown',
        downlink: connection.downlink || 0,
        rtt: connection.rtt || 0,
        saveData: connection.saveData || false
      };
    }
    return { connectionType: 'unknown' };
  };

  // Get memory usage
  const getMemoryUsage = () => {
    if ('memory' in performance) {
      return {
        used: Math.round(performance.memory.usedJSHeapSize / 1048576), // MB
        total: Math.round(performance.memory.totalJSHeapSize / 1048576), // MB
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576) // MB
      };
    }
    return null;
  };

  // Update metrics
  const updateMetrics = (updates) => {
    setMetrics(prev => ({
      ...prev,
      ...updates,
      lastUpdated: Date.now()
    }));
  };

  // Collect all metrics
  const collectMetrics = () => {
    const navigationTiming = getNavigationTiming();
    const connectionInfo = getConnectionInfo();
    const memoryInfo = getMemoryUsage();

    const newMetrics = {
      ...metrics,
      ...navigationTiming,
      ...connectionInfo,
      memoryUsage: memoryInfo?.used || 0,
      timestamp: Date.now()
    };

    setMetrics(newMetrics);

    // Add to historical data
    setHistoricalData(prev => {
      const updated = [...prev, newMetrics];
      // Keep only last 100 data points
      return updated.slice(-100);
    });

    return newMetrics;
  };

  // Start/stop recording
  const toggleRecording = () => {
    setIsRecording(!isRecording);
  };

  // Clear historical data
  const clearData = () => {
    setHistoricalData([]);
  };

  // Export data
  const exportData = () => {
    const data = {
      metrics,
      historicalData,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Start/stop automatic collection
  useEffect(() => {
    if (isRecording) {
      // Collect initial metrics
      collectMetrics();

      // Set up interval for continuous collection
      intervalRef.current = setInterval(collectMetrics, refreshInterval);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRecording, refreshInterval]);

  // Performance score calculation
  const getPerformanceScore = (metric) => {
    const thresholds = {
      pageLoadTime: { good: 2000, poor: 4000 },
      largestContentfulPaint: { good: 2500, poor: 4000 },
      firstInputDelay: { good: 100, poor: 300 },
      cumulativeLayoutShift: { good: 0.1, poor: 0.25 }
    };

    const threshold = thresholds[metric];
    if (!threshold) return null;

    const value = metrics[metric];
    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  };

  const getScoreColor = (score) => {
    switch (score) {
      case 'good': return 'text-green-600 bg-green-100';
      case 'needs-improvement': return 'text-yellow-600 bg-yellow-100';
      case 'poor': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Format time value
  const formatTime = (value) => {
    if (value === 0) return '0ms';
    if (value < 1000) return `${Math.round(value)}ms`;
    return `${(value / 1000).toFixed(2)}s`;
  };

  // Format memory value
  const formatMemory = (value) => {
    return `${Math.round(value)}MB`;
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => {/* Show dashboard */}}
          className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
          title="Performance Dashboard"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Performance Dashboard</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleRecording}
              className={`px-4 py-2 rounded ${
                isRecording 
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'bg-green-500 hover:bg-green-600'
              } transition-colors`}
            >
              {isRecording ? 'Stop' : 'Start'} Recording
            </button>
            <button
              onClick={clearData}
              className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 rounded transition-colors"
            >
              Clear Data
            </button>
            <button
              onClick={exportData}
              className="px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded transition-colors"
            >
              Export
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-blue-700 rounded transition-colors"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Core Web Vitals */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white border rounded-lg p-4 shadow-sm">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Page Load Time</h3>
              <div className="text-2xl font-bold text-gray-900">
                {formatTime(metrics.pageLoadTime)}
              </div>
              <div className={`mt-2 px-2 py-1 rounded text-xs font-medium inline-block ${
                getScoreColor(getPerformanceScore('pageLoadTime'))
              }`}>
                {getPerformanceScore('pageLoadTime') || 'N/A'}
              </div>
            </div>

            <div className="bg-white border rounded-lg p-4 shadow-sm">
              <h3 className="text-sm font-medium text-gray-500 mb-2">LCP</h3>
              <div className="text-2xl font-bold text-gray-900">
                {formatTime(metrics.largestContentfulPaint)}
              </div>
              <div className={`mt-2 px-2 py-1 rounded text-xs font-medium inline-block ${
                getScoreColor(getPerformanceScore('largestContentfulPaint'))
              }`}>
                {getPerformanceScore('largestContentfulPaint') || 'N/A'}
              </div>
            </div>

            <div className="bg-white border rounded-lg p-4 shadow-sm">
              <h3 className="text-sm font-medium text-gray-500 mb-2">FID</h3>
              <div className="text-2xl font-bold text-gray-900">
                {formatTime(metrics.firstInputDelay)}
              </div>
              <div className={`mt-2 px-2 py-1 rounded text-xs font-medium inline-block ${
                getScoreColor(getPerformanceScore('firstInputDelay'))
              }`}>
                {getPerformanceScore('firstInputDelay') || 'N/A'}
              </div>
            </div>

            <div className="bg-white border rounded-lg p-4 shadow-sm">
              <h3 className="text-sm font-medium text-gray-500 mb-2">CLS</h3>
              <div className="text-2xl font-bold text-gray-900">
                {metrics.cumulativeLayoutShift.toFixed(3)}
              </div>
              <div className={`mt-2 px-2 py-1 rounded text-xs font-medium inline-block ${
                getScoreColor(getPerformanceScore('cumulativeLayoutShift'))
              }`}>
                {getPerformanceScore('cumulativeLayoutShift') || 'N/A'}
              </div>
            </div>
          </div>

          {/* Additional Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white border rounded-lg p-4 shadow-sm">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Connection</h3>
              <div className="text-lg font-semibold text-gray-900">
                {metrics.connectionType}
              </div>
              {metrics.downlink && (
                <div className="text-sm text-gray-600">
                  {metrics.downlink} Mbps
                </div>
              )}
            </div>

            <div className="bg-white border rounded-lg p-4 shadow-sm">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Memory Usage</h3>
              <div className="text-lg font-semibold text-gray-900">
                {formatMemory(metrics.memoryUsage)}
              </div>
            </div>

            <div className="bg-white border rounded-lg p-4 shadow-sm">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Cache Hit Rate</h3>
              <div className="text-lg font-semibold text-gray-900">
                {metrics.cacheHitRate.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* API Response Times */}
          {Object.keys(metrics.apiResponseTimes).length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">API Response Times</h3>
              <div className="bg-white border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Endpoint
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Response Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.entries(metrics.apiResponseTimes).map(([endpoint, time]) => (
                      <tr key={endpoint}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {endpoint}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatTime(time)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            time < 200 ? 'bg-green-100 text-green-800' : 
                            time < 500 ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-red-100 text-red-800'
                          }`}>
                            {time < 200 ? 'Fast' : time < 500 ? 'Medium' : 'Slow'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Performance Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Performance Tips</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              {metrics.pageLoadTime > 3000 && (
                <li>• Consider optimizing critical rendering path to reduce page load time</li>
              )}
              {metrics.largestContentfulPaint > 2500 && (
                <li>• Optimize largest content element to improve LCP</li>
              )}
              {metrics.firstInputDelay > 100 && (
                <li>• Reduce main thread work to improve first input delay</li>
              )}
              {metrics.cumulativeLayoutShift > 0.1 && (
                <li>• Add size attributes to images to prevent layout shifts</li>
              )}
              {metrics.connectionType === 'slow-2g' || metrics.connectionType === '2g' && (
                <li>• Consider reducing resource sizes for slow connections</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceDashboard;