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
            if (!item.isActive || item.status !== 'active') return false;

            const matchesCategory = selectedCategory === 'all' ||
                item.category === selectedCategory ||
                item.subcategory === selectedCategory;

            const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.kitchenVendor && item.kitchenVendor.toLowerCase().includes(searchTerm.toLowerCase()));

            return matchesCategory && matchesSearch;
        });
    }, [items, selectedCategory, searchTerm]);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-30">
            {/* Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                {[
                    { icon: <FaUtensils className="text-orange-500" />, label: "Freshly Made", desc: "Served Hot" },
                    { icon: <FaClock className="text-blue-500" />, label: "Avg Prep Time", desc: "15-20 Mins" },
                    { icon: <FaMotorcycle className="text-green-500" />, label: "Swift Delivery", desc: "Campus-wide" },
                    { icon: <FaStar className="text-yellow-500" />, label: "Top Rated", desc: "Campus Choice" }
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-3xl shadow-xl shadow-gray-200/50 flex flex-col items-center text-center gap-2 border border-white hover:border-orange-100 transition-colors">
                        <div className="text-2xl mb-1">{stat.icon}</div>
                        <span className="font-black text-gray-900 text-sm uppercase tracking-tight">{stat.label}</span>
                        <span className="text-xs text-gray-500 font-medium">{stat.desc}</span>
                    </div>
                ))}
            </div>

            {/* Top Navigation Category Bar */}
            <div className="mb-10">
                <div className="flex items-center gap-2 mb-4">
                    <FaFilter className="text-orange-500" />
                    <h2 className="font-black text-gray-900 uppercase tracking-tight text-sm">Filter by Category</h2>
                </div>
                {/* Horizontal Scrollable Container */}
                <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide snap-x touch-pan-x">
                    <button
                        onClick={() => setSelectedCategory('all')}
                        className={`px-6 py-3 rounded-2xl text-sm font-bold transition-all shadow-sm whitespace-nowrap flex-shrink-0 snap-start ${selectedCategory === 'all'
                            ? 'bg-orange-600 text-white shadow-orange-200 ring-2 ring-orange-600 ring-offset-2'
                            : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
                            }`}
                    >
                        All Items
                    </button>

                    {subcategories.map((sub) => (
                        <button
                            key={sub.id}
                            onClick={() => setSelectedCategory(sub.name)}
                            className={`px-6 py-3 rounded-2xl text-sm font-bold transition-all shadow-sm flex items-center gap-2 whitespace-nowrap flex-shrink-0 snap-start ${selectedCategory === sub.name
                                ? 'bg-orange-600 text-white shadow-orange-200 ring-2 ring-orange-600 ring-offset-2'
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
            <div className="pb-20">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-3xl font-black text-gray-900 leading-none">
                            {selectedCategory === 'all' ? 'Today\'s Specials' : selectedCategory}
                        </h2>
                        <p className="text-gray-500 mt-2 font-medium">
                            Showing {filteredItems.length} delicious choices
                        </p>
                    </div>
                    <div className="hidden md:flex gap-2">
                        <span className="px-4 py-2 bg-gray-100 rounded-full text-xs font-bold text-gray-600 uppercase">Real-time status</span>
                    </div>
                </div>

                {filteredItems.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
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
