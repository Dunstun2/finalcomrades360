import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { FaLink, FaCopy, FaExternalLinkAlt, FaTrash } from 'react-icons/fa';

export default function SharedLinks() {
  const { sharedLinks = [] } = useOutletContext();

  // Mock data - replace with actual data from your API
  const links = sharedLinks.length > 0 ? sharedLinks : [
    {
      id: 1,
      url: 'https://example.com/product/1',
      platform: 'Facebook',
      clicks: 42,
      shares: 12,
      createdAt: '2023-10-15T10:30:00Z',
      lastClicked: '2023-10-20T14:22:00Z'
    },
    {
      id: 2,
      url: 'https://example.com/product/2',
      platform: 'Twitter',
      clicks: 28,
      shares: 5,
      createdAt: '2023-10-14T15:45:00Z',
      lastClicked: '2023-10-19T11:10:00Z'
    },
    {
      id: 3,
      url: 'https://example.com/product/3',
      platform: 'WhatsApp',
      clicks: 15,
      shares: 8,
      createdAt: '2023-10-13T09:20:00Z',
      lastClicked: '2023-10-18T16:35:00Z'
    }
  ];

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      // Show success message
      alert('Link copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">My Shared Links</h3>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">Track and manage all your shared product links.</p>
      </div>
      
      <div className="border-t border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Platform
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Clicks
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Shares
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Clicked
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {links.map((link) => (
                <tr key={link.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{link.platform}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      {link.clicks}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {link.shares}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(link.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {link.lastClicked ? formatDate(link.lastClicked) : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex space-x-2 justify-end">
                      <button
                        onClick={() => copyToClipboard(link.url)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Copy link"
                      >
                        <FaCopy className="h-4 w-4" />
                      </button>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-600 hover:text-gray-900"
                        title="Open in new tab"
                      >
                        <FaExternalLinkAlt className="h-4 w-4" />
                      </a>
                      <button
                        className="text-red-600 hover:text-red-900"
                        title="Delete link"
                        onClick={() => {
                          // Add delete functionality
                          if (window.confirm('Are you sure you want to delete this link?')) {
                            // Handle delete
                            console.log('Deleting link:', link.id);
                          }
                        }}
                      >
                        <FaTrash className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {links.length === 0 && (
        <div className="bg-white px-4 py-12 text-center sm:px-6">
          <FaLink className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No shared links</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by sharing your first product.</p>
        </div>
      )}
    </div>
  );
}
