import React from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { FaChartLine, FaShareAlt, FaBullhorn, FaMoneyBillWave } from 'react-icons/fa';
import { formatPrice } from '../../utils/currency';

export default function MarketingOverview() {
  const { analytics } = useOutletContext();

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-semibold mb-6">Marketing Dashboard Overview</h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-blue-50 p-6 rounded-lg">
          <h3 className="text-lg font-medium text-blue-800">Total Shares</h3>
          <p className="text-3xl font-bold text-blue-600">{analytics?.totalShares || 0}</p>
        </div>
        <div className="bg-green-50 p-6 rounded-lg">
          <h3 className="text-lg font-medium text-green-800">Total Clicks</h3>
          <p className="text-3xl font-bold text-green-600">{analytics?.totalClicks || 0}</p>
        </div>
        <div className="bg-purple-50 p-6 rounded-lg">
          <h3 className="text-lg font-medium text-purple-800">Total Views</h3>
          <p className="text-3xl font-bold text-purple-600">{analytics?.totalViews || 0}</p>
        </div>
        <div className="bg-yellow-50 p-6 rounded-lg">
          <h3 className="text-lg font-medium text-yellow-800">Total Commission</h3>
          <p className="text-3xl font-bold text-yellow-600">{formatPrice(analytics?.totalCommissionEarned || 0)}</p>
        </div>
      </div>

      <h3 className="text-xl font-semibold mb-4">Quick Actions</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/marketing/share"
          className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-full mr-4">
              <FaShareAlt className="text-blue-500 text-xl" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Share Products</h4>
              <p className="text-sm text-gray-500">Share products on social media</p>
            </div>
          </div>
        </Link>

        <Link
          to="/marketing/affiliates"
          className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-full mr-4">
              <FaUsers className="text-purple-500 text-xl" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Affiliates</h4>
              <p className="text-sm text-gray-500">Manage your affiliate network</p>
            </div>
          </div>
        </Link>

        <Link
          to="/marketing/commissions"
          className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-full mr-4">
              <FaMoneyBillWave className="text-yellow-500 text-xl" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Commissions</h4>
              <p className="text-sm text-gray-500">View your earnings</p>
            </div>
          </div>
        </Link>
      </div>

      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-4">Recent Activity</h3>
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {analytics?.recentActivity?.length > 0 ? (
                analytics.recentActivity.map((activity, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(activity.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {activity.type}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {activity.details}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${activity.status === 'completed' ? 'bg-green-100 text-green-800' :
                          activity.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                        }`}>
                        {activity.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                    No recent activity
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
