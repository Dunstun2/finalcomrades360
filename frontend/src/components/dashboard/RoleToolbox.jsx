import React, { useState } from 'react';
import { 
  FaTools, FaTags, FaChartLine, FaWhatsapp, FaLink, 
  FaCalculator, FaImage, FaBiking, FaFire, FaExclamationTriangle,
  FaChevronRight, FaTimes, FaCheck, FaPhoneAlt
} from 'react-icons/fa';
import { Link } from 'react-router-dom';

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

  const currentTools = tools[role] || [];

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
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-gray-100">
            <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-xl">
                  <FaTools className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 uppercase">Utility Tool</h3>
                  <p className="text-xs text-gray-500 font-bold">Admin-Standard Interface</p>
                </div>
              </div>
              <button 
                onClick={() => setActiveModal(null)}
                className="p-2.5 hover:bg-white rounded-full text-gray-400 hover:text-red-500 transition-all border border-transparent hover:border-red-100 shadow-sm"
              >
                <FaTimes />
              </button>
            </div>
            
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
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleToolbox;
