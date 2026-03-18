import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FaBoxes,
  FaBox,
  FaTools,
  FaArrowRight,
  FaUtensils,
} from 'react-icons/fa';

const ProductManagement = () => {
  const navigate = useNavigate();
  const mainCards = [
    {
      id: 'categories',
      title: 'Categories',
      icon: <FaBoxes className="text-4xl text-blue-500" />,
      to: '/dashboard/categories',
      description: 'Manage product categories and subcategories',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      hoverColor: 'hover:bg-blue-100',
      action: () => navigate('/dashboard/categories')
    },
    {
      id: 'products',
      title: 'Products',
      icon: <FaBox className="text-4xl text-green-500" />,
      to: '/dashboard/products',
      description: '',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      hoverColor: 'hover:bg-green-100',
      action: () => navigate('/dashboard/products')
    },
    {
      id: 'fastfood',
      title: 'FastFood',
      icon: <FaUtensils className="text-4xl text-orange-500" />,
      to: '/dashboard/fastfood',
      description: 'Manage fast food items and menus',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      hoverColor: 'hover:bg-orange-100',
      action: () => navigate('/dashboard/fastfood')
    },
    {
      id: 'services',
      title: 'Services',
      icon: <FaTools className="text-4xl text-purple-500" />,
      to: '/dashboard/services',
      description: 'Manage your service offerings',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      hoverColor: 'hover:bg-purple-100',
      action: () => navigate('/dashboard/services')
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center text-gray-600 hover:text-gray-800 mb-4 transition-colors"
          >
            <FaArrowRight className="transform rotate-180 mr-2" />
            <span>Back to Dashboard</span>
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Product Management</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {mainCards.map((card) => (
            <Link
              key={card.id}
              to={card.to}
              className={`${card.bgColor} ${card.borderColor} ${card.hoverColor} border rounded-lg p-8 flex flex-col transition-all transform hover:-translate-y-1 hover:shadow-md h-full cursor-pointer`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    {card.title}
                  </h3>
                  <p className="text-gray-600">{card.description}</p>
                </div>
                <div className="p-3 rounded-full bg-white shadow-sm">
                  {card.icon}
                </div>
              </div>
              <div className="mt-auto pt-4 flex justify-end">
                <FaArrowRight className="text-gray-500" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProductManagement;
