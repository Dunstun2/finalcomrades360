import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  FaChartLine, FaShoppingCart, FaBox, FaHistory, FaWallet, FaBars 
} from 'react-icons/fa';

/**
 * A global bottom navigation bar specifically for marketers.
 * Visible on all pages when 'marketing_mode' is active.
 */
const MarketingBottomNav = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    // Determine active state based on current path and query params
    const params = new URLSearchParams(location.search);
    const activeTabParam = params.get('tab');
    const isDashboard = location.pathname.startsWith('/marketing');
    
    // Highlight logic
    const getActiveTab = () => {
        if (location.pathname === '/') return 'new-order';
        if (!isDashboard) return null;
        return activeTabParam || 'overview';
    };
    
    const activeTab = getActiveTab();

    const tabs = [
        { id: 'overview',  icon: <FaChartLine size={18} />,    label: 'Overview',  path: '/marketing?tab=overview' },
        { id: 'products',  icon: <FaShoppingCart size={18} />, label: 'Browse',    path: '/marketing?tab=products' },
        { id: 'new-order', icon: <FaBox size={18} />,          label: 'New Order', path: '/' },
        { id: 'orders',    icon: <FaHistory size={18} />,      label: 'My Sales',  path: '/marketing?tab=orders' },
        { id: 'wallet',    icon: <FaWallet size={18} />,       label: 'Wallet',    path: '/marketing?tab=wallet' },
    ];

    return (
        <nav className="fixed bottom-0 inset-x-0 z-[100] bg-white border-t border-gray-200 shadow-[0_-2px_15px_rgba(0,0,0,0.1)] flex items-stretch lg:hidden animate-in slide-in-from-bottom duration-300 min-h-[56px]">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => {
                        if (tab.path === '/') {
                            localStorage.setItem('marketing_mode', 'true');
                        }
                        navigate(tab.path);
                    }}
                    className={`flex-1 flex flex-col items-center justify-center py-1.5 gap-0.5 text-[10px] font-bold uppercase tracking-tighter transition-all active:scale-95 ${
                        activeTab === tab.id
                            ? 'text-indigo-600 bg-indigo-50/60'
                            : 'text-gray-400 hover:text-gray-600'
                    }`}
                >
                    <span className={activeTab === tab.id ? 'text-indigo-600' : 'text-gray-400'}>
                        {tab.icon}
                    </span>
                    <span className="w-full px-0.5 text-center leading-tight break-words">
                        {tab.label}
                    </span>
                </button>
            ))}
            
            <button
                onClick={() => {
                    const event = new CustomEvent('toggle-marketing-sidebar');
                    window.dispatchEvent(event);
                }}
                className="flex-1 flex flex-col items-center justify-center py-1.5 gap-0.5 text-[10px] font-bold uppercase tracking-tighter text-gray-400 hover:text-gray-600 transition-all active:scale-95 border-l border-gray-100"
            >
                <FaBars size={18} />
                <span className="w-full px-0.5 text-center leading-tight">More</span>
            </button>
        </nav>
    );
};

export default MarketingBottomNav;
