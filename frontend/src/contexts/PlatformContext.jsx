import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '@/shared/services/api';
import useRealtimeSync from '@/hooks/useRealtimeSync';
import { loadPlatformConfigs, invalidateConfigCache } from '@/utils/configLoader';

const PlatformContext = createContext();

export const usePlatform = () => {
    const context = useContext(PlatformContext);
    if (!context) {
        throw new Error('usePlatform must be used within a PlatformProvider');
    }
    return context;
};

// Default fallback settings
const DEFAULT_SETTINGS = {
    platform: { siteName: 'Comrades360', siteLogo: '', siteDescription: 'Your trusted marketplace', contactEmail: 'admin@comrades360.com', supportPhone: '+254700000000', currency: 'KES', timezone: 'Africa/Nairobi' },
    maintenance: { enabled: false, message: 'System is currently under maintenance.', dashboards: {}, sections: {} },
    seo: { title: 'Comrades360', description: 'Student Marketplace', keywords: 'university, marketplace' },
    seo_pages: {},
    finance: { referralSplit: { primary: 0.6, secondary: 0.4 }, minPayout: {} },
    logistic: { warehouseHours: { open: '08:00', close: '20:00' } }
};

// Restore cached settings from localStorage so the UI renders instantly
// with the correct logo/branding before the API call completes.
const getCachedSettings = () => {
    try {
        const cached = localStorage.getItem('platform_settings_cache');
        if (cached) {
            const parsed = JSON.parse(cached);
            const result = {
                ...DEFAULT_SETTINGS,
                platform: { ...DEFAULT_SETTINGS.platform, ...parsed.platform },
                maintenance: { ...DEFAULT_SETTINGS.maintenance, ...parsed.maintenance },
                seo: { ...DEFAULT_SETTINGS.seo, ...parsed.seo },
                finance: { ...DEFAULT_SETTINGS.finance, ...parsed.finance },
                logistic: { ...DEFAULT_SETTINGS.logistic, ...parsed.logistic },
            };
            // Use the cached base64 data URL for the logo so it renders
            // instantly from memory — no network fetch needed.
            const cachedLogoDataUrl = localStorage.getItem('platform_logo_dataurl');
            if (cachedLogoDataUrl && result.platform.siteLogo) {
                result.platform._originalSiteLogo = result.platform.siteLogo;
                result.platform.siteLogo = cachedLogoDataUrl;
            }
            return result;
        }
    } catch (e) {
        // Corrupted cache — ignore and use defaults
    }
    return DEFAULT_SETTINGS;
};

// Fetch a logo image URL and convert it to a base64 data URL for caching.
const cacheLogoAsDataUrl = (logoUrl) => {
    if (!logoUrl || logoUrl.startsWith('data:')) return;
    try {
        // Build a full URL from relative paths like /uploads/...
        const fullUrl = logoUrl.startsWith('http')
            ? logoUrl
            : `${window.location.origin}${logoUrl.startsWith('/') ? '' : '/'}${logoUrl}`;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                const dataUrl = canvas.toDataURL('image/png');
                localStorage.setItem('platform_logo_dataurl', dataUrl);
            } catch (_) { /* CORS or canvas taint — skip */ }
        };
        img.src = fullUrl;
    } catch (_) { /* ignore */ }
};

export const PlatformProvider = ({ children }) => {
    const [settings, setSettings] = useState(getCachedSettings);
    const [loading, setLoading] = useState(true);

    const loadSettings = useCallback(async () => {
        try {
            // Use the batched config loader to reduce parallel requests
            const config = await loadPlatformConfigs();

            setSettings(prev => {
                const next = {
                    ...prev,
                    platform: { ...prev.platform, ...config.platform },
                    maintenance: { ...prev.maintenance, ...config.maintenance },
                    seo: { ...prev.seo, ...config.seo },
                    seo_pages: { ...prev.seo_pages, ...config.seo_pages },
                    finance: { ...prev.finance, ...config.finance },
                    logistic: { ...prev.logistic, ...config.logistic }
                };

                // Sync maintenance to localStorage for hard-refresh fallback
                if (config.maintenance) {
                    localStorage.setItem('maintenance_settings', JSON.stringify(config.maintenance));
                }

                // Persist to localStorage for instant load on next visit
                try {
                    localStorage.setItem('platform_settings_cache', JSON.stringify(next));
                } catch (_) { /* quota exceeded — ignore */ }

                // Cache the logo image as a base64 data URL so it renders
                // instantly on the next page load (no network fetch needed).
                const newLogoUrl = next.platform?.siteLogo;
                const prevLogoUrl = prev.platform?._originalSiteLogo || prev.platform?.siteLogo;
                if (newLogoUrl && !newLogoUrl.startsWith('data:')) {
                    // Logo changed or first load — re-cache the image
                    if (newLogoUrl !== prevLogoUrl) {
                        localStorage.removeItem('platform_logo_dataurl');
                    }
                    cacheLogoAsDataUrl(newLogoUrl);
                } else if (!newLogoUrl) {
                    // Logo was removed
                    localStorage.removeItem('platform_logo_dataurl');
                }

                return next;
            });
        } catch (e) {
            console.error('[PlatformContext] Failed to load settings:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    // Handle real-time updates from WebSockets
    const handleRealtimeUpdate = useCallback((payload) => {
        if (!payload || !payload.key) return;

        const key = payload.key;
        const value = payload.settings;

        setSettings(prev => {
            const stateKey = key === 'platform_settings' ? 'platform'
                : key === 'maintenance_settings' ? 'maintenance'
                    : key === 'seo_settings' ? 'seo'
                        : key === 'finance_settings' ? 'finance'
                            : key === 'logistic_settings' ? 'logistic'
                                : null;

            if (!stateKey) return prev;

            console.log(`[PlatformContext] Real-time update for ${stateKey}:`, value);

            if (stateKey === 'maintenance') {
                localStorage.setItem('maintenance_settings', JSON.stringify(value));
                // Dispatch legacy event for components still using the old event listener
                window.dispatchEvent(new CustomEvent('maintenance-settings-updated', { detail: value }));
            }

            return { ...prev, [stateKey]: value };
        });
    }, []);

    // Register with the global real-time bridge
    useRealtimeSync(['platform_settings'], () => {
        // We can either re-fetch everything or wait for the detailed payload.
        // The detailed payload flows through the 'realtime:data-updated' event.
        // We catch it here via a manual listener because useRealtimeSync only triggers a callback.
    });

    useEffect(() => {
        const onUpdate = (e) => {
            if (e.detail?.scope === 'platform_settings') {
                handleRealtimeUpdate(e.detail.payload);
            }
        };
        window.addEventListener('realtime:data-updated', onUpdate);
        return () => window.removeEventListener('realtime:data-updated', onUpdate);
    }, [handleRealtimeUpdate]);

    return (
        <PlatformContext.Provider value={{ settings, loading, refreshSettings: loadSettings }}>
            {children}
        </PlatformContext.Provider>
    );
};
