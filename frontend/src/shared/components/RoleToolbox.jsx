import React, { useState } from 'react';
import { 
  FaTools, FaTags, FaChartLine, FaWhatsapp, FaLink, 
  FaCalculator, FaImage, FaBiking, FaFire, FaExclamationTriangle,
  FaChevronRight, FaTimes, FaCheck, FaPhoneAlt, FaDownload
} from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { useCategories } from '@/contexts/CategoriesContext';

const RoleToolbox = ({ role, user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null);

  const tools = {
    seller: [
      {
        id: 'price-adjust',
        label: 'Price Quick-Adjust',
        icon: <FaTags />,
        desc: 'Quickly update prices for your top products.',
        color: 'blue',
        action: () => setActiveModal('priceAdjust')
      },
      {
        id: 'stock-health',
        label: 'Inventory Health',
        icon: <FaChartLine />,
        desc: 'View low-stock items and demand forecasts.',
        color: 'green',
        action: () => setActiveModal('stockHealth')
      },
      {
        id: 'customer-connect',
        label: 'Customer Outreach',
        icon: <FaWhatsapp />,
        desc: 'Connect with customers for order coordination.',
        color: 'emerald',
        action: () => setActiveModal('customerConnect')
      }
    ],
    marketer: [
      {
        id: 'link-studio',
        label: 'Deep-Link Studio',
        icon: <FaLink />,
        desc: 'Generate trackable links for any category.',
        color: 'indigo',
        action: () => setActiveModal('linkStudio')
      },
      {
        id: 'earnings-pro',
        label: 'Earnings Projection',
        icon: <FaCalculator />,
        desc: 'Calculate potential commission milestones.',
        color: 'purple',
        action: () => setActiveModal('earningsPro')
      },
      {
        id: 'asset-hub',
        label: 'Promo Asset Hub',
        icon: <FaImage />,
        desc: 'Download high-res branding for social media.',
        color: 'pink',
        action: () => setActiveModal('assetHub')
      }
    ],
    delivery: [
      {
        id: 'shift-summary',
        label: 'Shift Summary',
        icon: <FaBiking />,
        desc: 'Daily breakdown of tips, miles and orders.',
        color: 'amber',
        action: () => setActiveModal('shiftSummary')
      },
      {
        id: 'station-heat',
        label: 'Station Heatmap',
        icon: <FaFire />,
        desc: 'Live view of stations with highest pending orders.',
        color: 'orange',
        action: () => setActiveModal('stationHeat')
      },
      {
        id: 'sos-emergency',
        label: 'Emergency SOS',
        icon: <FaExclamationTriangle />,
        desc: 'One-tap emergency alert for field support.',
        color: 'red',
        action: () => setActiveModal('sosEmergency')
      }
    ]
  };

  const { categories } = useCategories();
  const [linkData, setLinkData] = useState({ type: 'category', value: '', search: '' });
  const [projection, setProjection] = useState({ orders: 50, aov: 1500, rate: 5 });
  const [copied, setCopied] = useState(false);

  const currentTools = tools[role] || [];

  const getGeneratedLink = () => {
    // Priority: 1. Environment Variable, 2. Current Origin
    const envUrl = import.meta.env.VITE_API_URL;
    const origin = (envUrl && envUrl.startsWith('http')) 
      ? envUrl.replace(/\/api\/?$/, '') 
      : window.location.origin;
    
    const base = `${origin}/api/marketing/r`;
    const ref = user?.referralCode || 'PROMO';
    
    if (linkData.type === 'category') {
      return `${base}?categoryId=${linkData.value}&ref=${ref}`;
    }
    if (linkData.type === 'search') {
      return `${base}?search=${encodeURIComponent(linkData.search)}&ref=${ref}`;
    }
    return `${origin}/?ref=${ref}`;
  };

  const handleCopy = async () => {
    const link = getGeneratedLink();
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const renderModalContent = () => {
    switch (activeModal) {
      case 'linkStudio':
        return (
          <div className="space-y-6">
            <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
              <button 
                onClick={() => setLinkData({ ...linkData, type: 'category' })}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${linkData.type === 'category' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
              >
                Category Link
              </button>
              <button 
                onClick={() => setLinkData({ ...linkData, type: 'search' })}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${linkData.type === 'search' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
              >
                Search Result
              </button>
            </div>

            {linkData.type === 'category' ? (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Select Category</label>
                <select 
                  value={linkData.value}
                  onChange={(e) => setLinkData({ ...linkData, value: e.target.value })}
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold"
                >
                  <option value="">Choose a destination...</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Search Keyword</label>
                <input 
                  type="text"
                  placeholder="e.g. sneakers, electronics..."
                  value={linkData.search}
                  onChange={(e) => setLinkData({ ...linkData, search: e.target.value })}
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold"
                />
              </div>
            )}

            <div className="p-5 bg-blue-50/50 rounded-[1.5rem] border border-blue-100/50">
              <p className="text-[10px] font-black uppercase text-blue-400 tracking-widest mb-2">Generated Referral Link</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 text-[11px] font-mono font-bold text-blue-900 truncate bg-white p-2 rounded-lg border border-blue-100">
                  {getGeneratedLink()}
                </div>
                <button 
                  onClick={handleCopy}
                  className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all active:scale-90"
                >
                  {copied ? <FaCheck /> : <FaLink />}
                </button>
              </div>
            </div>

            <a 
              href={`https://wa.me/?text=${encodeURIComponent(`Check out these awesome finds on Comrades360: ${getGeneratedLink()}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 bg-[#25D366] text-white rounded-2xl font-black uppercase tracking-widest hover:brightness-95 transition-all shadow-xl flex items-center justify-center gap-2"
            >
              <FaWhatsapp size={18} /> Share to WhatsApp
            </a>
          </div>
        );

      case 'earningsPro':
        const estimatedEarnings = Math.round(projection.orders * projection.aov * (projection.rate / 100));
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Target Orders</label>
                <input 
                  type="number"
                  value={projection.orders}
                  onChange={(e) => setProjection({ ...projection, orders: parseInt(e.target.value) || 0 })}
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none text-sm font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Avg. Order Value</label>
                <input 
                  type="number"
                  value={projection.aov}
                  onChange={(e) => setProjection({ ...projection, aov: parseInt(e.target.value) || 0 })}
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none text-sm font-bold"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Commission Rate ({projection.rate}%)</label>
              </div>
              <input 
                type="range"
                min="1"
                max="15"
                value={projection.rate}
                onChange={(e) => setProjection({ ...projection, rate: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
              />
            </div>

            <div className="p-8 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[2rem] text-white shadow-xl relative overflow-hidden">
              <FaCalculator className="absolute -right-4 -bottom-4 text-white/10 text-8xl rotate-12" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-100 mb-1">Projected Earnings</p>
              <h2 className="text-4xl font-black mb-1">KES {estimatedEarnings.toLocaleString()}</h2>
              <p className="text-[10px] text-indigo-200 font-bold uppercase">Potential payout for {projection.orders} conversions</p>
            </div>

            <p className="text-[10px] text-gray-400 text-center font-medium px-4 italic">
              *Disclaimer: This is an estimate. Actual earnings depend on product-specific commission rates and approved orders.
            </p>
          </div>
        );

      case 'assetHub':
        const assets = [
          { name: 'Official Logo Pack', size: '2.4 MB', type: 'ZIP' },
          { name: 'WhatsApp Status Templates', size: '5.1 MB', type: 'JPG' },
          { name: 'Marketer Handbook PDF', size: '1.2 MB', type: 'PDF' },
          { name: 'Brand Color Guide', size: '0.5 MB', type: 'PDF' }
        ];
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 font-medium px-2">Professional branding materials to make your promotions stand out.</p>
            <div className="space-y-2">
              {assets.map((asset, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 group hover:border-pink-200 hover:bg-pink-50/30 transition-all cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white rounded-xl shadow-sm text-pink-500">
                      <FaImage />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 group-hover:text-pink-600 transition-colors">{asset.name}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{asset.type} • {asset.size}</p>
                    </div>
                  </div>
                  <button className="p-2 bg-gray-100 text-gray-400 rounded-lg group-hover:bg-pink-600 group-hover:text-white transition-all">
                    <FaDownload size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="p-6 bg-pink-50 rounded-[1.5rem] border border-pink-100 text-center">
              <p className="text-xs text-pink-700 font-bold">Need custom graphics for a campaign?</p>
              <p className="text-[10px] text-pink-600/70 mb-4">Contact our support team for specialized assets.</p>
              <button className="text-[10px] font-black uppercase text-pink-700 underline tracking-widest">Request Assets</button>
            </div>
          </div>
        );

      default:
        return (
          <div className="p-10 text-center">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-white shadow-xl ring-1 ring-blue-100">
              <FaTools className="text-blue-600 text-3xl animate-pulse" />
            </div>
            <h4 className="text-xl font-black text-gray-900 mb-2 uppercase tracking-tight">Feature Integration in Progress</h4>
            <p className="text-sm text-gray-500 font-medium max-w-xs mx-auto mb-8">
              We are currently connecting this tool to the live backend engine. Check back shortly for full capability.
            </p>
            <button 
              onClick={() => setActiveModal(null)}
              className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl active:scale-95"
            >
              Close & Return
            </button>
          </div>
        );
    }
  };

  if (currentTools.length === 0) return null;

  return (
    <div className="mt-6 mb-8">
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg bg-gradient-to-br ${
            role === 'seller' ? 'from-blue-500 to-indigo-600' :
            role === 'marketer' ? 'from-indigo-500 to-purple-600' :
            'from-orange-500 to-red-600'
          } shadow-lg shadow-blue-200/50`}>
            <FaTools className="text-white text-sm" />
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Privileged Toolbox</h3>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-none">Self-Service Utilities</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {currentTools.map((tool) => (
          <button
            key={tool.id}
            onClick={tool.action}
            className="group relative flex flex-col items-start p-5 bg-white border border-gray-100 rounded-[1.5rem] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-left overflow-hidden"
          >
            {/* Background Glow */}
            <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full opacity-5 group-hover:scale-150 transition-transform duration-700 ${
              tool.color === 'blue' ? 'bg-blue-600' :
              tool.color === 'green' ? 'bg-green-600' :
              tool.color === 'indigo' ? 'bg-indigo-600' :
              tool.color === 'purple' ? 'bg-purple-600' :
              tool.color === 'red' ? 'bg-red-600' :
              tool.color === 'pink' ? 'bg-pink-600' :
              'bg-orange-600'
            }`} />

            <div className={`p-3 rounded-2xl mb-4 transition-all duration-300 group-hover:scale-110 shadow-sm ${
              tool.color === 'blue' ? 'bg-blue-50 text-blue-600' :
              tool.color === 'green' ? 'bg-green-50 text-green-600' :
              tool.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
              tool.color === 'indigo' ? 'bg-indigo-50 text-indigo-600' :
              tool.color === 'purple' ? 'bg-purple-50 text-purple-600' :
              tool.color === 'pink' ? 'bg-pink-50 text-pink-600' :
              tool.color === 'amber' ? 'bg-amber-50 text-amber-600' :
              tool.color === 'orange' ? 'bg-orange-50 text-orange-600' :
              'bg-red-50 text-red-600'
            }`}>
              {React.cloneElement(tool.icon, { size: 20 })}
            </div>
            
            <h4 className="text-sm font-black text-gray-900 mb-1 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{tool.label}</h4>
            <p className="text-[11px] text-gray-500 font-medium leading-relaxed mb-3">{tool.desc}</p>
            
            <div className="mt-auto flex items-center gap-1 text-[10px] font-black uppercase text-blue-600 tracking-widest group-hover:gap-2 transition-all">
              Launch Tool <FaChevronRight size={8} />
            </div>
          </button>
        ))}
      </div>

      {/* Simple Modal Framework */}
      {activeModal && (
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => setActiveModal(null)}
        >
          <div 
            className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-gray-100 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${
                  activeModal === 'linkStudio' ? 'bg-indigo-600' :
                  activeModal === 'earningsPro' ? 'bg-purple-600' :
                  activeModal === 'assetHub' ? 'bg-pink-600' :
                  'bg-blue-600'
                }`}>
                  {activeModal === 'linkStudio' ? <FaLink className="text-white" /> :
                   activeModal === 'earningsPro' ? <FaCalculator className="text-white" /> :
                   activeModal === 'assetHub' ? <FaImage className="text-white" /> :
                   <FaTools className="text-white" />}
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 uppercase">
                    {activeModal === 'linkStudio' ? 'Deep-Link Studio' :
                     activeModal === 'earningsPro' ? 'Earnings Projection' :
                     activeModal === 'assetHub' ? 'Promo Asset Hub' :
                     'Utility Tool'}
                  </h3>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">
                    {activeModal === 'linkStudio' ? 'Marketing Utility' :
                     activeModal === 'earningsPro' ? 'Revenue Calculator' :
                     activeModal === 'assetHub' ? 'Brand Resources' :
                     'Admin Interface'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setActiveModal(null)}
                className="p-2.5 hover:bg-white rounded-full text-gray-400 hover:text-red-500 transition-all border border-transparent hover:border-red-100 shadow-sm"
              >
                <FaTimes />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto custom-scrollbar">
              {renderModalContent()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleToolbox;
