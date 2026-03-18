import React, { useState, useEffect, useRef } from 'react';

const PerformanceMonitor = ({ enabled = false, onMetricsUpdate }) => {
  const [metrics, setMetrics] = useState({
    loadTime: 0,
    renderTime: 0,
    cacheHit: false,
    apiCalls: 0,
    imageLoads: 0,
    memoryUsage: 0,
    connectionType: 'unknown'
  });
  
  const [isVisible, setIsVisible] = useState(false);
  const startTimeRef = useRef(performance.now());
  const renderStartRef = useRef(performance.now());
  const apiCallsRef = useRef(0);
  const imageLoadsRef = useRef(0);

  // Monitor connection type
  useEffect(() => {
    const updateConnectionInfo = () => {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      setMetrics(prev => ({
        ...prev,
        connectionType: connection?.effectiveType || 'unknown'
      }));
    };

    updateConnectionInfo();
    window.addEventListener('online', updateConnectionInfo);
    window.addEventListener('offline', updateConnectionInfo);

    return () => {
      window.removeEventListener('online', updateConnectionInfo);
      window.removeEventListener('offline', updateConnectionInfo);
    };
  }, []);

  // Monitor memory usage
  useEffect(() => {
    const updateMemoryUsage = () => {
      if (performance.memory) {
        setMetrics(prev => ({
          ...prev,
          memoryUsage: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) // MB
        }));
      }
    };

    const memoryInterval = setInterval(updateMemoryUsage, 2000);
    return () => clearInterval(memoryInterval);
  }, []);

  // Track API calls
  const trackApiCall = () => {
    apiCallsRef.current += 1;
    setMetrics(prev => ({
      ...prev,
      apiCalls: apiCallsRef.current
    }));
  };

  // Track image loads
  const trackImageLoad = () => {
    imageLoadsRef.current += 1;
    setMetrics(prev => ({
      ...prev,
      imageLoads: imageLoadsRef.current
    }));
  };

  // Calculate final metrics
  useEffect(() => {
    if (!enabled) return;

    const calculateMetrics = () => {
      const now = performance.now();
      const loadTime = now - startTimeRef.current;
      const renderTime = now - renderStartRef.current;

      setMetrics(prev => ({
        ...prev,
        loadTime: Math.round(loadTime),
        renderTime: Math.round(renderTime)
      }));

      // Send metrics to parent component
      onMetricsUpdate?.({
        loadTime: Math.round(loadTime),
        renderTime: Math.round(renderTime),
        cacheHit: prevMetrics?.cacheHit || false,
        apiCalls: apiCallsRef.current,
        imageLoads: imageLoadsRef.current,
        memoryUsage: metrics.memoryUsage,
        connectionType: metrics.connectionType
      });
    };

    // Measure initial page load
    if (document.readyState === 'complete') {
      calculateMetrics();
    } else {
      window.addEventListener('load', calculateMetrics);
    }

    return () => {
      window.removeEventListener('load', calculateMetrics);
    };
  }, [enabled, onMetricsUpdate, metrics.memoryUsage, metrics.connectionType]);

  // Performance Observer for measuring component render times
  useEffect(() => {
    if (!enabled) return;

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'measure') {
          console.log(`[Performance] ${entry.name}: ${entry.duration}ms`);
        }
      }
    });

    observer.observe({ entryTypes: ['measure', 'navigation', 'paint'] });

    return () => observer.disconnect();
  }, [enabled]);

  // Toggle visibility with keyboard shortcut
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        setIsVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Don't render if disabled
  if (!enabled) return null;

  // Performance grade calculation
  const getPerformanceGrade = (loadTime) => {
    if (loadTime < 500) return { grade: 'A+', color: 'green', label: 'Excellent' };
    if (loadTime < 1000) return { grade: 'A', color: 'green', label: 'Great' };
    if (loadTime < 2000) return { grade: 'B', color: 'blue', label: 'Good' };
    if (loadTime < 3000) return { grade: 'C', color: 'yellow', label: 'Fair' };
    return { grade: 'D', color: 'red', label: 'Needs Improvement' };
  };

  const performance = getPerformanceGrade(metrics.loadTime);

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsVisible(true)}
          className="bg-gray-800 text-white p-2 rounded-full shadow-lg hover:bg-gray-700 transition-colors"
          title="Show Performance Monitor (Ctrl+Shift+P)"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 w-80">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Performance Monitor</h3>
        <div className="flex items-center space-x-2">
          <span 
            className={`px-2 py-1 rounded text-xs font-bold bg-${performance.color}-100 text-${performance.color}-800`}
          >
            {performance.grade}
          </span>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-600">Load Time:</span>
          <span className="font-mono">{metrics.loadTime}ms</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-600">Render Time:</span>
          <span className="font-mono">{metrics.renderTime}ms</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-600">API Calls:</span>
          <span className="font-mono">{metrics.apiCalls}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-600">Images Loaded:</span>
          <span className="font-mono">{metrics.imageLoads}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-600">Memory:</span>
          <span className="font-mono">{metrics.memoryUsage}MB</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-600">Connection:</span>
          <span className="font-mono">{metrics.connectionType}</span>
        </div>
      </div>

      {/* Performance Indicators */}
      <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600">Performance:</span>
          <span className={`font-semibold text-${performance.color}-600`}>
            {performance.label}
          </span>
        </div>
        
        <div className="mt-2 bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full bg-${performance.color}-500 transition-all duration-300`}
            style={{ 
              width: `${Math.min(100, (3000 - metrics.loadTime) / 30)}%` 
            }}
          />
        </div>
      </div>

      {/* Keyboard Shortcut Hint */}
      <div className="mt-2 text-xs text-gray-500 text-center">
        Press Ctrl+Shift+P to toggle
      </div>
    </div>
  );
};

// Hook to use performance tracking in components
export const usePerformanceTracking = () => {
  const startMeasure = (name) => {
    performance.mark(`${name}-start`);
  };

  const endMeasure = (name) => {
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
    
    const measure = performance.getEntriesByName(name)[0];
    console.log(`[Performance] ${name}: ${Math.round(measure.duration)}ms`);
    
    // Clean up
    performance.clearMarks(`${name}-start`);
    performance.clearMarks(`${name}-end`);
    performance.clearMeasures(name);
  };

  return { startMeasure, endMeasure };
};

export default PerformanceMonitor;