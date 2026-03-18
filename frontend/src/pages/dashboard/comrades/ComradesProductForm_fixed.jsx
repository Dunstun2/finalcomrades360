import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { useToast } from '../../../components/ui/use-toast';
import { productApi } from '../../../services/api';
import { useCategories } from '../../../contexts/CategoriesContext';
import { Loader2, ArrowLeft, Upload, Video, Save, Check, Edit, X, AlertCircle, Info } from 'lucide-react';
import { productExists, getProductEditUrl } from '../../../utils/productUtils';

// ... (rest of your imports and component code)

const ComradesProductForm = ({ onSuccess, product: initialProduct, id: propId, onCategoryChange, onSubcategoryChange }) => {
  // ... (all your existing component code)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="space-y-6">
          {/* Your form content */}
          
          {/* Form submission buttons */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditMode ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {isEditMode ? 'Update' : 'Create'} Product
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComradesProductForm;
