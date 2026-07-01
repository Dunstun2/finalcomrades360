import React, { useState, useEffect } from 'react';
import api from '@/shared/services/api';
import { 
  FaFileInvoiceDollar, 
  FaTruck, 
  FaUserTie, 
  FaCheckCircle, 
  FaExclamationCircle, 
  FaSearch, 
  FaFilter,
  FaCalendarAlt,
  FaMoneyBillWave,
  FaArrowRight,
  FaSyncAlt
} from 'react-icons/fa';
import { format } from 'date-fns';

const LogisticsInvoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ payerType: 'seller', fundingStatus: '' });
  const [searchTerm, setSearchTerm] = useState('');

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        ...filter,
        pageSize: 100
      }).toString();
      
      const [ledgerRes, summaryRes] = await Promise.all([
        api.get(`/finance/delivery-charge-ledger?${queryParams}`),
        api.get('/finance/delivery-charge-summary')
      ]);

      setInvoices(ledgerRes.data.data);
      setSummary(summaryRes.data);
    } catch (err) {
      console.error('Failed to fetch logistics invoices', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [filter]);

  const filteredInvoices = invoices.filter(inv => 
    inv.order?.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.payer?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSettle = async (chargeId) => {
    if (!window.confirm('Are you sure you want to manually settle this invoice? This will mark it as fully paid.')) return;
    try {
      await api.post(`/finance/logistics-invoices/${chargeId}/settle`);
      fetchInvoices();
    } catch (err) {
      console.error('Failed to settle invoice', err);
      alert('Failed to settle invoice: ' + (err.response?.data?.error || err.message));
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'settled':
        return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-black uppercase tracking-tight flex items-center gap-1"><FaCheckCircle size={10} /> Paid</span>;
      case 'charged':
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] font-black uppercase tracking-tight flex items-center gap-1"><FaMoneyBillWave size={10} /> Charged</span>;
      case 'quoted':
        return <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-[10px] font-black uppercase tracking-tight flex items-center gap-1"><FaExclamationCircle size={10} /> Unpaid</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-[10px] font-black uppercase tracking-tight">{status}</span>;
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-[1600px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-100">
              <FaFileInvoiceDollar />
            </div>
            Logistics Invoices
          </h1>
          <p className="text-slate-500 mt-2 font-medium">Track delivery fees owed by sellers and platform logistics costs.</p>
        </div>

        {summary && (
          <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm min-w-[180px]">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Outstanding</p>
              <p className="text-xl font-black text-red-600">KES {summary.totals.outstandingAmount.toLocaleString()}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm min-w-[180px]">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Settled</p>
              <p className="text-xl font-black text-green-600">KES {summary.totals.chargedAmount.toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-100/50 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[250px] relative">
          <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text"
            placeholder="Search by Order # or Seller Name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-700"
          />
        </div>

        <div className="flex items-center gap-2">
          <FaFilter className="text-slate-400 ml-2" />
          <select 
            value={filter.payerType}
            onChange={(e) => setFilter(prev => ({ ...prev, payerType: e.target.value }))}
            className="bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Payers</option>
            <option value="seller">Sellers Only</option>
            <option value="customer">Customers Only</option>
            <option value="platform">Platform Funded</option>
          </select>

          <select 
            value={filter.fundingStatus}
            onChange={(e) => setFilter(prev => ({ ...prev, fundingStatus: e.target.value }))}
            className="bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="quoted">Unpaid (Quoted)</option>
            <option value="charged">Charged</option>
            <option value="settled">Settled (Paid)</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Order Info</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Route / Leg</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Payer</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-slate-400 font-bold animate-pulse">Loading Ledger...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-4 text-slate-300">
                      <FaFileInvoiceDollar size={48} />
                      <p className="text-slate-500 font-bold text-lg">No invoices found matching your filters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-900">#{inv.order?.orderNumber || 'N/A'}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded inline-block w-fit mt-1 ${
                          inv.order?.status === 'delivered' ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-500'
                        }`}>
                          Order {inv.order?.status?.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700 capitalize flex items-center gap-2">
                          {inv.routeType?.replace(/_/g, ' ')}
                        </span>
                        <div className="flex items-center gap-2 mt-1 opacity-50">
                          <FaTruck size={10} className="text-blue-600" />
                          <span className="text-[10px] font-medium">Task #{inv.deliveryTaskId}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                          <FaUserTie size={14} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-slate-900">{inv.payer?.name || 'Platform'}</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{inv.payerType}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-black text-slate-900">KES {inv.grossAmount.toLocaleString()}</span>
                        {inv.outstandingAmount > 0 && (
                          <span className="text-[10px] font-bold text-red-500 mt-0.5 tracking-tight">
                            -{inv.outstandingAmount.toLocaleString()} Pending
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      {getStatusBadge(inv.fundingStatus)}
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex flex-col text-[10px] font-medium text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <FaCalendarAlt size={10} />
                          <span>Quoted: {format(new Date(inv.quotedAt), 'MMM dd, HH:mm')}</span>
                        </div>
                        {inv.settledAt && (
                          <div className="flex items-center gap-1.5 mt-1 text-green-600">
                            <FaCheckCircle size={10} />
                            <span>Paid: {format(new Date(inv.settledAt), 'MMM dd, HH:mm')}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-6 text-right">
                      {inv.fundingStatus !== 'settled' && (
                        <button 
                          onClick={() => handleSettle(inv.id)}
                          className="px-3 py-1.5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-blue-700 transition-all shadow-md shadow-blue-100 active:scale-95"
                        >
                          Settle
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Footer info */}
        <div className="bg-slate-50 p-6 flex flex-col md:flex-row justify-between items-center gap-4 text-[11px] font-medium text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span>Seller invoices are automatically charged from their wallet during task assignment.</span>
          </div>
          <div className="flex items-center gap-6">
            <p>Showing {filteredInvoices.length} recent logistics transactions</p>
            <button 
              onClick={fetchInvoices}
              className="flex items-center gap-2 text-blue-600 font-bold hover:underline"
            >
              <FaSyncAlt size={10} /> Refresh Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogisticsInvoices;
