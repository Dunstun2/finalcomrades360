import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { 
  FaPlus, 
  FaList, 
  FaClock, 
  FaTimes,
  FaArrowLeft
} from 'react-icons/fa';

const ProductsPage = () => {
  const productCards = [
    {
      id: 'create',
      title: 'Create Product',
      icon: <FaPlus className="text-3xl text-green-500" />,
      to: '/dashboard/products/smart-create',
      description: 'Add a new product to your inventory',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      hoverColor: 'hover:border-green-400'
    },
    {
      id: 'list',
      title: 'Our Products',
      icon: <FaList className="text-3xl text-blue-500" />,
      to: '/dashboard/products/list',
      description: 'View and manage all your products',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      hoverColor: 'hover:border-blue-400'
    },
    {
      id: 'pending',
      title: 'Pending Approval',
      icon: <FaClock className="text-3xl text-yellow-500" />,
      to: '/dashboard/products/pending',
      description: 'Products awaiting admin approval',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      hoverColor: 'hover:border-yellow-400'
    },
    {
      id: 'rejected',
      title: 'Rejected Products',
      icon: <FaTimes className="text-3xl text-red-500" />,
      to: '/dashboard/products/rejected',
      description: 'View and update rejected products',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      hoverColor: 'hover:border-red-400'
    }
  ];

  // Check if we're on a child route (like /list, /create, etc.)
  const isChildRoute = window.location.pathname !== '/dashboard/products';

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {!isChildRoute && (
        <>
          <div className="flex items-center mb-8">
            <Link
              to="/dashboard"
              className="mr-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Go back"
            >
              <FaArrowLeft className="text-gray-600" />
            </Link>
            <h2 className="text-2xl font-bold text-gray-800">Product Management</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {productCards.map((card) => (
              <Link
                key={card.id}
                to={card.to}
                className={`${card.bgColor} ${card.borderColor} ${card.hoverColor} border-2 rounded-xl p-6 flex flex-col items-center justify-center transition-all hover:shadow-lg`}
              >
                <div className="p-4 rounded-full bg-white mb-4">
                  {card.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-800 text-center">
                  {card.title}
                </h3>
                <p className="text-gray-600 text-sm mt-2 text-center">
                  {card.description}
                </p>
              </Link>
            ))}
          </div>
        </>
      )}
      
      {/* This will render the child routes */}
      <Outlet />
    </div>
  );
};

export default ProductsPage;
