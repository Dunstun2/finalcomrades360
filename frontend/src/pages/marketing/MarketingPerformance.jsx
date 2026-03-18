import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { FaChartLine, FaArrowUp, FaArrowDown } from 'react-icons/fa';
import { formatPrice } from '../../utils/currency';

export default function MarketingPerformance() {
  const { analytics } = useOutletContext();

  // Mock data for the charts - replace with actual data from your API
  const performanceData = {
    clicks: [65, 59, 80, 81, 56, 55, 40],
    shares: [28, 48, 40, 19, 86, 27, 90],
    conversions: [12, 15, 30, 25, 40, 35, 50],
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  };

  const stats = [
    {
      id: 1,
      name: 'Total Clicks',
      stat: analytics?.totalClicks || 0,
      change: '12%',
      changeType: 'increase',
    },
    {
      id: 2,
      name: 'Total Shares',
      stat: analytics?.totalShares || 0,
      change: '5.4%',
      changeType: 'increase',
    },
    {
      id: 3,
      name: 'Conversion Rate',
      stat: '3.2%',
      change: '0.8%',
      changeType: 'decrease',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Performance Analytics</h2>
        <p className="mt-1 text-sm text-gray-500">Track and analyze your marketing performance.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => (
          <div
            key={item.id}
            className="relative overflow-hidden rounded-lg bg-white px-4 pt-5 pb-12 shadow sm:px-6 sm:pt-6"
          >
            <dt>
              <div className="absolute rounded-md bg-blue-500 p-3">
                <FaChartLine className="h-6 w-6 text-white" aria-hidden="true" />
              </div>
              <p className="ml-16 truncate text-sm font-medium text-gray-500">{item.name}</p>
            </dt>
            <dd className="ml-16 flex items-baseline pb-6 sm:pb-7">
              <p className="text-2xl font-semibold text-gray-900">{item.stat}</p>
              <p
                className={`ml-2 flex items-baseline text-sm font-semibold ${item.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                  }`}
              >
                {item.changeType === 'increase' ? (
                  <FaArrowUp className="h-3 w-3 flex-shrink-0 self-center text-green-500" />
                ) : (
                  <FaArrowDown className="h-3 w-3 flex-shrink-0 self-center text-red-500" />
                )}
                <span className="sr-only">
                  {item.changeType === 'increase' ? 'Increased' : 'Decreased'} by
                </span>
                {item.change}
              </p>
            </dd>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-lg font-medium text-gray-900">Clicks & Shares</h3>
          <div className="mt-4 h-64">
            {/* Replace with your chart component */}
            <div className="flex h-full items-center justify-center rounded-lg border-2 border-dashed border-gray-300">
              <p className="text-gray-500">Clicks & Shares Chart</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-lg font-medium text-gray-900">Conversions</h3>
          <div className="mt-4 h-64">
            {/* Replace with your chart component */}
            <div className="flex h-full items-center justify-center rounded-lg border-2 border-dashed border-gray-300">
              <p className="text-gray-500">Conversions Chart</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Performing Products */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="text-lg font-medium text-gray-900">Top Performing Products</h3>
        <div className="mt-4">
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                    Product
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Clicks
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Shares
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Conversions
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {analytics?.topProducts?.map((product) => (
                  <tr key={product.id}>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          <img className="h-10 w-10 rounded-full" src={product.image} alt={product.name} />
                        </div>
                        <div className="ml-4">
                          <div className="font-medium text-gray-900">{product.name}</div>
                          <div className="text-gray-500">{product.category}</div>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {product.clicks || 0}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {product.shares || 0}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {product.conversions || 0}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {formatPrice(product.revenue || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
