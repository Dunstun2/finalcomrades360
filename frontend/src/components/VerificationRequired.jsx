import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FaExclamationTriangle, FaCheckCircle, FaUser, FaShieldAlt } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const VerificationRequired = () => {
  const { verificationMessage, retryAuth, user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <FaExclamationTriangle className="mx-auto h-12 w-12 text-yellow-500" />
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Account Verification Required
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              {verificationMessage || 'Your account requires verification before you can access this feature.'}
            </p>
          </div>

          <div className="mt-8 space-y-6">
            {/* User info section */}
            {user && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center">
                  <FaUser className="h-5 w-5 text-blue-600 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Logged in as</p>
                    <p className="text-sm text-blue-700">{user.name} ({user.email})</p>
                  </div>
                </div>
              </div>
            )}

            {/* Verification steps */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Next Steps:</h3>
              
              <div className="space-y-3">
                <div className="flex items-start">
                  <FaCheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">1. Complete Profile</p>
                    <p className="text-xs text-gray-600">Update your personal information and contact details</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <FaShieldAlt className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">2. Submit Documents</p>
                    <p className="text-xs text-gray-600">Upload required identification documents</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <FaCheckCircle className="h-5 w-5 text-gray-300 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">3. Await Approval</p>
                    <p className="text-xs text-gray-600">Our team will review your application</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col space-y-3">
              <Link
                to="/profile"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Complete Profile
              </Link>
              
              <button
                onClick={retryAuth}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Check Status Again
              </button>
              
              <Link
                to="/"
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Go to Homepage
              </Link>
            </div>

            {/* Help section */}
            <div className="border-t border-gray-200 pt-6">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Need Help?</h4>
              <p className="text-xs text-gray-600">
                If you've completed your verification and are still seeing this message, 
                please try refreshing the page or contact our support team.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerificationRequired;