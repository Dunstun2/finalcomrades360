import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FastFoodCard from '@/modules/fastfood/components/FastFoodCard';
import { FaHamburger, FaChevronDown, FaCheck } from 'react-icons/fa';
import { useCategories } from '@/contexts/CategoriesContext';
import api from '@/shared/services/api';
import { isFastFoodOpen } from '@/utils/availabilityUtils';

export default function FastFoodSection({ initialData = null, initialTotal = 0 }) {
    const [items, setItems] = useState(initialData || []);
    const [loading, setLoading] = useState(!initialData);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(initialTotal > (initialData?.length || 0) || (initialData?.length || 0) >= 12);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
    const [prepFilter, setPrepFilter] = useState('all'); // 'all', 'ready', 'made_to_order'
    const navigate = useNavigate();
    const { categories } = useCategories();
    const [currentTime, setCurrentTime] = useState(new Date());

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

    const displayItems = React.useMemo(() => {
        if (prepFilter === 'ready') return readyItems;
        if (prepFilter === 'made_to_order') return madeToOrderItems;
        return sortedItems;
    }, [prepFilter, readyItems, madeToOrderItems, sortedItems]);

    // Determine marketing mode
    const isMarketingMode = localStorage.getItem('marketing_mode') === 'true';
    const hasBootstrappedFromInitial = Array.isArray(initialData) && initialData.length > 0;

    // Helper to get items per row based on current layout (matches Home.jsx)
    const getItemsPerRow = () => {
        const width = window.innerWidth;
        if (width >= 1280) return 6; // xl
        if (width >= 1024) return 5; // lg
        if (width >= 768) return 4;  // md
        if (width >= 640) return 3;  // sm
        return 2; // mobile
    };

    // Get subcategories for specifically 'Food & Drinks' / 'Fast Food'
    const getFoodSubcategories = () => {
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
    };

    const foodSubcategories = getFoodSubcategories();

    const fetchFastFood = async (isLoadMore = false) => {
        try {
            if (isLoadMore) setLoadingMore(true);
            else if (items.length === 0) setLoading(true);

            const itemsPerRow = getItemsPerRow();
            const limit = itemsPerRow * 3; // Always append exactly 3 rows per load
            const pageNum = isLoadMore ? page + 1 : 1;

            const params = new URLSearchParams({
                limit: limit.toString(),
                page: pageNum.toString(),
                view: 'public'
            });

            // Match FastFood page behavior: include closed-shop items in browse listing.
            params.append('browseAll', 'true');

            if (selectedCategory !== 'all') {
                params.append('category', selectedCategory);
            }

            if (isMarketingMode) {
                params.append('marketing', 'true');
            }

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

                const nextItems = isLoadMore ? [...items, ...fetchedItems] : fetchedItems;
                setItems(nextItems);

                // Check if we have more to load
                const total = response.data.pagination?.totalItems || response.data.pagination?.totalFastFood || response.data.totalCount || initialTotal || 0;
                const updatedCount = nextItems.length;
                // Fix: if fetchedItems > 0 and total > updatedCount then we likely have more items.
                // Using fetchedItems.length >= limit causes bugs if backend filters items after pagination
                setHasMore(total > updatedCount && fetchedItems.length > 0);
                setPage(pageNum);
            }
        } catch (error) {
            console.error('Failed to fetch fast food items:', error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        // Sync items with initialData if provided and we haven't modified selectedCategory
        if (selectedCategory === 'all' && initialData && initialData.length > 0 && items.length === 0) {
            setItems(initialData);
            setHasMore(initialTotal > initialData.length);
            setLoading(false);
        }
    }, [initialData, initialTotal]);

    useEffect(() => {
        setPage(1);
        if (hasBootstrappedFromInitial && selectedCategory === 'all' && items.length === 0) {
            setHasMore(initialTotal > (initialData?.length || 0));
            // Use initial chunk immediately (3 rows), wait for user to click Load More
            setItems(initialData);
            setLoading(false);
            // Hydrate in background so homepage section matches current FastFood page visibility rules.
            fetchFastFood(false);
            return;
        }

        fetchFastFood(false);
    }, [selectedCategory]);

    const handleLoadMore = () => {
        if (!loadingMore && hasMore) {
            fetchFastFood(true);
        }
    };

    if (loading && items.length === 0) {
        return (
            <div className="w-full py-12 px-0 md:px-4">
                <div className="h-8 w-48 bg-gray-200 rounded mb-8 animate-pulse"></div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="h-64 bg-gray-100 rounded-lg animate-pulse"></div>
                    ))}
                </div>
            </div>
        );
    }

    if (items.length === 0 && selectedCategory === 'all' && !isMarketingMode) return null;

    return (
        <section className="w-full py-4 px-0 md:px-4 bg-orange-50/50 rounded-3xl my-2 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
                        <span className="text-orange-600">
                            <FaHamburger size={28} />
                        </span>
                        Special Dishes
                    </h2>
                </div>
                <button
                    onClick={() => navigate('/fastfood')}
                    className="text-orange-600 hover:text-orange-800 font-semibold flex items-center gap-1 group"
                >
                    View all
                    <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>

            {/* Mobile Category Dropdown Menu (< md) */}
            <div className="relative md:hidden mb-4">
                <button
                    type="button"
                    onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm text-sm font-bold text-gray-800 transition-all hover:border-orange-300 active:scale-[0.99]"
                >
                    <div className="flex items-center gap-2.5 truncate">
                        <span className="text-base">
                            {selectedCategory === 'all'
                                ? '🍽️'
                                : (foodSubcategories.find(s => s.name === selectedCategory)?.emoji || '🍔')}
                        </span>
                        <span className="truncate">
                            {selectedCategory === 'all' ? 'All Cravings' : selectedCategory}
                        </span>
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
                                    setIsCategoryDropdownOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold transition-colors ${
                                    selectedCategory === 'all'
                                        ? 'bg-orange-50 text-orange-600'
                                        : 'text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                <span className="flex items-center gap-2">
                                    <span>🍽️</span>
                                    <span>All Cravings</span>
                                </span>
                                {selectedCategory === 'all' && <FaCheck className="text-orange-600 text-xs" />}
                            </button>
                            {foodSubcategories.map((subcategory) => (
                                <button
                                    key={subcategory.id}
                                    type="button"
                                    onClick={() => {
                                        setSelectedCategory(subcategory.name);
                                        setIsCategoryDropdownOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold transition-colors ${
                                        selectedCategory === subcategory.name
                                            ? 'bg-orange-50 text-orange-600'
                                            : 'text-gray-700 hover:bg-gray-50'
                                    }`}
                                >
                                    <span className="flex items-center gap-2">
                                        {subcategory.emoji && <span>{subcategory.emoji}</span>}
                                        <span>{subcategory.name}</span>
                                    </span>
                                    {selectedCategory === subcategory.name && <FaCheck className="text-orange-600 text-xs" />}
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Desktop Navigation Category Bar (>= md) */}
            <div className="hidden md:block bg-white border rounded-lg shadow-sm mb-6 relative group overflow-hidden">
                <div className="px-4 py-4">
                    <div className="relative">
                        <div className="flex space-x-3 overflow-x-auto pb-2 scroll-smooth">
                            <button
                                onClick={() => setSelectedCategory('all')}
                                className={`flex-shrink-0 px-4 py-2 rounded-lg border font-medium transition-colors whitespace-nowrap ${selectedCategory === 'all'
                                    ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                                    : 'bg-white text-gray-700 border-gray-300 hover:border-orange-300 hover:text-orange-600'
                                    }`}
                            >
                                All Cravings
                            </button>
                            {foodSubcategories.map((subcategory) => (
                                <button
                                    key={subcategory.id}
                                    onClick={() => setSelectedCategory(subcategory.name)}
                                    className={`flex-shrink-0 px-4 py-2 rounded-lg border font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${selectedCategory === subcategory.name
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

            {/* Preparation Mode Filter Pills */}
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

            <div className={`transition-opacity duration-300 ${loading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                {displayItems.length > 0 ? (
                    prepFilter === 'all' && readyItems.length > 0 && madeToOrderItems.length > 0 ? (
                        <div className="space-y-8">
                            {/* Section 1: Ready to Eat */}
                            <div className="bg-emerald-50/40 rounded-2xl p-3 sm:p-4 border border-emerald-100/60">
                                <div className="flex items-center justify-between mb-3 px-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">⚡</span>
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="text-base sm:text-lg font-bold text-gray-900">Ready to Eat</h3>
                                                <span className="text-[10px] sm:text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200 whitespace-nowrap">
                                                    ready now ({readyItems.length})
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-gray-500">Pre-cooked and packaged meals ready for instant pickup or delivery</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                                    {readyItems.map((item) => (
                                        <FastFoodCard
                                            key={`ready-${item.id}`}
                                            item={item}
                                            navigate={navigate}
                                            className="w-full"
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Section 2: Prepared on Order */}
                            <div className="bg-orange-50/40 rounded-2xl p-3 sm:p-4 border border-orange-100/60">
                                <div className="flex items-center justify-between mb-3 px-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">👨‍🍳</span>
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="text-base sm:text-lg font-bold text-gray-900">Prepared on Order</h3>
                                                <span className="text-[10px] sm:text-xs font-bold text-orange-700 bg-orange-100 px-2.5 py-0.5 rounded-full border border-orange-200 whitespace-nowrap">
                                                    fresh kitchen ({madeToOrderItems.length})
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-gray-500">Prepared fresh once you order with estimated cooking time</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                                    {madeToOrderItems.map((item) => (
                                        <FastFoodCard
                                            key={`order-${item.id}`}
                                            item={item}
                                            navigate={navigate}
                                            className="w-full"
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                            {displayItems.map((item) => (
                                <FastFoodCard
                                    key={item.id}
                                    item={item}
                                    navigate={navigate}
                                    className="w-full"
                                />
                            ))}
                            {loadingMore && Array.from({ length: getItemsPerRow() * 2 }).map((_, i) => (
                                <div key={`more-skeleton-${i}`} className="h-64 bg-gray-100 rounded-lg animate-pulse"></div>
                            ))}
                        </div>
                    )
                ) : (
                    <div className="text-center py-10 text-gray-500 bg-white rounded-xl shadow-sm border border-gray-100 italic">
                        <p>No items found matching this filter.</p>
                    </div>
                )}
            </div>

            {!loading && items.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-4 mt-6 mb-2">
                    {hasMore && !loadingMore && (
                        <button
                            onClick={handleLoadMore}
                            className="px-4 py-2 sm:px-8 sm:py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition-all shadow-lg hover:shadow-orange-200 flex items-center space-x-2 active:scale-95 group animate-in fade-in zoom-in duration-300 text-xs sm:text-base"
                        >
                            <span>Load More</span>
                            <svg className="h-5 w-5 transition-transform group-hover:translate-y-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                    )}

                    <button
                        onClick={() => navigate('/fastfood')}
                        className="px-4 py-2 sm:px-8 sm:py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-200 flex items-center space-x-2 active:scale-95 group text-xs sm:text-base"
                    >
                        <span>View All</span>
                        <svg className="h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                    </button>
                </div>
            )}
        </section>
    );
}
