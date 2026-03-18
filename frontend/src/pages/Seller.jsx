import React, { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { FaBars, FaTimes } from 'react-icons/fa'
import { useAuth } from '../contexts/AuthContext'

export default function Seller() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  
  const logout = () => { localStorage.removeItem('token'); window.location.href = '/login' }

  const menuItems = [
    { to: "/seller", label: "Overview", icon: "🏠" },
    { to: "/seller/products/add", label: "Add Product", icon: "➕" },
    { to: "/seller/fast-food/new", label: "ADD MEALS", icon: "🔥", color: "orange" },
    { to: "/seller/products", label: "Products", icon: "📦" },
    { to: "/seller/fast-food", label: "My Meals", icon: "🍲", color: "orange" },
    { to: "/seller/orders", label: "Orders", icon: "🛒" },
    { to: "/seller/business-location", label: "Location", icon: "📍" },
    { to: "/seller/wallet", label: "Wallet", icon: "💰" },
    { to: "/seller/reports", label: "Reports", icon: "📊" },
    { to: "/marketing", label: "Marketing", icon: "📢" },
    { to: "/seller/promotions", label: "Promos", icon: "⭐" },
    { to: "/seller/recycle-bin", label: "Recycle Bin", icon: "🗑️" },
    { to: "/seller/help", label: "Help", icon: "❓" },
  ];

  const isAdmin = user?.role === 'admin' || user?.roles?.includes('admin') || user?.role === 'superadmin' || user?.roles?.includes('superadmin');

  return (
    <div className="flex flex-col lg:flex-row flex-1 lg:overflow-hidden lg:h-screen bg-gray-100 relative min-h-screen">
      {/* Backdrop for mobile */}
      <div 
        className={`fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Sidebar - Desktop / Drawer - Mobile */}
      <div className={`fixed lg:static inset-y-0 left-0 w-64 bg-white border-r border-gray-200 flex flex-col shadow-xl lg:shadow-sm z-50 transform transition-transform duration-300 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-blue-900 tracking-tight">Seller Console</h2>
            <p className="text-[10px] lg:text-xs text-gray-500 mt-1 uppercase tracking-widest font-bold">Manage your business</p>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-full text-gray-400"
          >
            <FaTimes size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto no-scrollbar lg:custom-scrollbar mt-2">
          <ul className="flex flex-col space-y-1 px-3 pb-4">
            {menuItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === "/seller"}
                  onClick={() => setIsSidebarOpen(false)}
                  className={({ isActive }) => `flex items-center gap-2 px-4 py-2 lg:py-2.5 lg:px-4 rounded-xl transition-all duration-200 text-[9px] lg:text-[15px] font-bold uppercase tracking-tight ${isActive
                    ? item.color === 'orange' ? 'bg-orange-600 text-white shadow-lg shadow-orange-100' : 'bg-blue-600 text-white shadow-lg shadow-blue-100'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-blue-600'
                    }`}
                >
                  <span className="text-sm lg:text-base opacity-90">{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-200 bg-gray-50 lg:block hidden text-center">
          <div className="text-[10px] text-gray-400 uppercase tracking-widest font-black">
            Seller Portal v2.0
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Dynamic Content */}
        <main className="flex-1 lg:h-full lg:overflow-y-auto bg-gray-50 relative custom-scrollbar">
          <div className="max-w-7xl mx-auto w-full p-2 lg:p-8 min-h-full pb-20 lg:pb-0">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 min-h-full p-1 sm:p-4 lg:p-6">
              <Outlet />
            </div>
          </div>
        </main>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}} />
    </div>
  );
}
