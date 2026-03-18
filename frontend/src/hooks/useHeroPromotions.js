import { useState, useEffect } from 'react';
import api from '../services/api';

/**
 * Shared hook to fetch active hero promotions.
 * Used by Products and Services pages to power the dynamic banner.
 * Handles both `{ items: [] }` and bare array response shapes.
 */
const useHeroPromotions = () => {
    const [heroPromotions, setHeroPromotions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const res = await api.get('/hero-promotions/active');
                if (cancelled) return;
                let items = [];
                if (Array.isArray(res.data)) {
                    items = res.data;
                } else if (Array.isArray(res.data?.items)) {
                    items = res.data.items;
                } else if (Array.isArray(res.data?.promotions)) {
                    items = res.data.promotions;
                }
                // Only keep promotions that have at least one product to display
                setHeroPromotions(items.filter(p => Array.isArray(p.products) && p.products.length > 0));
            } catch (err) {
                // Silently fail – page will show its static fallback banner
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, []);

    return { heroPromotions, loading };
};

export default useHeroPromotions;
