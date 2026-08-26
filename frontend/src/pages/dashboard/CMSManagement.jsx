import React from 'react';
import { Link } from 'react-router-dom';
import { FaFileAlt, FaArrowRight } from 'react-icons/fa';

export default function CMSManagement() {
  const cmsPages = [
    {
      name: 'About Page',
      path: '/dashboard/cms/about',
      description: 'Manage and create the About Us page content'
    },
    {
      name: 'Contact Page',
      path: '/dashboard/cms/contact',
      description: 'Manage and create the Contact Us page content'
    },
    {
      name: 'Blog Management',
      path: '/dashboard/cms/blog',
      description: 'Create, edit, and manage blog posts and articles'
    }
  ];

  return (
    <div className="w-full h-full">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">CMS Management</h1>
        <p className="text-gray-600 text-lg">Manage your website content pages</p>
      </div>

      {/* CMS Pages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cmsPages.map((page) => (
          <Link
            key={page.path}
            to={page.path}
            className="group bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-blue-300 transition-all duration-200 cursor-pointer"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-600 transition-colors">
                  <FaFileAlt className="text-blue-600 text-xl group-hover:text-white" />
                </div>
              </div>
              <FaArrowRight className="text-gray-300 group-hover:text-blue-600 transition-colors" />
            </div>

            <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
              {page.name}
            </h3>
            <p className="text-gray-600 text-sm">
              {page.description}
            </p>

            <div className="mt-4 flex items-center gap-2 text-blue-600 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
              <span>Open</span>
              <FaArrowRight className="text-xs" />
            </div>
          </Link>
        ))}
      </div>

      {/* Placeholder Info Section */}
      <div className="mt-12 bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="text-lg font-bold text-blue-900 mb-3">📝 Placeholder Content</h3>
        <p className="text-blue-800 mb-4">
          These pages are currently set up as placeholders. Click on each page to access the management interface for:
        </p>
        <ul className="list-disc list-inside space-y-2 text-blue-800">
          <li><strong>About Page:</strong> Create and manage content for your About Us page</li>
          <li><strong>Contact Page:</strong> Create and manage content for your Contact Us page</li>
          <li><strong>Blog Management:</strong> Create and manage blog posts with featured images, author info, categories, and tags</li>
        </ul>
      </div>
    </div>
  );
}
