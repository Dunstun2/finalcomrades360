import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FaArrowLeft, FaSave, FaSmile } from 'react-icons/fa';
import EmojiPicker from 'emoji-picker-react';
import { useCategories } from '../../contexts/CategoriesContext';

const CreateCategory = () => {
  const { addCategory } = useCategories();
  const [formData, setFormData] = useState({
    name: '',
    emoji: '📦', // Default emoji
    parentCategory: '',
    isActive: true,
  });
  
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef(null);
  const { id } = useParams();
  
  // Close emoji picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Load category data if in edit mode
  useEffect(() => {
    if (id) {
      // TODO: Fetch category data by ID
      // For now, we'll just set some mock data
      setFormData(prev => ({
        ...prev,
        name: 'Electronics',
        emoji: '📱',
        isActive: true
      }));
    }
  }, [id]);
  
  const navigate = useNavigate();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.name.trim()) {
      alert('Please enter a category name');
      return;
    }
    
    // Create category object
    const newCategory = {
      id: Date.now(), // Temporary ID, will be replaced by server
      name: formData.name.trim(),
      emoji: formData.emoji,
      isActive: formData.isActive,
      subcategories: []
    };
    
    try {
      await addCategory(newCategory);
      alert('Category created successfully!');
      navigate('/dashboard/categories');
    } catch (error) {
      console.error('Error creating category:', error);
      alert(error.message || 'Failed to create category. Please try again.');
    }
  };
  
  const onEmojiClick = (emojiData) => {
    setFormData(prev => ({
      ...prev,
      emoji: emojiData.emoji
    }));
    setShowEmojiPicker(false);
  };
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-800">
          {id ? 'Edit Category' : 'Create New Category'}
        </h2>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Category Emoji <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="w-16 h-16 text-4xl flex items-center justify-center bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    {formData.emoji}
                  </button>
                  {showEmojiPicker && (
                    <div ref={emojiPickerRef} className="absolute z-10 mt-2">
                      <EmojiPicker
                        onEmojiClick={(emojiData) => onEmojiClick(emojiData)}
                        width={300}
                        height={350}
                        searchPlaceholder="Search emoji..."
                      />
                    </div>
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="relative rounded-md shadow-sm">
                    <input
                      type="text"
                      value={formData.emoji}
                      onChange={(e) => setFormData(prev => ({ ...prev, emoji: e.target.value }))}
                      className="block w-full rounded-md border-gray-300 pl-3 pr-10 py-2 text-2xl h-16 text-center focus:border-blue-500 focus:ring-blue-500"
                      placeholder="Paste emoji here"
                      maxLength="2"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <span className="text-gray-400 text-xs">
                        {formData.emoji.length}/2
                      </span>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Click the emoji to pick one or paste directly
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Category Name <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <div className="relative flex items-stretch flex-grow focus-within:z-10">
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="block w-full rounded-none rounded-l-md pl-3 pr-12 py-2 border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g. Electronics, Clothing"
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="relative -ml-px inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 text-sm font-medium rounded-r-md text-gray-700 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <FaSmile className="h-5 w-5 text-gray-400" />
                </button>
              </div>
            </div>
            
            <div className="flex items-center">
              <input
                id="isActive"
                name="isActive"
                type="checkbox"
                checked={formData.isActive}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                Active (Visible to customers)
              </label>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <FaSave className="mr-2" />
              Save Category
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateCategory;
