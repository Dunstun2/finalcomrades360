import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import FastFoodCard from '../components/FastFoodCard';
import ItemCarousel from '../components/ItemCarousel';
import Footer from '../components/Footer';
import FastFoodHero from '../components/FastFoodHero';
import LiveMenuGrid from '../components/LiveMenuGrid';
import api from '../services/api';
import { platformService } from '../services/platformService';
import { fastFoodService } from '../services/fastFoodService';
import { FaHamburger, FaFilter, FaArrowLeft, FaUtensils, FaFire, FaArrowRight } from 'react-icons/fa';
import { useCategories } from '../contexts/CategoriesContext';


export default function FastFood() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedSubcategory, setSelectedSubcategory] = useState(null);
    const [userLocation, setUserLocation] = useState(null);
    const [activeTab, setActiveTab] = useState('all'); // 'all' or 'live'
    // Unified Campaign State
    const [activeCampaigns, setActiveCampaigns] = useState([]);
    const [campaignItems, setCampaignItems] = useState({}); // Map: itemId -> itemData
    const [currentCampaignIndex, setCurrentCampaignIndex] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');

    const navigate = useNavigate();
    const location = useLocation();

    // Derive search query from URL
    const urlSearchQuery = new URLSearchParams(location.search).get('search') || '';

    // Sync local search term with URL query
    useEffect(() => {
        if (urlSearchQuery) {
            setSearchTerm(urlSearchQuery);
        }
    }, [urlSearchQuery]);
    const observerTarget = useRef(null);
    const { categories } = useCategories();

    // Get Food & Drinks category and its subcategories
    const foodCategory = categories.find(cat => cat.name === 'Food & Drinks');
    const subcategories = foodCategory?.subcategories || [];

    // Load Hero Settings from backend config
    useEffect(() => {
        const loadHeroConfig = async () => {
            try {
                const res = await platformService.getConfig('fast_food_hero');
                if (res.success) {
                    const config = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;

                    // Filter and Sort Active Campaigns
                    const activeList = (config.campaigns || [])
                        .filter(c => c.active)
                        .sort((a, b) => b.priority - a.priority); // Highest priority first

                    if (activeList.length === 0) {
                        // No active campaigns
                        setActiveCampaigns([]);
                        return;
                    }

                    setActiveCampaigns(activeList);

                    // Fetch details for ALL linked items in parallel
                    const campaignsWithItems = activeList.filter(c => c.itemId && c.itemId !== 'none');
                    const uniqueItemIds = [...new Set(campaignsWithItems.map(c => c.itemId))];

                    if (uniqueItemIds.length > 0) {
                        const itemFetchPromises = uniqueItemIds.map(id => fastFoodService.getFastFoodById(id));
                        const itemResponses = await Promise.all(itemFetchPromises);

                        const itemsMap = {};
                        itemResponses.forEach((response, index) => {
                            if (response.success && response.data) {
                                itemsMap[uniqueItemIds[index]] = response.data;
                            }
                        });
                        setCampaignItems(itemsMap);
                    }
                }
            } catch (error) {
                console.error('Failed to load hero config:', error);
            }
        };
        loadHeroConfig();
    }, []);

    // Rotation Timer
    useEffect(() => {
        // Only rotate if we have multiple campaigns
        if (activeCampaigns.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentCampaignIndex(prev => (prev + 1) % activeCampaigns.length);
        }, 6000); // Rotate every 6 seconds

        return () => clearInterval(interval);
    }, [activeCampaigns.length]);

    // Derive current display data
    const currentCampaign = activeCampaigns.length > 0
        ? activeCampaigns[currentCampaignIndex]
        : { type: 'manual' }; // Empty config lets LiveMenuHero use default branding

    const currentHeroItem = currentCampaign.itemId ? campaignItems[currentCampaign.itemId] : null;

    // Handle URL parameters for subcategory filtering and Tab selection
    useEffect(() => {
        const urlParams = new URLSearchParams(location.search);
        const subcategoryId = urlParams.get('subcategoryId');
        const tabParam = urlParams.get('tab');

        if (tabParam === 'live') {
            setActiveTab('live');
        } else {
            setActiveTab('all');
        }

        if (subcategoryId && subcategories.length > 0) {
            const subcategory = subcategories.find(sub => sub.id === parseInt(subcategoryId));
            if (subcategory) {
                setSelectedSubcategory(subcategory);
            }
        }
    }, [location.search, subcategories]);

    const fetchFastFood = useCallback(async (pageNum, reset = false) => {
        try {
            if (reset) {
                setLoading(true);
            } else {
                setLoadingMore(true);
            }

            // For "Live" view, we might want all items to filter clientside, or a specific endpoint.
            // For now, fetching same data but logic might change.
            // Using limit 100 for Live view if needed, but pagination is safer.
            const limit = activeTab === 'live' ? '100' : '12';

            const params = new URLSearchParams({
                limit: limit,
                page: pageNum.toString(),
                view: 'public', // Force public view to hide pending items even for admins
                search: urlSearchQuery // Add search from URL
            });

            // Browse All shows everything including closed-shop items; Live Menu fetches all then filters client-side
            if (activeTab === 'all') {
                params.append('browseAll', 'true');
            }

            // Add subcategory filter if selected (Only for Browse All tab logic mainly)
            if (activeTab === 'all') {
                if (selectedSubcategory) {
                    // Use subcategoryId if backend supports it, or name
                    // Based on fastFoodRoutes, it probably filters by category name or subcategory id
                    // Let's send both to be safe or check backend params
                    params.append('subcategoryId', selectedSubcategory.id);
                }

                if (selectedCategory && selectedCategory !== 'all') {
                    params.append('category', selectedCategory);
                }
            }

            const isMarketingMode = localStorage.getItem('marketing_mode') === 'true';

            // Add location filters for smart menu
            if (userLocation) {
                params.append('userLat', userLocation.lat);
                params.append('userLng', userLocation.lng);
                params.append('sortBy', 'distance');
            }

            if (isMarketingMode) {
                params.append('marketing', 'true');
            }

            // use the configured api instance
            // api is imported from services/api
            const response = await api.get(`/fastfood?${params.toString()}`);



            if (response.data.success) {
                let fetchedItems = response.data.data;

                // Safety clientside filter for marketing mode
                if (isMarketingMode) {
                    fetchedItems = fetchedItems.filter(item => {
                        const commission = parseFloat(item.marketingCommission || 0);
                        return commission > 1;
                    });
                }

                if (reset) {
                    setItems(fetchedItems);
                } else {
                    setItems(prev => [...prev, ...fetchedItems]);
                }

                setHasMore(fetchedItems.length === parseInt(limit));
                setPage(pageNum);
            }
        } catch (error) {
            console.error('Failed to fetch fast food items:', error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [selectedCategory, selectedSubcategory, activeTab, userLocation, urlSearchQuery]);

    // Get user location on mount
    useEffect(() => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    console.log('📍 User Location Found:', position.coords.latitude, position.coords.longitude);
                    setUserLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                },
                (error) => {
                    console.warn('📍 Geolocation tracking failed/denied:', error.message);
                },
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            );
        }
    }, []);

    // Initial load and category/location/search change
    useEffect(() => {
        fetchFastFood(1, true);
    }, [selectedCategory, selectedSubcategory, activeTab, userLocation, urlSearchQuery, fetchFastFood]);

    // Infinite scroll observer (Only for Browse All tab)
    useEffect(() => {
        if (activeTab === 'live') return; // Live menu loads all at once or separate logic

        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
                    fetchFastFood(page + 1, false);
                }
            },
            { threshold: 0.1 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => {
            if (observerTarget.current) {
                observer.unobserve(observerTarget.current);
            }
        };
    }, [hasMore, loadingMore, loading, page, fetchFastFood, activeTab]);

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        // Optimize: Update URL using React Router
        const url = new URL(window.location);
        url.searchParams.set('tab', tab);
        navigate(`${url.pathname}${url.search}`, { replace: true });

        // Reset state for new view
        setPage(1);
        setItems([]);
        setLoading(true);
    };

    return (
        <div className="min-h-screen bg-[#FDFCFB]">
            {/* Back Button */}
            <div className="w-full px-0 md:px-4 py-4">
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center text-blue-600 hover:text-blue-800 font-medium transition-colors ml-4 md:ml-0"
                >
                    <FaArrowLeft className="mr-2" />
                    Back to Homepage
                </button>
            </div>

            {/* Hero Section: Use FastFoodHero for fast food banner */}
            <FastFoodHero
                settings={activeCampaigns[currentCampaignIndex] || {}}
                item={currentHeroItem}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                loading={activeCampaigns.length === 0}
            />

            {/* Rotation Indicators (Dots) */}
            {activeCampaigns.length > 1 && (
                <div className="flex justify-center mt-4 mb-6 relative z-20 gap-2 px-3 md:px-4">
                    {activeCampaigns.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setCurrentCampaignIndex(idx)}
                            className={`h-2 rounded-full transition-all duration-300 ${idx === currentCampaignIndex ? 'w-8 bg-orange-600' : 'w-2 bg-gray-300 hover:bg-orange-300'
                                }`}
                            aria-label={`Go to slide ${idx + 1}`}
                        />
                    ))}
                </div>
            )}

            {/* Tab Navigation */}
            <div className="flex justify-center mt-4 mb-6 px-3 md:px-4 relative z-20">
                <div className="w-full sm:w-auto bg-white/90 backdrop-blur-md p-1.5 rounded-2xl shadow-xl border border-white/50 flex space-x-2">
                    <button
                        onClick={() => handleTabChange('all')}
                        className={`flex-1 sm:flex-initial flex items-center justify-center px-4 sm:px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === 'all'
                            ? 'bg-gray-900 text-white shadow-lg shadow-gray-200 scale-105'
                            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                    >
                        <FaUtensils className="mr-2" />
                        Browse All
                    </button>
                    <button
                        onClick={() => handleTabChange('live')}
                        className={`flex-1 sm:flex-initial flex items-center justify-center px-4 sm:px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === 'live'
                            ? 'bg-orange-600 text-white shadow-lg shadow-orange-200 scale-105'
                            : 'text-gray-500 hover:text-orange-600 hover:bg-orange-50'
                            }`}
                    >
                        <FaFire className="mr-2" />
                        Live Menu
                    </button>
                </div>
            </div>

            <div className="w-full px-0 md:px-4 py-4 md:py-6 pb-12">
                {loading && items.length === 0 ? (
                    /* Initial Loading Skeleton */
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 animate-pulse">
                        {[...Array(12)].map((_, i) => (
                            <div key={i} className="bg-gray-200 rounded-xl h-64"></div>
                        ))}
                    </div>
                ) : activeTab === 'live' ? (
                    /* Live Menu Grid View */
                    <LiveMenuGrid items={items} searchTerm={searchTerm} navigate={navigate} />
                ) : (
                    /* Default Browse All View */
                    <div className={`transition-opacity duration-300 ${loading ? 'opacity-50' : 'opacity-100'}`}>

                        {/* Category Filter for Browse All */}
                        <div className="bg-white md:rounded-2xl shadow-sm border-0 md:border border-gray-100 p-3 md:p-4 mb-4 md:mb-8">
                            <div className="flex items-center gap-2 mb-3">
                                <FaFilter className="text-gray-400" />
                                <h2 className="font-bold text-gray-900">Filter Catalogue</h2>
                            </div>
                            {/* Horizontal Scrollable Container */}
                            <div className="relative group">
                                <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white to-transparent pointer-events-none md:hidden z-10" />

                                <div className="flex items-center justify-between mb-2 md:hidden px-1">
                                    <span className="text-[10px] text-gray-400 font-medium animate-pulse flex items-center gap-1">
                                        <FaArrowRight size={8} /> Scroll to see all categories
                                    </span>
                                </div>

                                <div className="flex gap-2 overflow-x-auto pb-4 pt-1 scrollbar-hide snap-x touch-pan-x relative px-1">
                                    <button
                                        onClick={() => {
                                            setSelectedCategory('all');
                                            setSelectedSubcategory(null);
                                        }}
                                        className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap flex-shrink-0 snap-start shadow-sm border ${!selectedSubcategory && selectedCategory === 'all'
                                            ? 'bg-orange-600 text-white border-orange-600 shadow-orange-200'
                                            : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-200'
                                            }`}
                                    >
                                        All Items
                                    </button>
                                    {subcategories.map((subcategory) => (
                                        <button
                                            key={subcategory.id}
                                            onClick={() => {
                                                setSelectedSubcategory(subcategory);
                                                setSelectedCategory('all');
                                            }}
                                            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap flex-shrink-0 snap-start shadow-sm border ${selectedSubcategory?.id === subcategory.id
                                                ? 'bg-orange-600 text-white border-orange-600 shadow-orange-200'
                                                : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-200'
                                                }`}
                                        >
                                            {subcategory.emoji && <span className="mr-2">{subcategory.emoji}</span>}
                                            {subcategory.name}
                                        </button>
                                    ))}
                                    {/* Spacing element for better scrolling on mobile */}
                                    <div className="w-4 flex-shrink-0" />
                                </div>
                            </div>
                        </div>

                        {/* Items Display */}
                        {/* Items Display Logic */}
                        {(() => {
                            const oneWeekAgo = new Date();
                            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

                            // Split items into New Arrivals vs Standard
                            // IMPORTANT: Do NOT filter by availability here. 'Browse All' must show all listed fast food items, regardless of open/closed status.
                            const featuredItems = items.filter(item => item.createdAt && new Date(item.createdAt) > oneWeekAgo);
                            const allGridItems = items;

                            return items.length > 0 ? (
                                <>
                                    {/* Featured Items (New Arrivals) - Infinite Scroll Carousel */}
                                    {featuredItems.length > 0 && (
                                        <div className="mb-12">
                                            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                                <FaFire className="text-orange-500" /> New Arrivals
                                            </h3>
                                            <div className="bg-orange-50/50 p-2 md:p-4 rounded-none md:rounded-3xl border-0 md:border border-orange-100">
                                                <ItemCarousel
                                                    items={featuredItems}
                                                    CardComponent={FastFoodCard}
                                                    cardProps={{ navigate }}
                                                    itemsPerView={5} // Fallback to lg
                                                    gap={8}
                                                    responsive={{
                                                        0: 2,    // mobile (<640px)
                                                        640: 3,  // sm
                                                        768: 4,  // md
                                                        1024: 5, // lg
                                                        1280: 6  // xl
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* All Items Grid */}
                                    {allGridItems.length > 0 && (
                                        <div className="bg-white md:rounded-3xl border-0 md:border border-gray-100 p-0 md:p-4">
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                                                {allGridItems.map((item) => (
                                                    <FastFoodCard key={item.id} item={item} navigate={navigate} />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 border-dashed">
                                    <div className="text-6xl mb-4">🍔</div>
                                    <h3 className="text-xl font-bold text-gray-700 mb-2">No items found</h3>
                                    <p className="text-gray-500">Try selecting a different category</p>
                                </div>
                            );
                        })()}

                        {/* Loading More Indicator */}
                        {/* Loading More Indicator */}
                        {loadingMore && (
                            <div className="flex justify-center py-8">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
                            </div>
                        )}

                        {/* Infinite Scroll Trigger */}
                        <div ref={observerTarget} className="h-10"></div>

                        {/* End Message */}
                        {!hasMore && items.length > 0 && (
                            <div className="text-center py-12 text-gray-400">
                                <div className="w-16 h-1 bg-gray-200 mx-auto rounded-full mb-4"></div>
                                <p className="font-medium">You've reached the end! 🎉</p>
                            </div>
                        )}
                    </div>
                )}

                <Footer />
            </div>
        </div>
    );
}
