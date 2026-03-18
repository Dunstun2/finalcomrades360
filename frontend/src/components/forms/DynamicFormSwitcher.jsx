import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useToast } from '../../components/ui/use-toast';
import { useCategories } from '../../contexts/CategoriesContext';
import ComradesProductForm from '../../pages/dashboard/comrades/ComradesProductForm';
import FastFoodForm from '../../pages/dashboard/FastFoodForm';
import CreateService from '../../pages/dashboard/CreateService';
import { Loader2, AlertCircle, Info } from 'lucide-react';

// Category detection constants
const CATEGORY_TYPES = {
  FOOD_DRINKS: 'food_drinks',
  SERVICES: 'services',
  REGULAR: 'regular'
};

// Enhanced keyword patterns for better detection
const CATEGORY_PATTERNS = {
  [CATEGORY_TYPES.FOOD_DRINKS]: [
    'food', 'drink', 'beverage', 'restaurant', 'cafe', 'kitchen', 'cook',
    'snack', 'meal', 'cuisine', 'dining', 'eatery', 'nutrition', 'culinary',
    'burger', 'pizza', 'sandwich', 'salad', 'soup', 'coffee', 'tea',
    'juice', 'water', 'soda', 'alcohol', 'wine', 'beer', 'hot meal', 'hotel meal'
  ],
  [CATEGORY_TYPES.SERVICES]: [
    'service', 'services', 'repair', 'maintenance', 'cleaning', 'tutoring', 'consulting',
    'installation', 'delivery', 'professional', 'technical', 'support',
    'plumbing', 'electrical', 'carpentry', 'painting', 'gardening',
    'tutoring', 'training', 'coaching', 'advice', 'inspection',
    'student services', 'student service', 'academic', 'educational'
  ]
};

const DynamicFormSwitcher = ({
  product: initialProduct,
  id: propId,
  onSuccess,
  className = ""
}) => {
  const { id: paramId } = useParams();
  const location = useLocation();
  const { toast } = useToast();
  const { categories } = useCategories();
  const id = propId || paramId;

  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState('');
  const [currentFormType, setCurrentFormType] = useState(CATEGORY_TYPES.REGULAR);
  const [isDetecting, setIsDetecting] = useState(true);
  const [error, setError] = useState(null);
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  const categoryChangeTimeoutRef = useRef(null);

  // Enhanced category detection with detailed logging
  const detectCategoryType = useCallback((categoryName, subcategoryName = '') => {
    const searchText = `${categoryName || ''} ${subcategoryName || ''}`.toLowerCase().trim();

    console.log('🔍 Detecting category type for:', { categoryName, subcategoryName, searchText });

    if (!searchText) {
      console.log('❌ No category name provided, defaulting to regular');
      return CATEGORY_TYPES.REGULAR;
    }

    // Check for food & drinks patterns
    const foodMatches = CATEGORY_PATTERNS[CATEGORY_TYPES.FOOD_DRINKS].filter(pattern =>
      searchText.includes(pattern)
    );
    if (foodMatches.length > 0) {
      console.log('✅ Food & Drinks detected:', foodMatches);
      return CATEGORY_TYPES.FOOD_DRINKS;
    }

    // Check for services patterns  
    const serviceMatches = CATEGORY_PATTERNS[CATEGORY_TYPES.SERVICES].filter(pattern =>
      searchText.includes(pattern)
    );
    if (serviceMatches.length > 0) {
      console.log('✅ Services detected:', serviceMatches);
      return CATEGORY_TYPES.SERVICES;
    }

    console.log('❌ No patterns matched, defaulting to regular');
    return CATEGORY_TYPES.REGULAR;
  }, []);

  // Find category by ID
  const findCategoryById = useCallback((categoryId) => {
    if (!categories || !Array.isArray(categories) || !categoryId) return null;

    const category = categories.find(cat =>
      String(cat?.id || '') === String(categoryId) ||
      String(cat?._id || '') === String(categoryId)
    );

    return category || null;
  }, [categories]);

  // Find subcategory by ID
  const findSubcategoryById = useCallback((category, subcategoryId) => {
    if (!category || !subcategoryId) return null;

    const subcatList = category.Subcategory || category.subcategories || [];
    if (!Array.isArray(subcatList)) return null;

    const subcategory = subcatList.find(sub =>
      String(sub?.id || '') === String(subcategoryId) ||
      String(sub?._id || '') === String(subcategoryId)
    );

    return subcategory || null;
  }, []);

  // Monitor category changes from ComradesProductForm
  const handleCategoryChange = useCallback((categoryId) => {
    console.log('📝 [DynamicFormSwitcher] Category changed in form:', categoryId);
    console.log('📝 [DynamicFormSwitcher] Current categories data:', categories);

    // Clear any existing timeout
    if (categoryChangeTimeoutRef.current) {
      clearTimeout(categoryChangeTimeoutRef.current);
    }

    // Set new timeout to debounce rapid changes
    categoryChangeTimeoutRef.current = setTimeout(() => {
      console.log('📝 [DynamicFormSwitcher] Processing category change after debounce');
      setSelectedCategoryId(categoryId);
      setSelectedSubcategoryId(''); // Reset subcategory when category changes

      const category = findCategoryById(categoryId);
      console.log('📝 [DynamicFormSwitcher] Found category:', category);

      if (category) {
        const detectedType = detectCategoryType(category.name, '');
        console.log('🔄 [DynamicFormSwitcher] Form type changed from', currentFormType, 'to:', detectedType);
        console.log('🔄 [DynamicFormSwitcher] Category name used for detection:', category.name);

        setCurrentFormType(detectedType);

        // Show notification for form type change
        if (detectedType === CATEGORY_TYPES.FOOD_DRINKS) {
          toast({
            title: '🍽️ Food & Drinks Form',
            description: `Switched to food & drinks form for "${category.name}"`,
          });
        } else if (detectedType === CATEGORY_TYPES.SERVICES) {
          toast({
            title: '🛠️ Services Form',
            description: `Switched to services form for "${category.name}"`,
          });
        } else {
          toast({
            title: '📦 Regular Product Form',
            description: `Using regular form for "${category.name}"`,
          });
        }
      } else {
        console.warn('⚠️ [DynamicFormSwitcher] No category found for ID:', categoryId);
      }
    }, 100); // Reduced debounce time to 100ms for faster response

  }, [findCategoryById, detectCategoryType, toast, currentFormType, categories]);

  // Monitor subcategory changes from ComradesProductForm
  const handleSubcategoryChange = useCallback((subcategoryId) => {
    console.log('📝 Subcategory changed in form:', subcategoryId);

    setSelectedSubcategoryId(subcategoryId);

    // Re-detect form type with subcategory context
    const category = findCategoryById(selectedCategoryId);
    const subcategory = findSubcategoryById(category, subcategoryId);

    if (category) {
      const detectedType = detectCategoryType(category.name, subcategory?.name || '');
      console.log('🔄 Form type re-detected as:', detectedType);
      setCurrentFormType(detectedType);
    }
  }, [selectedCategoryId, findCategoryById, findSubcategoryById, detectCategoryType]);

  // Initialize form type based on existing product data
  useEffect(() => {
    const initializeFormType = async () => {
      try {
        setIsDetecting(true);

        if (initialProduct) {
          const category = findCategoryById(initialProduct.categoryId);
          const subcategory = findSubcategoryById(category, initialProduct.subcategoryId);

          if (category) {
            const detectedType = detectCategoryType(
              category.name,
              subcategory?.name || ''
            );
            setCurrentFormType(detectedType);
            setSelectedCategoryId(initialProduct.categoryId);
            setSelectedSubcategoryId(initialProduct.subcategoryId);
            console.log('📱 Edit mode - detected form type:', detectedType);
          }
        } else {
          // New product - default to regular form
          setCurrentFormType(CATEGORY_TYPES.REGULAR);
          console.log('➕ Create mode - defaulting to regular form');
        }
      } catch (err) {
        console.error('Error initializing form type:', err);
        setError('Failed to initialize form');
      } finally {
        setIsDetecting(false);
      }
    };

    initializeFormType();
  }, [initialProduct, categories, findCategoryById, findSubcategoryById, detectCategoryType]);

  // Get form type info for display
  const getFormTypeInfo = () => {
    switch (currentFormType) {
      case CATEGORY_TYPES.FOOD_DRINKS:
        return {
          title: '🍽️ Food & Drinks Form',
          description: 'Specialized form for restaurant and food items',
          color: 'orange',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200'
        };
      case CATEGORY_TYPES.SERVICES:
        return {
          title: '🛠️ Services Form',
          description: 'Form for professional services and consultations',
          color: 'purple',
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200'
        };
      default:
        return {
          title: '📦 Regular Product Form',
          description: 'Standard product form for general merchandise',
          color: 'blue',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        };
    }
  };

  const formInfo = getFormTypeInfo();

  // Loading state
  if (isDetecting) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-8 ${className}`}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Initializing Form
            </h2>
            <p className="text-gray-600">
              Setting up the appropriate form based on product type...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-8 ${className}`}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center max-w-md">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Form Initialization Error
            </h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render the appropriate form
  const renderForm = () => {
    const commonProps = {
      product: initialProduct,
      id: propId,
      onSuccess: onSuccess
    };

    console.log('🎨 Rendering form type:', currentFormType);

    switch (currentFormType) {
      case CATEGORY_TYPES.FOOD_DRINKS:
        return <FastFoodForm {...commonProps} />;

      case CATEGORY_TYPES.SERVICES:
        return <CreateService {...commonProps} />;

      default:
        return (
          <ComradesProductForm
            {...commonProps}
            onCategoryChange={handleCategoryChange}
            onSubcategoryChange={handleSubcategoryChange}
          />
        );
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      {/* Form Type Indicator */}
      <div className={`px-6 py-4 border-b ${formInfo.borderColor} ${formInfo.bgColor}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-4 h-4 rounded-full bg-${formInfo.color}-500 animate-pulse`}></div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {formInfo.title}
              </h3>
              <p className="text-sm text-gray-600">
                {formInfo.description}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowDebugInfo(!showDebugInfo)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              <Info className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Debug Information */}
        {showDebugInfo && (
          <div className="mt-4 p-3 bg-gray-100 rounded-lg text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <strong>Selected Category ID:</strong> {selectedCategoryId || 'None'}
              </div>
              <div>
                <strong>Selected Subcategory ID:</strong> {selectedSubcategoryId || 'None'}
              </div>
              <div>
                <strong>Current Form Type:</strong> {currentFormType}
              </div>
              <div>
                <strong>Mode:</strong> {initialProduct ? 'Edit' : 'Create'}
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        {!initialProduct && (
          <div className="mt-3 p-3 bg-white rounded-lg border">
            <p className="text-sm text-gray-700">
              <strong>💡 How it works:</strong> Select a category above. The form will automatically switch to the appropriate type based on your selection.
            </p>
          </div>
        )}
      </div>

      {/* Dynamic Form Content */}
      <div className="min-h-[600px]">
        {renderForm()}
      </div>
    </div>
  );
};

export default DynamicFormSwitcher;
export { CATEGORY_TYPES };