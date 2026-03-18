import React from 'react'
import { Link } from 'react-router-dom'

export default function Account({ user }) {
  if (!user) {
    return (
      <div className="container py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Please Login</h2>
          <Link to="/login" className="btn">Login to Your Account</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">My Account</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Info */}
        <div className="lg:col-span-2 card">
          <h2 className="text-xl font-semibold mb-4">Profile Information</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-600">Name</label>
              <p className="text-lg">{user.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600">Email</label>
              <p className="text-lg">{user.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600">Phone</label>
              <p className="text-lg">{user.phone}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600">Student ID</label>
              <p className="text-lg">{user.publicId}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600">Current Role</label>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${user.role === 'student' ? 'bg-blue-100 text-blue-800' :
                user.role === 'marketer' ? 'bg-green-100 text-green-800' :
                  user.role === 'seller' ? 'bg-purple-100 text-purple-800' :
                    user.role === 'admin' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                }`}>
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </span>
            </div>
          </div>
          {/* Account actions */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Link to="/customer/settings" state={{ isEditing: true }} className="btn w-full sm:w-auto">Edit Account</Link>
            <Link to="/customer/account-verification" className="btn w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-center">Verification Status</Link>
            <Link to="/account/delete" className="w-full sm:w-auto bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 text-center">Request Account Deletion</Link>
          </div>
        </div>

        {/* Role Actions */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Role Actions</h2>

          {user.role === 'student' && (
            <div className="space-y-4">
              {user.applicationStatus === 'none' && (
                <div>
                  <p className="text-gray-600 mb-3">Ready to earn money? Apply for a role!</p>
                  <Link to="/apply-role" className="btn w-full">
                    Apply for Role 🎯
                  </Link>
                </div>
              )}

              {user.applicationStatus === 'pending' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
                  <h3 className="font-semibold text-yellow-800">Application Pending</h3>
                  <p className="text-yellow-700 text-sm mt-1">
                    Your application for <strong>{user.appliedRole}</strong> is under review.
                  </p>
                </div>
              )}

              {user.applicationStatus === 'approved' && (
                <div className="bg-green-50 border border-green-200 rounded p-4">
                  <h3 className="font-semibold text-green-800">Application Approved! 🎉</h3>
                  <p className="text-green-700 text-sm mt-1">
                    You are now a verified {user.role}. Start earning today!
                  </p>
                </div>
              )}

              {user.applicationStatus === 'rejected' && (
                <div className="bg-red-50 border border-red-200 rounded p-4">
                  <h3 className="font-semibold text-red-800">Application Rejected</h3>
                  <p className="text-red-700 text-sm mt-1">
                    You can reapply after 30 days.
                  </p>
                  <Link to="/apply-role" className="btn mt-2">
                    Apply Again
                  </Link>
                </div>
              )}
            </div>
          )}

          {(user.role === 'marketer' || user.role === 'marketing' || user.role === 'admin' || user.role === 'superadmin' || user.role === 'super_admin') && (
            <div className="space-y-3">
              <Link to="/marketing" className="btn w-full">
                Marketing Dashboard
              </Link>

              {user.role === 'seller' && (
                <div className="space-y-3">
                  <Link to="/seller" className="btn w-full">
                    Seller Dashboard
                  </Link>
                  <button className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                    Add New Product
                  </button>
                </div>
              )}

              {user.role === 'super_admin' && (
                <div className="space-y-3">
                  <Link to="/superadmin" className="btn w-full">
                    Super Admin Panel
                  </Link>
                </div>
              )}

              {user.role === 'ops_manager' && (
                <div className="space-y-3 mt-4">
                  <Link to="/ops" className="btn w-full">
                    Operations Dashboard
                  </Link>
                </div>
              )}

              {user.role === 'logistics_manager' && (
                <div className="space-y-3 mt-4">
                  <Link to="/logistics" className="btn w-full">
                    Logistics Dashboard
                  </Link>
                </div>
              )}

              {user.role === 'finance_manager' && (
                <div className="space-y-3 mt-4">
                  <Link to="/finance" className="btn w-full">
                    Finance Dashboard
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Referral Code Section for all users */}
        {user.referralCode && (
          <div className="card mt-6">
            <h2 className="text-xl font-semibold mb-4">Your Referral Code</h2>
            <div className="flex items-center space-x-3">
              <code className="bg-gray-100 px-4 py-2 rounded text-lg font-mono flex-1">
                {user.referralCode}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(user.referralCode);
                  alert('Referral code copied!');
                }}
                className="btn"
              >
                Copy Code
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Share this code with friends to earn rewards when they make purchases!
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
