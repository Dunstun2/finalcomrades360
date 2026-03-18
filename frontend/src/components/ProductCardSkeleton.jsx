import React from 'react';
import { Card, CardContent } from './ui/card';

const ProductCardSkeleton = () => {
  return (
    <Card className="overflow-hidden animate-pulse">
      <div className="p-4">
        <div className="flex space-x-4">
          {/* Product Image */}
          <div className="h-20 w-20 flex-shrink-0 bg-gray-200 rounded-md border border-gray-200"></div>
          
          {/* Product Info */}
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded mb-2 w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded mb-2 w-1/2"></div>
            <div className="h-5 bg-gray-200 rounded w-16"></div>
          </div>
          
          {/* Price and Actions */}
          <div className="text-right">
            <div className="h-6 bg-gray-200 rounded mb-2 w-20"></div>
            <div className="flex space-x-1 justify-end">
              <div className="h-6 w-16 bg-gray-200 rounded"></div>
              <div className="h-6 w-16 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ProductCardSkeleton;