import React, { useState, useMemo } from 'react';
import { FaUtensils, FaClock, FaMotorcycle, FaStar, FaFilter, FaChevronRight } from 'react-icons/fa';
import FastFoodCard from './FastFoodCard';
import { useCategories } from '../contexts/CategoriesContext';
import { fastFoodService } from '../services/fastFoodService';

const LiveMenuGrid = ({ items = [], searchTerm = "", navigate }) => {
    const [selectedCategory, setSelectedCategory] = useState('all');
    const { categories } = useCategories();

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

    return (
        <div className="max-w-7xl mx-auto px-0 md:px-4 relative z-30">
            {/* Stats Bar (More Compact) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8 px-4 md:px-0">
                {[
                    { icon: <FaUtensils className="text-orange-500" />, label: "Freshly Made", desc: "Served Hot" },
                    { icon: <FaClock className="text-blue-500" />, label: "Avg Prep Time", desc: "15-20 Mins" },
                    { icon: <FaMotorcycle className="text-green-500" />, label: "Swift Delivery", desc: "Campus-wide" },
                    { icon: <FaStar className="text-yellow-500" />, label: "Top Rated", desc: "Campus Choice" }
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center gap-1 hover:border-orange-100 transition-colors">
                        <div className="text-xl mb-1">{stat.icon}</div>
                        <span className="font-bold text-gray-900 text-[10px] uppercase tracking-tight">{stat.label}</span>
                        <span className="text-[10px] text-gray-400">{stat.desc}</span>
                    </div>
                ))}
            </div>

            {/* Top Navigation Category Bar */}
            <div className="mb-6 px-4 md:px-0">
                <div className="flex items-center gap-2 mb-4">
                    <FaFilter className="text-orange-500" />
                    <h2 className="font-black text-gray-900 uppercase tracking-tight text-sm">Filter by Category</h2>
                </div>
                {/* Horizontal Scrollable Container */}
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
                <div className="flex items-center justify-between mb-6 px-4 md:px-0">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 leading-none">
                            {selectedCategory === 'all' ? 'Today\'s Specials' : selectedCategory}
                        </h2>
                        <p className="text-gray-400 mt-2 text-xs font-medium uppercase tracking-wider">
                            {filteredItems.length} items open now
                        </p>
                    </div>
                </div>

                {filteredItems.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                        {filteredItems.map((item) => (
                            <FastFoodCard
                                key={item.id}
                                item={item}
                                navigate={navigate}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-[2rem] p-20 text-center shadow-xl shadow-gray-200/50 border border-white">
                        <div className="text-6xl mb-6">🍽️</div>
                        <h3 className="text-2xl font-black text-gray-900 mb-2 uppercase">No matches found</h3>
                        <p className="text-gray-500 font-medium">No items are currently open and available. Please check back later!</p>
                        <button
                            onClick={() => { setSelectedCategory('all'); }}
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
