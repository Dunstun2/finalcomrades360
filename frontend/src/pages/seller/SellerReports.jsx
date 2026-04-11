import React from 'react'

export default function SellerReports(){
  return (
    <div className="p-0 sm:p-6 space-y-6 w-full">
      <h1 className="text-xl md:text-2xl font-bold text-gray-800 leading-tight">Reports</h1>

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
