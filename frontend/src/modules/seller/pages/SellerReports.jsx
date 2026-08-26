import React, { useState, useEffect } from 'react'
import api from '@/shared/services/api'
import { useToast } from '@/shared/components/use-toast'

export default function SellerReports() {
  const [hasExport, setHasExport] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const checkBenefits = async () => {
      try {
        const res = await api.get('/subscriptions/my');
        const subs = (res.data || []).filter(s => s.status === 'Active' || s.status === 'Trial');
        for (const sub of subs) {
          const hasBenefit = (sub.plan?.benefits || []).some(b => b.feature?.code === 'export_reports');
          if (hasBenefit) { setHasExport(true); break; }
        }
      } catch (err) {
        console.warn('Failed to check export benefit:', err.message);
      } finally {
        setLoading(false);
      }
    };
    checkBenefits();
  }, []);

  const handleExport = (format) => {
    if (!hasExport) {
      toast({ title: 'Upgrade Required', description: 'Export reports is a premium feature. Upgrade your plan to download reports.', variant: 'destructive' });
      return;
    }
    // TODO: Integrate with real export API
    toast({ title: 'Export Started', description: `Your ${format.toUpperCase()} report is being generated. It will download shortly.` });
  };

  return (
    <div className="p-0 sm:p-6 space-y-6 w-full">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800 leading-tight">Reports</h1>

        {/* Export Buttons */}
        <div className="flex gap-2">
          {hasExport ? (
            <>
              <button
                onClick={() => handleExport('csv')}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-green-600 hover:bg-green-700 text-white transition-colors shadow-sm"
              >
                📥 Export CSV
              </button>
              <button
                onClick={() => handleExport('excel')}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm"
              >
                📊 Export Excel
              </button>
            </>
          ) : (
            <button
              onClick={() => handleExport('csv')}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-300 text-gray-600 cursor-not-allowed flex items-center gap-1"
              title="Upgrade your plan to export reports"
            >
              🔒 Export Reports
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-2 gap-3">
        <div className="card p-4">
          <div className="font-medium mb-2">Sales Trends</div>
          <div className="text-sm text-gray-600 mb-3">Last 7 / 30 days</div>
          <div className="h-40 bg-gray-100 rounded flex items-center justify-center text-gray-500">Chart placeholder</div>
        </div>
        <div className="card p-4">
          <div className="font-medium mb-2">Best-Selling Products</div>
          <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
            <li>Product A</li>
            <li>Product B</li>
            <li>Product C</li>
          </ul>
        </div>
        <div className="card p-4">
          <div className="font-medium mb-2">Order Status Breakdown</div>
          <div className="h-40 bg-gray-100 rounded flex items-center justify-center text-gray-500">Pie chart placeholder</div>
        </div>
        <div className="card p-4">
          <div className="font-medium mb-2">Customer Ratings</div>
          <div className="text-3xl font-bold">4.3 / 5</div>
          <div className="text-sm text-gray-600">Average review score</div>
        </div>
      </div>
    </div>
  )
}
