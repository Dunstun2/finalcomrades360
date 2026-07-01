import React from 'react';
import { FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';

export default function ProfileCompletionTab({ completionRate, incompleteFields }) {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">Profile Completion</h3>
        <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
          <div 
            className="bg-blue-600 h-4 rounded-full transition-all duration-500" 
            style={{ width: `${completionRate}%` }}
          ></div>
        </div>
        <p className="text-sm text-gray-600">
          Your profile is {completionRate}% complete. {completionRate < 100 ? 'Complete all sections to unlock all features.' : 'Great job! Your profile is complete.'}
        </p>
      </div>

      {incompleteFields && incompleteFields.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <FaExclamationCircle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Incomplete Information</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>The following required fields are missing or incomplete:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  {incompleteFields.map((field, index) => (
                    <li key={index}>{field}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h4 className="font-medium mb-4">Personal Information</h4>
          <div className="space-y-3">
            <div className="flex items-center">
              <FaCheckCircle className="text-green-500 mr-2" />
              <span>Basic Details</span>
            </div>
            <div className="flex items-center text-gray-400">
              <FaCheckCircle className="mr-2" />
              <span>Contact Information</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h4 className="font-medium mb-4">Account Security</h4>
          <div className="space-y-3">
            <div className="flex items-center">
              <FaCheckCircle className="text-green-500 mr-2" />
              <span>Email Verification</span>
            </div>
            <div className="flex items-center">
              <FaCheckCircle className="text-green-500 mr-2" />
              <span>Two-Factor Authentication</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
