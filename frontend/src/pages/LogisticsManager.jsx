import React from 'react'
import { Link } from 'react-router-dom'

export default function LogisticsManager({ user }) {
  return (
    <div className="container py-12 text-center">
      <div className="flex flex-col items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold">Logistics Dashboard</h1>
        {(user?.role === 'admin' || user?.roles?.includes('admin')) && (
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-xs font-black text-green-600 hover:text-green-800 uppercase tracking-widest bg-green-50 px-4 py-2 rounded-xl border border-green-100 transition-all shadow-sm"
          >
            <span>⬅️</span>
            <span>Back to Admin Dashboard</span>
          </Link>
        )}
      </div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 max-w-2xl mx-auto">
        <p className="text-gray-600 text-lg">
          The Logistics Management interface is currently undergoing maintenance and will be available shortly.
        </p>
        <div className="mt-6">
          <span className="inline-block px-4 py-2 bg-green-50 text-green-700 rounded-full text-sm font-medium">
            Coming Soon
          </span>
        </div>
      </div>
    </div>
  )
}

