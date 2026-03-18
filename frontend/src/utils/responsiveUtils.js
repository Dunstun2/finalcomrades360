import { useState, useEffect } from 'react';

/**
 * Custom React hook for responsive design utilities
 * Provides breakpoint detection and responsive helpers
 */

// Tailwind CSS default breakpoints
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
};

/**
 * Hook to detect current breakpoint
 * @returns {string} Current breakpoint name
 */
export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState('xs');

  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      
      if (width >= BREAKPOINTS['2xl']) {
        setBreakpoint('2xl');
      } else if (width >= BREAKPOINTS.xl) {
        setBreakpoint('xl');
      } else if (width >= BREAKPOINTS.lg) {
        setBreakpoint('lg');
      } else if (width >= BREAKPOINTS.md) {
        setBreakpoint('md');
      } else if (width >= BREAKPOINTS.sm) {
        setBreakpoint('sm');
      } else {
        setBreakpoint('xs');
      }
    };

    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
    
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);

  return breakpoint;
}

/**
 * Hook to check if viewport matches a media query
 * @param {string} query - Media query string
 * @returns {boolean} Whether the query matches
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    
    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
}

/**
 * Hook to detect if device is mobile
 * @returns {boolean} True if mobile device
 */
export function useIsMobile() {
  return useMediaQuery(`(max-width: ${BREAKPOINTS.md - 1}px)`);
}

/**
 * Hook to detect if device is tablet
 * @returns {boolean} True if tablet device
 */
export function useIsTablet() {
  return useMediaQuery(
    `(min-width: ${BREAKPOINTS.md}px) and (max-width: ${BREAKPOINTS.lg - 1}px)`
  );
}

/**
 * Hook to detect if device is desktop
 * @returns {boolean} True if desktop device
 */
export function useIsDesktop() {
  return useMediaQuery(`(min-width: ${BREAKPOINTS.lg}px)`);
}

/**
 * Hook to get viewport dimensions
 * @returns {{width: number, height: number}} Viewport dimensions
 */
export function useViewport() {
  const [viewport, setViewport] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  useEffect(() => {
    const handleResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return viewport;
}

/**
 * Hook to detect device orientation
 * @returns {'portrait' | 'landscape'} Current orientation
 */
export function useOrientation() {
  const [orientation, setOrientation] = useState(
    window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
  );

  useEffect(() => {
    const handleOrientationChange = () => {
      setOrientation(
        window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
      );
    };

    window.addEventListener('resize', handleOrientationChange);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('resize', handleOrientationChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  return orientation;
}

/**
 * Hook for responsive value selection
 * @param {Object} values - Object with breakpoint keys and values
 * @returns {any} Value for current breakpoint
 * 
 * @example
 * const columns = useResponsiveValue({ xs: 1, sm: 2, md: 3, lg: 4 });
 */
export function useResponsiveValue(values) {
  const breakpoint = useBreakpoint();
  
  // Return value for current breakpoint or closest smaller breakpoint
  const breakpointOrder = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
  const currentIndex = breakpointOrder.indexOf(breakpoint);
  
  for (let i = currentIndex; i >= 0; i--) {
    const bp = breakpointOrder[i];
    if (values[bp] !== undefined) {
      return values[bp];
    }
  }
  
  return values.xs || values[breakpointOrder[0]];
}

/**
 * Utility function to generate responsive className
 * @param {Object} classes - Object with breakpoint keys and class strings
 * @returns {string} Combined className string
 * 
 * @example
 * const className = responsiveClass({
 *   xs: 'text-sm p-2',
 *   md: 'text-base p-4',
 *   lg: 'text-lg p-6'
 * });
 */
export function responsiveClass(classes) {
  return Object.entries(classes)
    .map(([breakpoint, classStr]) => {
      if (breakpoint === 'xs') return classStr;
      return classStr.split(' ').map(cls => `${breakpoint}:${cls}`).join(' ');
    })
    .join(' ');
}

/**
 * Helper to check if touch events are supported
 * @returns {boolean} True if touch is supported
 */
export function isTouchDevice() {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0
  );
}

/**
 * Component wrapper for responsive rendering
 * Renders children only when breakpoint matches
 */
export function ResponsiveRender({ breakpoint, children, fallback = null }) {
  const currentBreakpoint = useBreakpoint();
  const breakpoints = Array.isArray(breakpoint) ? breakpoint : [breakpoint];
  
  if (breakpoints.includes(currentBreakpoint)) {
    return children;
  }
  
  return fallback;
}

/**
 * Component for mobile-only rendering
 */
export function MobileOnly({ children, fallback = null }) {
  const isMobile = useIsMobile();
  return isMobile ? children : fallback;
}

/**
 * Component for desktop-only rendering
 */
export function DesktopOnly({ children, fallback = null }) {
  const isDesktop = useIsDesktop();
  return isDesktop ? children : fallback;
}

/**
 * Higher-order component to inject responsive props
 */
export function withResponsive(Component) {
  return function ResponsiveComponent(props) {
    const breakpoint = useBreakpoint();
    const isMobile = useIsMobile();
    const isTablet = useIsTablet();
    const isDesktop = useIsDesktop();
    const viewport = useViewport();
    const orientation = useOrientation();

    return (
      <Component
        {...props}
        responsive={{
          breakpoint,
          isMobile,
          isTablet,
          isDesktop,
          viewport,
          orientation,
          isTouchDevice: isTouchDevice()
        }}
      />
    );
  };
}

export default {
  useBreakpoint,
  useMediaQuery,
  useIsMobile,
  useIsTablet,
  useIsDesktop,
  useViewport,
  useOrientation,
  useResponsiveValue,
  responsiveClass,
  isTouchDevice,
  ResponsiveRender,
  MobileOnly,
  DesktopOnly,
  withResponsive,
  BREAKPOINTS
};
