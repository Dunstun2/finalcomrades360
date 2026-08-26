import { useState, useEffect } from 'react';
import api from '@/shared/services/api';

/**
 * Shared hook to fetch active hero promotions for a specific page/location.
 * Supports locations: 'homepage', 'products', 'services', 'fastfood', etc.
 * Handles both `{ items: [] }` and bare array response shapes.
 */
const useHeroPromotions = (location = '') => {
    const [heroPromotions, setHeroPromotions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const params = location ? { location } : {};
                const res = await api.get('/hero-promotions/active', { params });
                if (cancelled) return;
                let items = [];
                if (Array.isArray(res.data)) {
                    items = res.data;
                } else if (Array.isArray(res.data?.items)) {
                    items = res.data.items;
                } else if (Array.isArray(res.data?.promotions)) {
                    items = res.data.promotions;
                }

                // Keep promotions that have either products, fast foods, a custom image, a video, or are system/default banners
                const validItems = items.filter(p =>
                    (Array.isArray(p.products) && p.products.length > 0) ||
                    (Array.isArray(p.fastfoods) && p.fastfoods.length > 0) ||
                    Boolean(p.customImageUrl) ||
                    Boolean(p.videoUrl) ||
                    Boolean(p.isSystem) ||
                    Boolean(p.isDefault) ||
                    Boolean(p.title)
                );

                setHeroPromotions(validItems);
            } catch (err) {
                // Silently fail – page will show its static fallback banner
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [location]);

    return { heroPromotions, loading };
};

export default useHeroPromotions;
