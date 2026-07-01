import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { manuals } from '@/data/manuals';
import { FaArrowLeft, FaBookOpen, FaLightbulb, FaCheckCircle } from 'react-icons/fa';

const DashboardManual = ({ role: propRole }) => {
  const { role: paramRole } = useParams();
  const navigate = useNavigate();
  const role = propRole || paramRole || 'customer';
  const manual = manuals[role] || manuals.customer;

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-blue-600 transition-colors"
          >
            <FaArrowLeft className="mr-2" />
            <span>Back</span>
          </button>
          <div className="flex items-center text-blue-600">
            <FaBookOpen className="mr-2 text-xl" />
            <span className="font-semibold uppercase tracking-wider text-sm">Official Guide</span>
          </div>
        </div>

        {/* Title Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            {manual.title}
          </h1>
          <p className="text-gray-500 max-w-2xl text-lg">
            Master the Comrades360 platform with this comprehensive step-by-step guide tailored for your role.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-6">
          {manual.sections.map((section, index) => (
            <div 
              key={index} 
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-all hover:shadow-md"
            >
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600 shrink-0 font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800 mb-3 flex items-center">
                      <span className="sm:hidden mr-2 text-blue-600">{index + 1}.</span>
                      {section.title}
                    </h2>
                    <div className="text-gray-600 leading-relaxed whitespace-pre-line">
                      {section.content}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-blue-50/30 px-6 py-3 border-t border-gray-50 flex items-center justify-between">
                <div className="flex items-center text-blue-700 text-sm font-medium">
                  <FaCheckCircle className="mr-2" />
                  <span>Key Objective</span>
                </div>
                <div className="text-gray-400 text-xs">
                  Section {index + 1}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pro-Tips / Footer */}
        <div className="mt-12 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-white shadow-lg">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 items-center justify-center rounded-full bg-white/20 flex shrink-0">
              <FaLightbulb className="text-2xl" />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2 text-white">Pro Tip for Success</h3>
              <p className="text-blue-100 leading-relaxed">
                Consistency is key. Regularly updating your profile, responding quickly to notifications, and using the marketing tools provided will significantly increase your visibility and earnings on the platform.
              </p>
            </div>
          </div>
        </div>

        {/* Support Link */}
        <div className="text-center mt-12 pb-12">
          <p className="text-gray-500 mb-4">Still need help?</p>
          <button 
            onClick={() => navigate('/customer/support')}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all transform hover:scale-105"
          >
            Contact Support Team
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardManual;
