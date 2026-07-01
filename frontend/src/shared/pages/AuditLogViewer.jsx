import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaChevronRight, FaHistory, FaSearch, FaFilter, 
  FaUser, FaCalendarAlt, FaInfoCircle, FaSpinner 
} from 'react-icons/fa';
import { adminApi } from '@/shared/services/api';
import { useToast } from '@/shared/components/use-toast';
import { format } from 'date-fns';

const AuditLogViewer = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [filters, setFilters] = useState({
    action: '',
    adminId: '',
    targetType: '',
    targetId: ''
  });
  const { toast } = useToast();

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await adminApi.adminGetAuditLogs({
        page,
        ...filters
      });
      if (response.data.success) {
        setLogs(response.data.logs);
        setTotal(response.data.total);
        setPages(response.data.pages);
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch audit logs',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, filters]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPage(1); // Reset to first page on filter change
  };

  const getActionColor = (action) => {
    if (action.includes('RESET')) return 'text-orange-600 bg-orange-50';
    if (action.includes('DELETE') || action.includes('PURGE')) return 'text-red-600 bg-red-50';
    if (action.includes('CREATE') || action.includes('ADD')) return 'text-green-600 bg-green-50';
    if (action.includes('UPDATE') || action.includes('EDIT')) return 'text-blue-600 bg-blue-50';
    return 'text-gray-600 bg-gray-50';
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/dashboard/admin-tools" className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors" title="Back to Admin Tools">
            <FaChevronRight className="rotate-180" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <FaHistory className="text-blue-600" /> Audit Log Viewer
            </h1>
            <p className="text-gray-500 text-sm font-medium">Complete history of administrative actions</p>
          </div>
        </div>
        <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 flex items-center gap-2">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Actions:</span>
          <span className="text-sm font-black text-blue-600">{total.toLocaleString()}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Action Type</label>
          <div className="relative">
            <FaFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
            <input 
              name="action"
              value={filters.action}
              onChange={handleFilterChange}
              placeholder="e.g. WALLET_ADJUST"
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Target Type</label>
          <div className="relative">
            <FaInfoCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
            <select 
              name="targetType"
              value={filters.targetType}
              onChange={handleFilterChange}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all appearance-none"
            >
              <option value="">All Types</option>
              <option value="User">User</option>
              <option value="Order">Order</option>
              <option value="Product">Product</option>
              <option value="System">System</option>
            </select>
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Admin ID</label>
          <div className="relative">
            <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
            <input 
              name="adminId"
              value={filters.adminId}
              onChange={handleFilterChange}
              placeholder="Admin ID"
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Target ID</label>
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
            <input 
              name="targetId"
              value={filters.targetId}
              onChange={handleFilterChange}
              placeholder="Target Entity ID"
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase">Admin</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase">Action</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase">Target</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase">Details</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-20 text-center">
                    <FaSpinner className="animate-spin text-blue-600 text-2xl mx-auto mb-2" />
                    <p className="text-gray-500 font-medium">Loading audit history...</p>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-20 text-center">
                    <div className="bg-gray-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FaHistory className="text-gray-300" />
                    </div>
                    <p className="text-gray-500 font-medium">No logs found</p>
                    <p className="text-xs text-gray-400">Try adjusting your filters</p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">
                          {log.admin?.avatar ? (
                            <img src={log.admin.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            log.admin?.name?.charAt(0) || 'A'
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{log.adminName || log.admin?.name || 'Unknown'}</p>
                          <p className="text-[10px] text-gray-400 font-medium">ID: {log.adminId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${getActionColor(log.action)}`}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-bold text-gray-800">{log.targetName || '—'}</p>
                        <p className="text-[10px] text-gray-500 font-medium">
                          {log.targetType} <span className="text-gray-300">•</span> ID: {log.targetId}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-gray-600 line-clamp-2 max-w-xs">
                        {log.details?.message || JSON.stringify(log.details) || 'No extra details'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-500">
                        <FaCalendarAlt className="text-[10px]" />
                        <span className="text-xs font-medium">
                          {format(new Date(log.createdAt), 'MMM dd, yyyy HH:mm:ss')}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-500 font-medium">
              Page <span className="text-gray-900 font-bold">{page}</span> of <span className="text-gray-900 font-bold">{pages}</span>
            </p>
            <div className="flex gap-2">
              <button 
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-xs font-bold hover:bg-gray-50 disabled:opacity-50 transition-all"
              >
                Previous
              </button>
              <button 
                disabled={page === pages}
                onClick={() => setPage(p => Math.min(pages, p + 1))}
                className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-xs font-bold hover:bg-gray-50 disabled:opacity-50 transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogViewer;
