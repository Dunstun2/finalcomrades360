import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { ArrowLeft, Plus, Utensils, Settings, Package } from 'lucide-react';

const TestDynamicForms = () => {
  const navigate = useNavigate();
  const [testData] = useState({
    regularProduct: {
      name: "Test Smartphone",
      category: "Electronics",
      price: "599.99",
      description: "A test smartphone for testing regular product forms"
    },
    foodItem: {
      name: "Test Burger",
      category: "Food & Drinks",
      price: "8.99",
      description: "A test burger for testing food & drinks forms"
    },
    serviceItem: {
      name: "Test Plumbing Service",
      category: "Services", 
      price: "50.00",
      description: "A test plumbing service for testing service forms"
    }
  });

  const handleTestForm = (type) => {
    switch(type) {
      case 'regular':
        navigate('/dashboard/products/smart-create');
        break;
      case 'smart':
        navigate('/dashboard/products/smart-create');
        break;
      case 'food':
        navigate('/dashboard/fastfood/create');
        break;
      case 'service':
        navigate('/dashboard/services/create');
        break;
      default:
        break;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="mb-4 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              🧪 Dynamic Form Switching Test
            </h1>
            <p className="text-lg text-gray-600">
              Test the automatic form type detection and switching based on category selection
            </p>
          </div>
        </div>

        {/* Test Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Regular Product Form */}
          <Card className="border-2 border-blue-200 hover:border-blue-400 transition-colors">
            <CardHeader className="text-center">
              <Package className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <CardTitle className="text-blue-900">Regular Product Form</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Standard product form for general merchandise like electronics, clothing, books, etc.
              </p>
              <Button 
                onClick={() => handleTestForm('regular')} 
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Test Regular Form
              </Button>
            </CardContent>
          </Card>

          {/* Smart Product Form */}
          <Card className="border-2 border-green-200 hover:border-green-400 transition-colors">
            <CardHeader className="text-center">
              <Settings className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <CardTitle className="text-green-900">Smart Product Form</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Dynamic form that automatically switches based on category detection
              </p>
              <Button 
                onClick={() => handleTestForm('smart')} 
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Test Smart Form
              </Button>
            </CardContent>
          </Card>

          {/* Fast Food Form */}
          <Card className="border-2 border-orange-200 hover:border-orange-400 transition-colors">
            <CardHeader className="text-center">
              <Utensils className="h-8 w-8 mx-auto mb-2 text-orange-600" />
              <CardTitle className="text-orange-900">Food & Drinks Form</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Specialized form for restaurant items, beverages, and food-related products
              </p>
              <Button 
                onClick={() => handleTestForm('food')} 
                className="w-full bg-orange-600 hover:bg-orange-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Test Food Form
              </Button>
            </CardContent>
          </Card>

          {/* Service Form */}
          <Card className="border-2 border-purple-200 hover:border-purple-400 transition-colors">
            <CardHeader className="text-center">
              <Settings className="h-8 w-8 mx-auto mb-2 text-purple-600" />
              <CardTitle className="text-purple-900">Service Form</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Form for professional services, consultations, repairs, and maintenance
              </p>
              <Button 
                onClick={() => handleTestForm('service')} 
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Test Service Form
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* How It Works Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-gray-900">
              🔍 How Dynamic Form Switching Works
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-2">1. Category Detection</h4>
                <p className="text-sm text-blue-800">
                  The system analyzes category and subcategory names using keyword patterns to identify the product type.
                </p>
                <div className="mt-2 text-xs text-blue-700">
                  <strong>Keywords:</strong> food, drink, restaurant, cafe, cuisine, etc.
                </div>
              </div>
              
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <h4 className="font-semibold text-green-900 mb-2">2. Form Selection</h4>
                <p className="text-sm text-green-800">
                  Based on the detected category type, the appropriate form is automatically loaded.
                </p>
                <div className="mt-2 text-xs text-green-700">
                  <strong>Types:</strong> Food & Drinks, Services, Regular Products
                </div>
              </div>
              
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <h4 className="font-semibold text-purple-900 mb-2">3. User Experience</h4>
                <p className="text-sm text-purple-800">
                  Users see a form type indicator and get a tailored form experience for their specific product type.
                </p>
                <div className="mt-2 text-xs text-purple-700">
                  <strong>Benefit:</strong> Relevant fields, proper validation, specialized features
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-bold text-gray-900">
              🧪 Testing Instructions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-900 mb-2">Testing the Smart Form:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-yellow-800">
                <li>Click "Test Smart Form" to open the dynamic form</li>
                <li>Select a category (try "Food & drinks" or any category with food-related keywords)</li>
                <li>Observe how the form automatically switches to the appropriate type</li>
                <li>Try different categories to see the form type indicator change</li>
                <li>Note the different field sets and validation rules for each form type</li>
              </ol>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">Expected Behavior:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
                <li><strong>Food & Drinks:</strong> Should switch to FastFoodForm with specialized fields</li>
                <li><strong>Services:</strong> Should switch to CreateService form</li>
                <li><strong>Other Categories:</strong> Should use the regular ComradesProductForm</li>
                <li>Form type indicator should show the current detected type with color coding</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TestDynamicForms;