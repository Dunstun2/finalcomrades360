import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaShoppingCart, FaSignOutAlt, FaSearch, FaLink, FaCheck } from 'react-icons/fa';
import { useCart } from '../contexts/CartContext';
import { useCategories } from '../contexts/CategoriesContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './ui/use-toast';

export default function MarketingNavbar() {
    const { cart } = useCart();
    // Marketing navbar always lives on the products context
    const cartBadgeCount = useMemo(() => {
        const items = Array.isArray(cart?.items) ? cart.items : [];
        return items.filter((item) => item?.itemType !== 'fastfood').length;
    }, [cart?.items]);
    const navigate = useNavigate();
    const { getCategoriesWithSubcategories } = useCategories();
    const categoriesWithSubcategories = getCategoriesWithSubcategories();

    // State for search and categories
    const [searchQuery, setSearchQuery] = useState("");
    const [showCategories, setShowCategories] = useState(false);
    const [activeCategory, setActiveCategory] = useState(null);

    const { user } = useAuth();
    const { toast } = useToast();
    const categoriesRef = useRef(null);
    const [copied, setCopied] = useState(false);

    const handleCopyLink = () => {
        if (!user?.referralCode) {
            toast({
                title: "No Referral Code",
                description: "You don't have a referral code yet.",
                variant: "destructive"
            });
            return;
        }

        const url = `${window.location.origin}/?ref=${user.referralCode}`;
        navigator.clipboard.writeText(url).then(() => {
            setCopied(true);
            toast({
                title: "Link Copied!",
                description: "Referral link copied to clipboard.",
                duration: 2000
            });
            setTimeout(() => setCopied(false), 2000);
        }).catch(() => {
            toast({
                title: "Failed to Copy",
                description: "Could not copy link to clipboard.",
                variant: "destructive"
            });
        });
    };

    const handleExit = () => {
        localStorage.removeItem('marketing_mode');
        window.location.reload();
    };

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (categoriesRef.current && !categoriesRef.current.contains(event.target)) {
                setShowCategories(false);
                setActiveCategory(null);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSearch = () => {
        if (searchQuery.trim()) {
            navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
        }
    };

    return (
        <nav className="bg-blue-900 border-b border-blue-800 shadow-md fixed top-0 left-0 w-full z-50 text-white">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex justify-between items-center h-16 gap-4">
                    {/* Left: Branding & Categories */}
                    <div className="flex items-center space-x-6">
                        <Link to="/" className="text-xl font-bold tracking-tight flex items-center gap-2 flex-shrink-0">
                            <span className="bg-white text-blue-900 px-2 py-1 rounded text-xs uppercase font-black tracking-widest hidden md:block">Marketing Mode</span>
                            <span>Comrades360</span>
                        </Link>

                        {/* Categories Dropdown */}
                        <div className="relative pointer-events-auto" ref={categoriesRef}>
                            <button
                                onClick={() => setShowCategories(!showCategories)}
                                className="px-3 py-2 hover:bg-blue-800 rounded flex items-center transition-colors text-sm font-medium"
                            >
                                <span>Categories</span>
                                <span className="ml-1">▾</span>
                            </button>

                            {showCategories && (
                                <div className="absolute left-0 mt-2 bg-white text-gray-800 border rounded shadow-xl z-50 w-64 py-1">
                                    <ul>
                                        {/* Removed View All Products top link */}
                                        {categoriesWithSubcategories.map((cat, i) => {
                                            const hasSub = cat.subcategories?.length > 0;
                                            return (
                                                <li key={cat.id} className="relative group">
                                                    <div
                                                        className={`px-4 py-3 hover:bg-blue-50 cursor-pointer flex justify-between items-center transition-colors ${activeCategory === i ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}
                                                        onClick={(e) => {
                                                            if (hasSub) {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                setActiveCategory(activeCategory === i ? null : i);
                                                            } else {
                                                                navigate(`/?categoryId=${cat.id}`);
                                                                setShowCategories(false);
                                                            }
                                                        }}
                                                    >
                                                        <div className="flex items-center">
                                                            {cat.emoji && <span className="mr-3 text-lg">{cat.emoji}</span>}
                                                            <span>{cat.name}</span>
                                                        </div>
                                                        {hasSub && (
                                                            <svg className={`h-4 w-4 transition-transform duration-200 ${activeCategory === i ? 'rotate-0' : '-rotate-90'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                            </svg>
                                                        )}
                                                    </div>

                                                    {/* Subcategories */}
                                                    {activeCategory === i && hasSub && (
                                                        <div className="bg-gray-50 border-y border-gray-100 py-1">
                                                            {/* Removed View All Category link */}
                                                            {cat.subcategories.map((sub) => (
                                                                <Link
                                                                    key={sub.id}
                                                                    to={
                                                                        cat.name === 'Student Services' ? `/services?subcategoryId=${sub.id}` :
                                                                            cat.name === 'Food & Drinks' ? `/fastfood?subcategoryId=${sub.id}` :
                                                                                `/products?categoryId=${cat.id}&subcategoryId=${sub.id}`
                                                                    }
                                                                    className="block px-8 py-2 text-sm text-gray-600 hover:bg-white hover:text-blue-600 transition-colors"
                                                                    onClick={() => setShowCategories(false)}
                                                                >
                                                                    {sub.name}
                                                                </Link>
                                                            ))}
                                                        </div>
                                                    )}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Center: Search Bar */}
                    <div className="flex-1 max-w-xl mx-auto px-4 hidden md:block">
                        <div className="relative flex w-full text-gray-900">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                placeholder="Search products, services, food..."
                                className="w-full px-4 py-2 rounded-l-md border-0 focus:ring-2 focus:ring-blue-300 outline-none"
                            />
                            <button
                                onClick={handleSearch}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-r-md transition-colors"
                            >
                                <FaSearch />
                            </button>
                        </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center space-x-4 flex-shrink-0">
                        {/* Marketing Orders Link */}
                        <Link
                            to="/marketing?tab=orders"
                            className="text-blue-100 hover:text-white font-medium text-sm hidden sm:block transition-colors"
                        >
                            My Orders
                        </Link>

                        {/* Exit Button */}
                        <button
                            onClick={handleExit}
                            className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-full font-bold text-sm transition-transform active:scale-95 shadow-sm whitespace-nowrap"
                        >
                            <span className="hidden sm:inline">Exit Mode</span>
                            <FaSignOutAlt />
                        </button>

                        {/* Copy Link Button */}
                        <button
                            onClick={handleCopyLink}
                            className="flex items-center space-x-2 bg-blue-800 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm transition-colors border border-blue-700"
                            title="Copy Referral Link"
                        >
                            {copied ? <FaCheck className="w-3 h-3" /> : <FaLink className="w-3 h-3" />}
                            <span className="hidden lg:inline">{copied ? 'Copied' : 'Copy Link'}</span>
                        </button>
                        {/* Mobile Search Icon (visible only on small screens) */}
                        <button
                            onClick={() => navigate('/search')}
                            className="md:hidden p-2 text-blue-100 hover:text-white"
                        >
                            <FaSearch className="text-xl" />
                        </button>

                        {/* Cart Icon */}
                        <Link
                            to="/cart"
                            className="relative flex items-center space-x-1 p-2 text-blue-100 hover:text-white transition-colors"
                            title="View Cart"
                        >
                            <FaShoppingCart className="text-2xl" />
                            {cartBadgeCount > 0 && (
                                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center border-2 border-blue-900">
                                    {cartBadgeCount > 9 ? '9+' : cartBadgeCount}
                                </span>
                            )}
                        </Link>

                    </div>
                </div>

                {/* Mobile Search Bar (visible only on small screens) */}
                <div className="md:hidden pb-3">
                    <div className="relative flex w-full text-gray-900">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="Search..."
                            className="w-full px-4 py-2 rounded-l-md border-0 focus:ring-2 focus:ring-blue-300 outline-none text-sm"
                        />
                        <button
                            onClick={handleSearch}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-r-md transition-colors"
                        >
                            <FaSearch />
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
}
