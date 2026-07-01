import React, { useState, useEffect } from 'react';
import { FaDollarSign, FaChartBar, FaDownload, FaFilter } from 'react-icons/fa';
import { formatPrice } from '@/utils/currency';
import api from '@/shared/services/api';

const Commissions = () => {
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');

  useEffect(() => {
    const fetchCommissions = async () => {
      setLoading(true);
      try {
        const response = await api.get('/marketing/commissions');
        if (response.data?.success) {
          const mappedCommissions = (response.data.commissions || []).map(comm => {
            const order = comm.order || {};
            const isDelivered = order.status === 'delivered';
            const isPaid = order.paymentConfirmed;
            const returnPeriodElapsed = order.actualDelivery ? 
              (new Date() - new Date(order.actualDelivery)) > 7 * 24 * 60 * 60 * 1000 : 
              false;
            
            let status = 'pending';
            if (isDelivered && isPaid && returnPeriodElapsed) status = 'paid';
            else if (isDelivered) status = 'processing';

            return {
              id: comm.id,
              affiliateName: 'You',
              productName: comm.product?.name || 'Item Commission',
              amount: parseFloat(comm.commissionAmount || 0),
              rate: `${comm.commissionRate || 0}%`,
              orderId: order.orderNumber || comm.orderId,
              date: new Date(comm.createdAt).toISOString().split('T')[0],
              status: status,
              paymentMethod: 'Wallet'
            };
          });
          setCommissions(mappedCommissions);
        }
      } catch (error) {
        console.error('Failed to fetch commissions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCommissions();
  }, []);

  const filteredCommissions = commissions.filter(commission => {
    if (filter === 'all') return true;
    return commission.status === filter;
  });

  const totalCommissions = filteredCommissions.reduce((sum, commission) => sum + commission.amount, 0);
  const paidCommissions = filteredCommissions.filter(c => c.status === 'paid').reduce((sum, commission) => sum + commission.amount, 0);
  const pendingCommissions = filteredCommissions.filter(c => c.status === 'pending' || c.status === 'processing').reduce((sum, commission) => sum + commission.amount, 0);

  const handleExport = () => {
    console.log('Exporting commissions data...');
    // Implementation for export could go here
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Commissions Management</h1>
        <p className="text-gray-600">Track and manage your affiliate commission payments</p>
      </div>

      <div className="mb-6 flex flex-wrap gap-4">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Status</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
        </select>

        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Time</option>
          <option value="this-month">This Month</option>
          <option value="last-month">Last Month</option>
          <option value="this-year">This Year</option>
        </select>

        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <FaDownload className="w-4 h-4" />
          Export
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <FaDollarSign className="text-blue-600 text-2xl mr-4" />
            <div>
              <p className="text-sm font-medium text-gray-600">Total Commissions</p>
              <p className="text-2xl font-bold text-gray-900">{formatPrice(totalCommissions)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <FaChartBar className="text-green-600 text-2xl mr-4" />
            <div>
              <p className="text-sm font-medium text-gray-600">Paid Commissions</p>
              <p className="text-2xl font-bold text-gray-900">{formatPrice(paidCommissions)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <FaDollarSign className="text-orange-600 text-2xl mr-4" />
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Commissions</p>
              <p className="text-2xl font-bold text-gray-900">{formatPrice(pendingCommissions)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Commission Records</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commission</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCommissions.map((commission) => (
                <tr key={commission.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{commission.productName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{commission.orderId}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{formatPrice(commission.amount)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{commission.rate}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{commission.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      commission.status === 'paid' ? 'bg-green-100 text-green-800' :
                      commission.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {commission.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Commissions;