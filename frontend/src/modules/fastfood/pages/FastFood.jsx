import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import FastFoodCard from '@/modules/fastfood/components/FastFoodCard';
import ItemCarousel from '@/modules/products/components/ItemCarousel';
import Footer from '@/shared/components/Footer';
import HeroBanner from '@/modules/marketing/components/HeroBanner';
import useHeroPromotions from '@/hooks/useHeroPromotions';
import LiveMenuGrid from '@/modules/fastfood/components/LiveMenuGrid';
import api from '@/shared/services/api';
import { platformService } from '@/modules/services/services/platformService';
import { fastFoodService } from '@/modules/fastfood/services/fastFoodService';
import { FaHamburger, FaFilter, FaArrowLeft, FaUtensils, FaFire, FaArrowRight, FaChevronDown, FaCheck } from 'react-icons/fa';
import { useCategories } from '@/contexts/CategoriesContext';
import { useAuth } from '@/contexts/AuthContext';
import MaintenanceOverlay from '@/shared/components/MaintenanceOverlay';
import PageLayout from '@/shared/components/PageLayout';
import { isFastFoodOpen } from '@/utils/availabilityUtils';

export default function FastFood() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedSubcategory, setSelectedSubcategory] = useState(null);
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
    const [userLocation, setUserLocation] = useState(null);
    const [activeTab, setActiveTab] = useState(() => {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('tab') || 'live';
    });
    const [hasAttemptedDefaultTab, setHasAttemptedDefaultTab] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [prepFilter, setPrepFilter] = useState('all'); // 'all' | 'ready' | 'made_to_order'
    const [currentTime, setCurrentTime] = useState(new Date());
    const { heroPromotions, loading: heroLoading } = useHeroPromotions('fastfood');

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const sortedItems = React.useMemo(() => {
        return [...items].sort((a, b) => {
            const aOpen = isFastFoodOpen(a, currentTime);
            const bOpen = isFastFoodOpen(b, currentTime);
            if (aOpen && !bOpen) return -1;
            if (!aOpen && bOpen) return 1;
            return 0;
        });
    }, [items, currentTime]);

    const readyItems = React.useMemo(() => {
        return sortedItems.filter(item => item.preparationType === 'ready');
    }, [sortedItems]);

    const madeToOrderItems = React.useMemo(() => {
        return sortedItems.filter(item => item.preparationType !== 'ready');
    }, [sortedItems]);

    const navigate = useNavigate();
    const location = useLocation();
    const urlSearchQuery = new URLSearchParams(location.search).get('search') || '';
    const { user } = useAuth();
    const observerTarget = useRef(null);
    const { categories } = useCategories();

    // --- Granular Maintenance Check ---
    const [maintenanceSettings, setMaintenanceSettings] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('maintenance_settings') || '{}');
        } catch {
            return {};
        }
    });

    useEffect(() => {
        const handleUpdate = (e) => {
            const data = e.detail || (e.key === 'maintenance_settings' ? JSON.parse(e.newValue || '{}') : null);
            if (data) setMaintenanceSettings(data);
        };
        window.addEventListener('maintenance-settings-updated', handleUpdate);
        window.addEventListener('storage', handleUpdate);
        return () => {
            window.removeEventListener('maintenance-settings-updated', handleUpdate);
            window.removeEventListener('storage', handleUpdate);
        };
    }, []);

    const userRoles = Array.isArray(user?.roles) ? user.roles : (user?.role ? [user.role] : []);
    const isAdmin = (userRoles.includes('admin') || userRoles.includes('super_admin') || userRoles.includes('superadmin'));
    const isMaintenanceActive = !isAdmin && (maintenanceSettings.enabled || maintenanceSettings.sections?.fastfood?.enabled);

    const subcategories = useMemo(() => {
        const foodCategories = categories.filter(
            cat => String(cat.taxonomyType) === 'fast_food' || cat.name === 'Food & Drinks' || cat.name === 'Fast Food'
        );
        const allSubs = [];
        const seenNames = new Set();
        foodCategories.forEach(cat => {
            const subs = cat.Subcategory || cat.subcategories || [];
            subs.forEach(s => {
                if (s && !seenNames.has(s.name)) {
                    seenNames.add(s.name);
                    allSubs.push(s);
                }
            });
        });
        return allSubs;
    }, [categories]);

    useEffect(() => {
        setSearchTerm(urlSearchQuery);
    }, [urlSearchQuery]);

    useEffect(() => {
        const urlParams = new URLSearchParams(location.search);
        const subcategoryId = urlParams.get('subcategoryId');
        const tabParam = urlParams.get('tab');
        if (tabParam) setActiveTab(tabParam);
        
        if (subcategoryId && subcategories.length > 0) {
            const subcategory = subcategories.find(sub => sub.id === parseInt(subcategoryId));
            if (subcategory) setSelectedSubcategory(subcategory);
        }
    }, [location.search, subcategories]);

    const fetchFastFood = useCallback(async (pageNum, reset = false) => {
        try {
            if (reset) setLoading(true);
            else setLoadingMore(true);
            const limit = activeTab === 'live' ? '100' : '12';
            const params = new URLSearchParams({ limit, page: pageNum.toString(), view: 'public', search: urlSearchQuery });
            
            const urlParams = new URLSearchParams(location.search);
            const vendorId = urlParams.get('vendorId');
            if (vendorId) params.append('vendor', vendorId);

            if (activeTab === 'all') params.append('browseAll', 'true');
            if (activeTab === 'all' && selectedSubcategory) params.append('subcategoryId', selectedSubcategory.id);
            if (userLocation) {
                params.append('userLat', userLocation.lat);
                params.append('userLng', userLocation.lng);
                params.append('sortBy', 'distance');
            }
            if (localStorage.getItem('marketing_mode') === 'true') params.append('marketing', 'true');

            const response = await api.get(`/fastfood?${params.toString()}`);
            if (response.data.success) {
                let fetchedItems = response.data.data;
                
                // Fallback logic: If 'live' was default and no items, switch to 'all'
                if (activeTab === 'live' && fetchedItems.length === 0 && !hasAttemptedDefaultTab && !urlSearchQuery) {
                    setHasAttemptedDefaultTab(true);
                    setActiveTab('all');
                    return; // The useEffect for activeTab will trigger a fresh fetch
                }

                setHasAttemptedDefaultTab(true);

                if (reset) {
                    setItems(fetchedItems);
                } else {
                    setItems(prev => [...prev, ...fetchedItems]);
                }
                setHasMore(fetchedItems.length === parseInt(limit));
                setPage(pageNum);
            }
        } catch (error) { console.error('Failed to fetch fast food items:', error); }
        finally { setLoading(false); setLoadingMore(false); }
    }, [selectedCategory, selectedSubcategory, activeTab, userLocation, urlSearchQuery]);

    useEffect(() => {
        if ("geolocation" in navigator) {
            const requestLocation = () => {
                navigator.geolocation.getCurrentPosition(
                    (position) => setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude }),
                    () => {}, // Silent fallback on denial/timeout
                    { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
                );
            };

            if (navigator.permissions && navigator.permissions.query) {
                navigator.permissions.query({ name: 'geolocation' })
                    .then((result) => {
                        if (result.state === 'granted' || result.state === 'prompt') {
                            requestLocation();
                        }
                    })
                    .catch(() => requestLocation());
            } else {
                requestLocation();
            }
        }
    }, []);

    useEffect(() => { fetchFastFood(1, true); }, [selectedCategory, selectedSubcategory, activeTab, userLocation, urlSearchQuery, fetchFastFood]);

    useEffect(() => {
        if (activeTab === 'live') return;
        const observer = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) fetchFastFood(page + 1, false);
        }, { threshold: 0.1 });
        if (observerTarget.current) observer.observe(observerTarget.current);
        return () => { if (observerTarget.current) observer.unobserve(observerTarget.current); };
    }, [hasMore, loadingMore, loading, page, fetchFastFood, activeTab]);

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        const url = new URL(window.location);
        url.searchParams.set('tab', tab);
        navigate(`${url.pathname}${url.search}`, { replace: true });
        setPage(1); setItems([]); setLoading(true);
    };

    return (
        <div className="relative min-h-screen bg-[#FDFCFB]">
            <MaintenanceOverlay 
                isVisible={isMaintenanceActive} 
                message={maintenanceSettings.sections?.fastfood?.message} 
            />
            
            <div className={isMaintenanceActive ? "blur-md pointer-events-none opacity-50 select-none transition-all duration-700" : "transition-all duration-700"}>
                <div className="min-h-screen flex flex-col pb-20 px-1.5 sm:px-4">


                        {/* Unified Hero Banner (Media on top, content below on mobile — same as Homepage) */}
                        <HeroBanner
                            title="Hot Campus Fast Food Deals"
                            subtitle="Order fresh burgers, pizzas, and local meals delivered piping hot to your door."
                            promotions={heroPromotions}
                            loading={heroLoading}
                        />



                        {/* Compact Tab Navigation */}
                        <div className="flex justify-center mt-2 sm:mt-4 mb-3 sm:mb-6 px-2 sm:px-4 relative z-20">
                            <div className="w-full max-w-lg bg-white/90 backdrop-blur-md p-1 sm:p-1.5 rounded-xl shadow-md border border-white/50 flex gap-1">
                                <button
                                    onClick={() => navigate('/')}
                                    className="flex-1 flex items-center justify-center px-2 sm:px-6 py-2 sm:py-3 rounded-lg text-xs sm:text-sm font-bold transition-all duration-300 text-gray-500 hover:bg-blue-50 hover:text-blue-600"
                                >
                                    <FaArrowLeft className="mr-1" /> Home
                                </button>
                                <button
                                    onClick={() => handleTabChange('all')}
                                    className={`flex-1 flex items-center justify-center px-2 sm:px-6 py-2 sm:py-3 rounded-lg text-xs sm:text-sm font-bold transition-all duration-300 ${activeTab === 'all' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                                >
                                    <FaUtensils className="mr-1" /> Browse
                                </button>
                                <button
                                    onClick={() => handleTabChange('live')}
                                    className={`flex-1 flex items-center justify-center px-2 sm:px-6 py-2 sm:py-3 rounded-lg text-xs sm:text-sm font-bold transition-all duration-300 ${activeTab === 'live' ? 'bg-orange-600 text-white shadow-md' : 'text-gray-500 hover:text-orange-600'}`}
                                >
                                    <FaFire className="mr-1" /> Live
                                </button>
                            </div>
                        </div>

                        <div className="w-full px-0 md:px-4 py-4 md:py-6">
                            {loading && items.length === 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 animate-pulse">
                                    {[...Array(12)].map((_, i) => <div key={i} className="bg-gray-200 rounded-xl h-64"></div>)}
                                </div>
                            ) : activeTab === 'live' ? (
                                <LiveMenuGrid items={sortedItems} searchTerm={searchTerm} navigate={navigate} />
                            ) : (
                                <div className={`transition-opacity duration-300 ${loading ? 'opacity-50' : 'opacity-100'}`}>
                                    {/* Preparation Type Filter Pills */}
                                    <div className="w-full grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2 mb-3">
                                        {/* All Meals - visible on desktop, hidden on small screens so full words fit */}
                                        <button
                                            type="button"
                                            onClick={() => setPrepFilter('all')}
                                            className={`hidden sm:flex w-full py-2 px-2 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm items-center justify-center text-center ${
                                                prepFilter === 'all'
                                                    ? 'bg-gray-900 text-white shadow-md'
                                                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                                            }`}
                                        >
                                            <span>All Meals ({sortedItems.length})</span>
                                        </button>

                                        {/* Ready to Eat - Full words */}
                                        <button
                                            type="button"
                                            onClick={() => setPrepFilter(prepFilter === 'ready' ? 'all' : 'ready')}
                                            className={`w-full py-2 px-1.5 sm:px-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1 text-center ${
                                                prepFilter === 'ready'
                                                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                                                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/80'
                                            }`}
                                            title={prepFilter === 'ready' ? 'Click to show all meals' : 'Filter by Ready to Eat'}
                                        >
                                            <span className="shrink-0 text-xs sm:text-sm">⚡</span>
                                            <span className="whitespace-nowrap">Ready to Eat ({readyItems.length})</span>
                                        </button>

                                        {/* Prepared on Order - Full words */}
                                        <button
                                            type="button"
                                            onClick={() => setPrepFilter(prepFilter === 'made_to_order' ? 'all' : 'made_to_order')}
                                            className={`w-full py-2 px-1.5 sm:px-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1 text-center ${
                                                prepFilter === 'made_to_order'
                                                    ? 'bg-orange-600 text-white shadow-md shadow-orange-200'
                                                    : 'bg-orange-50 text-orange-800 hover:bg-orange-100 border border-orange-200/80'
                                            }`}
                                            title={prepFilter === 'made_to_order' ? 'Click to show all meals' : 'Filter by Prepared on Order'}
                                        >
                                            <span className="shrink-0 text-xs sm:text-sm">👨‍🍳</span>
                                            <span className="whitespace-nowrap">Prepared on Order ({madeToOrderItems.length})</span>
                                        </button>
                                    </div>

                                    {/* Mobile Reset chip when a specific filter is active */}
                                    {prepFilter !== 'all' && (
                                        <div className="flex sm:hidden justify-center -mt-1 mb-3">
                                            <button
                                                type="button"
                                                onClick={() => setPrepFilter('all')}
                                                className="text-[11px] font-bold text-gray-600 hover:text-gray-900 bg-white hover:bg-gray-100 px-3 py-1 rounded-full flex items-center gap-1 transition-all shadow-sm border border-gray-200"
                                            >
                                                <span>✕ Show all meals ({sortedItems.length})</span>
                                            </button>
                                        </div>
                                    )}

                                    {/* Mobile Category Dropdown Menu (< md) */}
                                    <div className="relative md:hidden mb-4">
                                        <button
                                            type="button"
                                            onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                                            className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm text-sm font-bold text-gray-800 transition-all hover:border-orange-300 active:scale-[0.99]"
                                        >
                                            <div className="flex items-center gap-2.5 truncate">
                                                <span className="text-base">{selectedSubcategory?.emoji || '🍽️'}</span>
                                                <span className="truncate">{selectedSubcategory ? selectedSubcategory.name : 'All Categories'}</span>
                                            </div>
                                            <FaChevronDown className={`text-gray-400 text-xs transition-transform duration-200 shrink-0 ml-2 ${isCategoryDropdownOpen ? 'rotate-180 text-orange-600' : ''}`} />
                                        </button>

                                        {isCategoryDropdownOpen && (
                                            <>
                                                <div
                                                    className="fixed inset-0 z-40"
                                                    onClick={() => setIsCategoryDropdownOpen(false)}
                                                />
                                                <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 max-h-72 overflow-y-auto divide-y divide-gray-50 animate-in fade-in slide-in-from-top-2 duration-150">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedCategory('all');
                                                            setSelectedSubcategory(null);
                                                            setIsCategoryDropdownOpen(false);
                                                        }}
                                                        className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold transition-colors ${
                                                            !selectedSubcategory && selectedCategory === 'all'
                                                                ? 'bg-orange-50 text-orange-600'
                                                                : 'text-gray-700 hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        <span className="flex items-center gap-2">
                                                            <span>🍽️</span>
                                                            <span>All Items</span>
                                                        </span>
                                                        {!selectedSubcategory && selectedCategory === 'all' && <FaCheck className="text-orange-600 text-xs" />}
                                                    </button>
                                                    {subcategories.map((subcategory) => (
                                                        <button
                                                            key={subcategory.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedSubcategory(subcategory);
                                                                setSelectedCategory('all');
                                                                setIsCategoryDropdownOpen(false);
                                                            }}
                                                            className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold transition-colors ${
                                                                selectedSubcategory?.id === subcategory.id
                                                                    ? 'bg-orange-50 text-orange-600'
                                                                    : 'text-gray-700 hover:bg-gray-50'
                                                            }`}
                                                        >
                                                            <span className="flex items-center gap-2">
                                                                {subcategory.emoji && <span>{subcategory.emoji}</span>}
                                                                <span>{subcategory.name}</span>
                                                            </span>
                                                            {selectedSubcategory?.id === subcategory.id && <FaCheck className="text-orange-600 text-xs" />}
                                                        </button>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Desktop Category Bar (>= md) */}
                                    <div className="hidden md:block bg-white border rounded-lg shadow-sm mb-6 relative group overflow-hidden">
                                        <div className="px-4 py-4">
                                            <div className="relative">
                                                <div className="flex space-x-3 overflow-x-auto pb-2 scroll-smooth">
                                                    <button
                                                        onClick={() => { setSelectedCategory('all'); setSelectedSubcategory(null); }}
                                                        className={`flex-shrink-0 px-4 py-2 rounded-lg border font-medium transition-colors whitespace-nowrap ${!selectedSubcategory && selectedCategory === 'all'
                                                            ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                                                            : 'bg-white text-gray-700 border-gray-300 hover:border-orange-300 hover:text-orange-600'
                                                        }`}
                                                    >
                                                        All Items
                                                    </button>
                                                    {subcategories.map((subcategory) => (
                                                        <button
                                                            key={subcategory.id}
                                                            onClick={() => { setSelectedSubcategory(subcategory); setSelectedCategory('all'); }}
                                                            className={`flex-shrink-0 px-4 py-2 rounded-lg border font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${selectedSubcategory?.id === subcategory.id
                                                                ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                                                                : 'bg-white text-gray-700 border-gray-300 hover:border-orange-300 hover:text-orange-600'
                                                            }`}
                                                        >
                                                            {subcategory.emoji && <span>{subcategory.emoji}</span>}
                                                            {subcategory.name}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Items Display */}
                                    {sortedItems.length > 0 ? (
                                        <div className="space-y-8">
                                            {/* Dual section when 'all' is chosen and both types exist */}
                                            {prepFilter === 'all' && readyItems.length > 0 && madeToOrderItems.length > 0 ? (
                                                <>
                                                    {/* Section 1: Ready to Eat */}
                                                    <div className="bg-white md:rounded-3xl border border-gray-100 p-3 md:p-5">
                                                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
                                                            <div className="flex items-center gap-2.5">
                                                                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-500 text-white font-black text-sm shadow-sm">⚡</span>
                                                                <div>
                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                        <h2 className="text-base sm:text-lg font-black text-gray-900 tracking-tight">Ready to Eat</h2>
                                                                        <span className="text-[10px] sm:text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200 whitespace-nowrap">
                                                                            ready now ({readyItems.length})
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-xs text-gray-500">Already prepared and packaged — ready for immediate delivery or pickup</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                                                            {readyItems.map((item) => <FastFoodCard key={item.id} item={item} navigate={navigate} />)}
                                                        </div>
                                                    </div>

                                                    {/* Section 2: Prepared on Order */}
                                                    <div className="bg-white md:rounded-3xl border border-gray-100 p-3 md:p-5">
                                                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
                                                            <div className="flex items-center gap-2.5">
                                                                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-orange-500 text-white font-black text-sm shadow-sm">👨‍🍳</span>
                                                                <div>
                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                        <h2 className="text-base sm:text-lg font-black text-gray-900 tracking-tight">Prepared on Order</h2>
                                                                        <span className="text-[10px] sm:text-xs font-bold text-orange-700 bg-orange-100 px-2.5 py-0.5 rounded-full border border-orange-200 whitespace-nowrap">
                                                                            fresh kitchen ({madeToOrderItems.length})
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-xs text-gray-500">Prepared fresh when you order — check prep time on each meal</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                                                            {madeToOrderItems.map((item) => <FastFoodCard key={item.id} item={item} navigate={navigate} />)}
                                                        </div>
                                                    </div>
                                                </>
                                            ) : (
                                                /* Single filtered grid view */
                                                <div className="bg-white md:rounded-3xl border border-gray-100 p-3 md:p-5">
                                                    {prepFilter !== 'all' && (
                                                        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
                                                            <span className={`flex items-center justify-center w-7 h-7 rounded-lg text-white font-bold text-xs ${prepFilter === 'ready' ? 'bg-emerald-500' : 'bg-orange-500'}`}>
                                                                {prepFilter === 'ready' ? '⚡' : '👨‍🍳'}
                                                            </span>
                                                            <h2 className="text-base font-bold text-gray-900">
                                                                {prepFilter === 'ready' ? 'Ready to Eat (Instant)' : 'Prepared on Order (Fresh Kitchen)'}
                                                            </h2>
                                                            <span className="text-xs text-gray-400 ml-auto">
                                                                {(prepFilter === 'ready' ? readyItems : madeToOrderItems).length} items
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                                                        {(prepFilter === 'ready'
                                                            ? readyItems
                                                            : prepFilter === 'made_to_order'
                                                            ? madeToOrderItems
                                                            : sortedItems
                                                        ).map((item) => (
                                                            <FastFoodCard key={item.id} item={item} navigate={navigate} />
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 border-dashed">
                                            <div className="text-6xl mb-4">🍔</div>
                                            <h3 className="text-xl font-bold text-gray-700 mb-2">No items found</h3>
                                        </div>
                                    )}

                                    {loadingMore && (
                                        <div className="flex justify-center py-8">
                                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
                                        </div>
                                    )}
                                    <div ref={observerTarget} className="h-10"></div>
                                    {!hasMore && items.length > 0 && (
                                        <div className="text-center py-12 text-gray-400">
                                            <p className="font-medium">You've reached the end! 🎉</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <Footer />
                    </div>
            </div>
        </div>
    );
}
