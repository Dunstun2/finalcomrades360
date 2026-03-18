import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/ui/use-toast';
import { useCategories } from '../../contexts/CategoriesContext';
import ComradesProductForm from '../../pages/dashboard/comrades/ComradesProductForm';
import FastFoodForm from '../../pages/dashboard/FastFoodForm';
import CreateService from '../../pages/dashboard/CreateService';
import { Loader2, ArrowLeft, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';

// Category type detection constants
const CATEGORY_TYPES = {
  FOOD_DRINKS: 'food_drinks',
  SERVICES: 'services',
  REGULAR: 'regular'
};

// Category detection patterns
const CATEGORY_PATTERNS = {
  [CATEGORY_TYPES.FOOD_DRINKS]: [
    'food', 'drink', 'beverage', 'restaurant', 'cafe', 'kitchen', 'cook',
    'snack', 'meal', 'cuisine', 'dining', 'eatery', 'nutrition', 'culinary', 'hot meal', 'hotel meal'
  ],
  [CATEGORY_TYPES.SERVICES]: [
    'service', 'repair', 'maintenance', 'cleaning', 'tutoring', 'consulting',
    'installation', 'delivery', 'professional', 'technical', 'support'
  ]
};

const SmartProductFormWrapper = ({
  product: initialProduct,
  id: propId,
  onSuccess,
  className = ""
}) => {
  const { id: paramId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { categories } = useCategories();
  const id = propId || paramId;

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [formType, setFormType] = useState(CATEGORY_TYPES.REGULAR);
  const [isDetecting, setIsDetecting] = useState(true);
  const [error, setError] = useState(null);

  // Detect category type based on name patterns
  const detectCategoryType = useCallback((categoryName, subcategoryName = '') => {
    const searchText = `${categoryName} ${subcategoryName}`.toLowerCase();

    // Check for food & drinks patterns
    const foodMatches = CATEGORY_PATTERNS[CATEGORY_TYPES.FOOD_DRINKS].some(pattern =>
      searchText.includes(pattern)
    );
    if (foodMatches) return CATEGORY_TYPES.FOOD_DRINKS;

    // Check for services patterns  
    const serviceMatches = CATEGORY_PATTERNS[CATEGORY_TYPES.SERVICES].some(pattern =>
      searchText.includes(pattern)
    );
    if (serviceMatches) return CATEGORY_TYPES.SERVICES;

    // Default to regular product
    return CATEGORY_TYPES.REGULAR;
  }, []);

  // Enhanced category lookup with fallback logic
  const findCategoryById = useCallback((categoryId) => {
    if (!categories || !Array.isArray(categories)) return null;

    const category = categories.find(cat =>
      String(cat?.id || '') === String(categoryId) ||
      String(cat?._id || '') === String(categoryId)
    );

    return category || null;
  }, [categories]);

  // Enhanced subcategory lookup
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

  // Main detection effect
  useEffect(() => {
    const detectFormType = async () => {
      try {
        setIsDetecting(true);
        setError(null);

        // If we're in edit mode with existing product data
        if (initialProduct) {
          const category = findCategoryById(initialProduct.categoryId);
          const subcategory = findSubcategoryById(category, initialProduct.subcategoryId);

          if (category) {
            const detectedType = detectCategoryType(
              category.name,
              subcategory?.name || ''
            );
            setSelectedCategory(category);
            setSelectedSubcategory(subcategory);
            setFormType(detectedType);
            return;
          }
        }

        // For new products, wait for category selection
        // This will be handled by the category change handler
        if (!initialProduct) {
          setFormType(CATEGORY_TYPES.REGULAR);
          return;
        }

        setError('Unable to determine product type from existing data');
      } catch (err) {
        console.error('Error detecting form type:', err);
        setError('Failed to analyze product data');
      } finally {
        setIsDetecting(false);
      }
    };

    detectFormType();
  }, [initialProduct, categories, findCategoryById, findSubcategoryById, detectCategoryType]);

  // Handle category selection changes
  const handleCategoryChange = useCallback((categoryId) => {
    try {
      const category = findCategoryById(categoryId);
      if (!category) {
        console.warn('Category not found for ID:', categoryId);
        setFormType(CATEGORY_TYPES.REGULAR);
        return;
      }

      setSelectedCategory(category);
      setSelectedSubcategory(null); // Reset subcategory when category changes

      // Detect form type based on category name
      const detectedType = detectCategoryType(category.name);
      setFormType(detectedType);

      console.log('Category changed:', {
        categoryId,
        categoryName: category.name,
        detectedType,
        formType: detectedType
      });

    } catch (err) {
      console.error('Error handling category change:', err);
      setError('Failed to process category selection');
    }
  }, [findCategoryById, detectCategoryType]);

  // Handle subcategory selection changes
  const handleSubcategoryChange = useCallback((subcategoryId) => {
    try {
      if (!selectedCategory) return;

      const subcategory = findSubcategoryById(selectedCategory, subcategoryId);
      setSelectedSubcategory(subcategory);

      // Re-detect form type with subcategory context
      const detectedType = detectCategoryType(
        selectedCategory.name,
        subcategory?.name || ''
      );
      setFormType(detectedType);

      console.log('Subcategory changed:', {
        subcategoryId,
        subcategoryName: subcategory?.name,
        detectedType,
        formType: detectedType
      });

    } catch (err) {
      console.error('Error handling subcategory change:', err);
      setError('Failed to process subcategory selection');
    }
  }, [selectedCategory, findSubcategoryById, detectCategoryType]);

  // Loading state
  if (isDetecting) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-8 ${className}`}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Analyzing Product Type
            </h2>
            <p className="text-gray-600">
              Determining the appropriate form based on category selection...
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
              Unable to Load Form
            </h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Form type info display
  const getFormTypeInfo = () => {
    switch (formType) {
      case CATEGORY_TYPES.FOOD_DRINKS:
        return {
          title: 'Food & Drinks Item',
          description: 'Specialized form for restaurant and food service items',
          color: 'orange'
        };
      case CATEGORY_TYPES.SERVICES:
        return {
          title: 'Service Listing',
          description: 'Form for professional services and consultations',
          color: 'purple'
        };
      default:
        return {
          title: 'Regular Product',
          description: 'Standard product form for general merchandise',
          color: 'blue'
        };
    }
  };

  const formInfo = getFormTypeInfo();

  // Render the appropriate form based on detected type
  const renderForm = () => {
    const commonProps = {
      product: initialProduct,
      id: propId,
      onSuccess: onSuccess,
      className: "h-full"
    };

    switch (formType) {
      case CATEGORY_TYPES.FOOD_DRINKS:
        return (
          <div className="relative">
            <FastFoodForm {...commonProps} />
          </div>
        );

      case CATEGORY_TYPES.SERVICES:
        return (
          <div className="relative">
            <CreateService {...commonProps} />
          </div>
        );

      default:
        return (
          <div className="relative">
            <ComradesProductForm
              {...commonProps}
              onCategoryChange={handleCategoryChange}
              onSubcategoryChange={handleSubcategoryChange}
            />
          </div>
        );
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      {/* Form Type Indicator */}
      <div className={`px-6 py-4 border-b border-gray-200 bg-${formInfo.color}-50`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full bg-${formInfo.color}-500`}></div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                {formInfo.title}
              </h3>
              <p className="text-xs text-gray-600">
                {formInfo.description}
              </p>
            </div>
          </div>

          {!initialProduct && selectedCategory && (
            <div className="text-right">
              <p className="text-xs font-medium text-gray-700">
                Selected: {selectedCategory.name}
                {selectedSubcategory && ` → ${selectedSubcategory.name}`}
              </p>
              <p className="text-xs text-gray-500">
                Form auto-selected based on category
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Dynamic Form Content */}
      <div className="min-h-[600px]">
        {renderForm()}
      </div>
    </div>
  );
};

export default SmartProductFormWrapper;
export { CATEGORY_TYPES };