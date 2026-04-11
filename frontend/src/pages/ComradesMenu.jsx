import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const ComradesMenu = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    // Load Hero Settings (Shared with FastFood page)
    const [heroSettings, setHeroSettings] = useState(null);

    useEffect(() => {
        const savedSettings = localStorage.getItem('fastFoodHeroSettings');
        if (savedSettings) {
            setHeroSettings(JSON.parse(savedSettings));
        }
    }, []);

    const fetchItems = useCallback(async () => {
        try {
            setLoading(true);
            const response = await api.get('/fastfood?limit=100');
            if (response.data.success) {
                setItems(response.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch menu items:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    if (loading && items.length === 0) {
        return <LoadingSpinner />;
    }

    return (
        <div className="min-h-screen bg-[#FDFCFB]">
            {/* Floating Back Button */}
            <button
                onClick={() => navigate('/')}
                className="fixed top-6 left-6 z-50 bg-white/80 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-white hover:bg-orange-600 hover:text-white transition-all group active:scale-95"
                title="Back to Home"
            >
                <FaArrowLeft className="text-xl group-hover:-translate-x-1 transition-transform" />
            </button>

            {/* Premium Hero Section */}
            <LiveMenuHero
                title={heroSettings?.title}
                subtitle={heroSettings?.subtitle}
                backgroundImage={heroSettings?.image}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
            />

            <div className="-mt-16 relative z-10 pb-20">
                <LiveMenuGrid items={items} searchTerm={searchTerm} navigate={navigate} />
            </div>

            <Footer />
        </div>
    );
};

export default ComradesMenu;
