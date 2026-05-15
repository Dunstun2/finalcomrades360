import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart, 
  Users, 
  Clock, 
  AlertCircle,
  Package,
  ArrowRight,
  PieChart as PieChartIcon,
  Activity,
  Star
} from 'lucide-react';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
} from 'chart.js';
import api from '../../../services/api';

ChartJS.register(ArcElement, ChartTooltip, ChartLegend);

const BusinessAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/analytics/business', {
        params: { startDate: dateRange.start, endDate: dateRange.end }
      });
      setData(response.data.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching business analytics:', err);
      setError('Failed to load business intelligence data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
        <AlertCircle size={24} />
        <p>{error}</p>
      </div>
    );
  }

  const revenueMixData = {
    labels: data?.financials?.revenueMix?.map(m => m.type.toUpperCase()) || [],
    datasets: [{
      data: data?.financials?.revenueMix?.map(m => m.revenue) || [],
      backgroundColor: [
        'rgba(59, 130, 246, 0.8)',
        'rgba(16, 185, 129, 0.8)',
        'rgba(245, 158, 11, 0.8)',
      ],
      borderWidth: 0,
    }]
  };

  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-500">
      {/* Header & Date Picker */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Business Intelligence</h1>
          <p className="text-gray-500">Deep-dive into platform health and vendor performance</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-1 rounded-lg border shadow-sm">
          <input 
            type="date" 
            value={dateRange.start}
            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            className="text-sm border-none focus:ring-0 cursor-pointer"
          />
          <span className="text-gray-400">to</span>
          <input 
            type="date" 
            value={dateRange.end}
            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            className="text-sm border-none focus:ring-0 cursor-pointer"
          />
        </div>
      </div>

      {/* Financial Scorecards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Gross Merchandise Value" 
          value={`KSh ${data?.financials?.gmv?.toLocaleString()}`}
          icon={<DollarSign className="text-blue-600" />}
          bgColor="bg-blue-50"
        />
        <StatCard 
          title="Average Order Value" 
          value={`KSh ${data?.financials?.aov?.toLocaleString()}`}
          icon={<Activity className="text-emerald-600" />}
          bgColor="bg-emerald-50"
        />
        <StatCard 
          title="Returning Customer Rate" 
          value={`${data?.retention?.returningCustomerRate}%`}
          icon={<Users className="text-amber-600" />}
          bgColor="bg-amber-50"
        />
        <StatCard 
          title="Avg. Fulfillment Time" 
          value={`${data?.operations?.avgFulfillmentHours}h`}
          icon={<Clock className="text-purple-600" />}
          bgColor="bg-purple-50"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Revenue Mix */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl border shadow-sm flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-6">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <PieChartIcon size={20} className="text-gray-400" />
              Revenue Mix
            </h3>
          </div>
          <div className="w-full max-w-[240px] aspect-square relative">
             <Doughnut data={revenueMixData} options={{ cutout: '75%', plugins: { legend: { display: false } } }} />
             <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs text-gray-500 uppercase">Total GMV</span>
                <span className="text-xl font-bold text-gray-900">KSh {data?.financials?.gmv?.toLocaleString()}</span>
             </div>
          </div>
          <div className="w-full mt-8 space-y-3">
             {data?.financials?.revenueMix?.map((mix, idx) => (
               <div key={mix.type} className="flex items-center justify-between text-sm">
                 <div className="flex items-center gap-2">
                   <div className="w-3 h-3 rounded-full" style={{ backgroundColor: revenueMixData.datasets[0].backgroundColor[idx] }}></div>
                   <span className="capitalize text-gray-600">{mix.type}</span>
                 </div>
                 <span className="font-medium text-gray-900">{mix.share}%</span>
               </div>
             ))}
          </div>
        </div>

        {/* Operational Health */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border shadow-sm">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-6">
            <Activity size={20} className="text-gray-400" />
            Operational KPIs
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-dashed">
                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-1">Cancellation Rate</p>
                    <p className="text-2xl font-bold text-gray-900">{data?.operations?.cancellationRate}%</p>
                  </div>
                  <AlertCircle size={24} className={data?.operations?.cancellationRate > 5 ? 'text-red-500' : 'text-gray-300'} />
                </div>
                <p className="text-sm text-gray-500 leading-relaxed italic">
                  {data?.operations?.cancellationRate > 5 
                    ? "Warning: Cancellation rate is above the 5% threshold. Investigate stock accuracy."
                    : "Excellent: Cancellation rate is within healthy parameters (< 5%)."}
                </p>
             </div>
             <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-dashed">
                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-1">Total Orders</p>
                    <p className="text-2xl font-bold text-gray-900">{data?.financials?.orders}</p>
                  </div>
                  <ShoppingCart size={24} className="text-gray-300" />
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-dashed">
                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-1">Repeat Buyers</p>
                    <p className="text-2xl font-bold text-gray-900">{data?.retention?.returningBuyers}</p>
                  </div>
                  <Users size={24} className="text-gray-300" />
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Vendor Excellence Leaderboard */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-6 border-b">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Star size={20} className="text-amber-400" />
            Vendor Performance Leaderboard
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
              <tr>
                <th className="px-6 py-4">Vendor</th>
                <th className="px-6 py-4">Revenue</th>
                <th className="px-6 py-4 text-center">Orders</th>
                <th className="px-6 py-4 text-center">Units Sold</th>
                <th className="px-6 py-4 text-right">Performance</th>
              </tr>
            </thead>
            <tbody className="divide-y text-sm">
              {data?.vendors?.map((vendor, idx) => (
                <tr key={vendor.id ?? idx} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{vendor.name}</td>
                  <td className="px-6 py-4 font-semibold text-blue-600">KSh {vendor.revenue.toLocaleString()}</td>
                  <td className="px-6 py-4 text-center text-gray-600">{vendor.orders}</td>
                  <td className="px-6 py-4 text-center text-gray-600">{vendor.unitsSold}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Top Tier
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data?.vendors?.length === 0 && (
          <div className="p-12 text-center text-gray-400 italic">
            No vendor data available for the selected period.
          </div>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, bgColor }) => (
  <div className="bg-white p-6 rounded-2xl border shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between mb-4">
      <div className={`${bgColor} p-3 rounded-xl`}>
        {icon}
      </div>
      <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
        <TrendingUp size={16} />
        <span>Live</span>
      </div>
    </div>
    <p className="text-gray-500 text-sm mb-1">{title}</p>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
  </div>
);

export default BusinessAnalytics;
