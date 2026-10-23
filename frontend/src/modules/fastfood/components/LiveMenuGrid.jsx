import React, { useState, useMemo } from 'react';
import { FaChevronDown, FaCheck } from 'react-icons/fa';

import FastFoodCard from '@/modules/fastfood/components/FastFoodCard';
import { useCategories } from '@/contexts/CategoriesContext';
import { fastFoodService } from '@/modules/fastfood/services/fastFoodService';

const LiveMenuGrid = ({ items = [], searchTerm = "", navigate }) => {
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
    const { categories } = useCategories();

    const [prepFilter, setPrepFilter] = useState('all'); // 'all' | 'ready' | 'made_to_order'

    // Get Food & Drinks subcategories
    const foodCategory = categories.find(cat => cat.name === 'Food & Drinks');
    const subcategories = foodCategory?.subcategories || [];

    // Filter Logic: OPEN/Live items + Category + Search
    const filteredItems = useMemo(() => {
        return items.filter(item => {
            // Strict availability check for Live Menu
            const availability = fastFoodService.getAvailabilityStatus(item);
            const isOpen = availability.state === 'OPEN';

            // Primary goal is "Live" = "Open Now"
            if (!isOpen) return false;

            // Also check standard active status
            // Relaxed: allow both 'active' and 'approved' statuses
            const status = item.status?.toLowerCase();
            const reviewStatus = item.reviewStatus?.toLowerCase();
            const isApproved = item.approved || status === 'approved' || status === 'active' || reviewStatus === 'approved' || reviewStatus === 'active';
            
            if (!item.isActive || !isApproved) return false;

            const matchesCategory = selectedCategory === 'all' ||
                item.category === selectedCategory ||
                item.subcategory === selectedCategory;

            const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.kitchenVendor && item.kitchenVendor.toLowerCase().includes(searchTerm.toLowerCase()));

            return matchesCategory && matchesSearch;
        });
    }, [items, selectedCategory, searchTerm]);

    const readyItems = useMemo(() => {
        return filteredItems.filter(item => item.preparationType === 'ready');
    }, [filteredItems]);

    const madeToOrderItems = useMemo(() => {
        return filteredItems.filter(item => item.preparationType !== 'ready');
    }, [filteredItems]);

    const displayItems = useMemo(() => {
        if (prepFilter === 'ready') return readyItems;
        if (prepFilter === 'made_to_order') return madeToOrderItems;
        return filteredItems;
    }, [prepFilter, readyItems, madeToOrderItems, filteredItems]);

    return (
        <div className="max-w-7xl mx-auto px-0 md:px-4 relative z-30">

            {/* Preparation Mode Filter Pills */}
            <div className="w-full grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2 mb-3 px-4 md:px-0">
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
                    <span>All Meals ({filteredItems.length})</span>
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
                <div className="flex sm:hidden justify-center -mt-1 mb-3 px-4 md:px-0">
                    <button
                        type="button"
                        onClick={() => setPrepFilter('all')}
                        className="text-[11px] font-bold text-gray-600 hover:text-gray-900 bg-white hover:bg-gray-100 px-3 py-1 rounded-full flex items-center gap-1 transition-all shadow-sm border border-gray-200"
                    >
                        <span>✕ Show all meals ({filteredItems.length})</span>
                    </button>
                </div>
            )}

            {/* Mobile Category Dropdown Menu (< md) */}
            <div className="relative md:hidden mb-4 px-4 md:px-0">
                <button
                    type="button"
                    onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm text-sm font-bold text-gray-800 transition-all hover:border-orange-300 active:scale-[0.99]"
                >
                    <div className="flex items-center gap-2.5 truncate">
                        <span className="text-base">
                            {selectedCategory === 'all'
                                ? '🍽️'
                                : (subcategories.find(s => s.name === selectedCategory)?.emoji || '🍔')}
                        </span>
                        <span className="truncate">
                            {selectedCategory === 'all' ? 'All Categories' : selectedCategory}
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
                        <div className="absolute top-full left-4 right-4 mt-1.5 z-50 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 max-h-72 overflow-y-auto divide-y divide-gray-50 animate-in fade-in slide-in-from-top-2 duration-150">
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
                                    <span>All Items</span>
                                </span>
                                {selectedCategory === 'all' && <FaCheck className="text-orange-600 text-xs" />}
                            </button>
                            {subcategories.map((sub) => (
                                <button
                                    key={sub.id}
                                    type="button"
                                    onClick={() => {
                                        setSelectedCategory(sub.name);
                                        setIsCategoryDropdownOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold transition-colors ${
                                        selectedCategory === sub.name
                                            ? 'bg-orange-50 text-orange-600'
                                            : 'text-gray-700 hover:bg-gray-50'
                                    }`}
                                >
                                    <span className="flex items-center gap-2">
                                        {sub.emoji && <span>{sub.emoji}</span>}
                                        <span>{sub.name}</span>
                                    </span>
                                    {selectedCategory === sub.name && <FaCheck className="text-orange-600 text-xs" />}
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Desktop Navigation Category Bar (>= md) */}
            <div className="hidden md:block mb-6 px-4 md:px-0">
                <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide snap-x touch-pan-x">
                    <button
                        onClick={() => setSelectedCategory('all')}
                        className={`px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-sm whitespace-nowrap flex-shrink-0 snap-start ${selectedCategory === 'all'
                            ? 'bg-orange-600 text-white shadow-orange-200'
                            : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
                            }`}
                    >
                        All Items
                    </button>

                    {subcategories.map((sub) => (
                        <button
                            key={sub.id}
                            onClick={() => setSelectedCategory(sub.name)}
                            className={`px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-sm flex items-center gap-2 whitespace-nowrap flex-shrink-0 snap-start ${selectedCategory === sub.name
                                ? 'bg-orange-600 text-white shadow-orange-200'
                                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
                                }`}
                        >
                            <span>{sub.emoji}</span>
                            <span>{sub.name}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="pb-20 px-0 md:px-0">

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
                                            <p className="text-[11px] text-gray-500">Cooked and packed. Ready for immediate pickup or delivery</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                                    {readyItems.map((item) => (
                                        <FastFoodCard
                                            key={`live-ready-${item.id}`}
                                            item={item}
                                            navigate={navigate}
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
                                            <p className="text-[11px] text-gray-500">Prepared fresh once ordered with estimated cooking time</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                                    {madeToOrderItems.map((item) => (
                                        <FastFoodCard
                                            key={`live-order-${item.id}`}
                                            item={item}
                                            navigate={navigate}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                            {displayItems.map((item) => (
                                <FastFoodCard
                                    key={item.id}
                                    item={item}
                                    navigate={navigate}
                                />
                            ))}
                        </div>
                    )
                ) : (
                    <div className="bg-white rounded-[2rem] p-20 text-center shadow-xl shadow-gray-200/50 border border-white">
                        <div className="text-6xl mb-6">🍽️</div>
                        <h3 className="text-2xl font-black text-gray-900 mb-2 uppercase">No matches found</h3>
                        <p className="text-gray-500 font-medium">No items are currently open and available. Please check back later!</p>
                        <button
                            onClick={() => { setSelectedCategory('all'); setPrepFilter('all'); }}
                            className="mt-8 px-8 py-3 bg-gray-900 text-white rounded-2xl font-bold hover:bg-orange-600 transition-colors shadow-lg"
                        >
                            Reset Filters
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LiveMenuGrid;
