import React, { useState, useEffect } from 'react';
import { FaUser, FaDollarSign, FaChartLine, FaTrash } from 'react-icons/fa';
import { formatPrice } from '../../utils/currency';

const Affiliates = () => {
  const [affiliates, setAffiliates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    const mockAffiliates = [
      {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        commission: '10%',
        sales: 45,
        earnings: 1250.00,
        status: 'active'
      },
      {
        id: 2,
        name: 'Jane Smith',
        email: 'jane@example.com',
        commission: '15%',
        sales: 32,
        earnings: 890.00,
        status: 'active'
      },
      {
        id: 3,
        name: 'Mike Johnson',
        email: 'mike@example.com',
        commission: '12%',
        sales: 28,
        earnings: 670.00,
        status: 'pending'
      }
    ];

    setTimeout(() => {
      setAffiliates(mockAffiliates);
      setLoading(false);
    }, 1000);
  }, []);

  const handleRemoveAffiliate = (id) => {
    setAffiliates(affiliates.filter(affiliate => affiliate.id !== id));
  };

  const totalEarnings = affiliates.reduce((sum, affiliate) => sum + affiliate.earnings, 0);
  const totalSales = affiliates.reduce((sum, affiliate) => sum + affiliate.sales, 0);

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
        <h1 className="text-2xl font-bold text-gray-900">Affiliates Management</h1>
        <p className="text-gray-600">Manage your affiliate partners and track their performance</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <FaUser className="text-blue-600 text-2xl mr-4" />
            <div>
              <p className="text-sm font-medium text-gray-600">Total Affiliates</p>
              <p className="text-2xl font-bold text-gray-900">{affiliates.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <FaDollarSign className="text-green-600 text-2xl mr-4" />
            <div>
              <p className="text-sm font-medium text-gray-600">Total Earnings</p>
              <p className="text-2xl font-bold text-gray-900">{formatPrice(totalEarnings)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <FaChartLine className="text-purple-600 text-2xl mr-4" />
            <div>
              <p className="text-sm font-medium text-gray-600">Total Sales</p>
              <p className="text-2xl font-bold text-gray-900">{totalSales}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <FaUser className="text-orange-600 text-2xl mr-4" />
            <div>
              <p className="text-sm font-medium text-gray-600">Active Affiliates</p>
              <p className="text-2xl font-bold text-gray-900">
                {affiliates.filter(a => a.status === 'active').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Affiliates Table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Affiliate List</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Commission
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sales
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Earnings
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {affiliates.map((affiliate) => (
                <tr key={affiliate.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{affiliate.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{affiliate.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{affiliate.commission}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{affiliate.sales}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatPrice(affiliate.earnings)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${affiliate.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                      }`}>
                      {affiliate.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleRemoveAffiliate(affiliate.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <FaTrash className="w-4 h-4" />
                    </button>
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

export default Affiliates;