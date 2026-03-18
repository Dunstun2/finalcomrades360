import React, { useState, useEffect, useRef, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaPlus, FaEdit, FaTrash, FaSearch, FaChevronDown, FaChevronRight, FaSmile } from 'react-icons/fa';
import EmojiPicker from 'emoji-picker-react';
import { useCategories } from '../../contexts/CategoriesContext';

// Categories are now managed by CategoriesContext

// Flatten the structure for the list view
const flattenCategories = (categoriesData = []) => {
  const flatList = [];
  categoriesData.forEach(category => {
    flatList.push({
      id: category.id,
      name: category.name,
      emoji: category.emoji,
      isMain: true,
      isActive: category.isActive !== false,
      products: category.products || 0
    });
    
    // Add subcategories
    (category.subcategories || []).forEach(sub => {
      flatList.push({
        id: sub.id,
        name: sub.name,
        emoji: sub.emoji,
        parentId: category.id,
        parentName: category.name,
        isMain: false,
        isActive: sub.isActive !== false,
        products: sub.products || 0
      });
    });
  });
  return flatList;
};

const CategoryList = () => {
  const { categories, addSubcategory, deleteCategory, deleteSubcategory, getCategoriesWithSubcategories } = useCategories();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState({});
  const [addingSubcategory, setAddingSubcategory] = useState(null);
  const [newSubcategory, setNewSubcategory] = useState({ name: '', emoji: '📝' });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Get categories with their subcategories properly combined
  const categoriesWithSubcategories = getCategoriesWithSubcategories();

  // Initialize all main categories as collapsed if not already set
  useEffect(() => {
    setExpandedCategories(prev => {
      const newState = { ...prev };
      categoriesWithSubcategories.forEach(cat => {
        if (newState[cat.id] === undefined) {
          newState[cat.id] = false;
        }
      });
      return newState;
    });
  }, [categoriesWithSubcategories]);

  const toggleCategory = (categoryId, e) => {
    // Only toggle if the click wasn't on an input field or button
    if (!e || !e.target.closest('button, input, a')) {
      setExpandedCategories(prev => ({
        ...prev,
        [categoryId]: !prev[categoryId]
      }));
      
      // Reset adding subcategory state when collapsing
      if (expandedCategories[categoryId]) {
        setAddingSubcategory(null);
      }
    }
  };

  const handleDelete = async (categoryId, subcategoryId = null) => {
    try {
      if (subcategoryId) {
        // Deleting a subcategory
        await deleteSubcategory(categoryId, subcategoryId);
      } else {
        // Deleting a category
        if (window.confirm('Are you sure you want to delete this category? This will also delete all its subcategories and products.')) {
          await deleteCategory(categoryId);
        }
      }
    } catch (error) {
      console.error('Error deleting:', error);
      alert(`Error: ${error.message}`);
    }
  };

  // Handle emoji selection
  const onEmojiClick = (emojiData) => {
    setNewSubcategory(prev => ({
      ...prev,
      emoji: emojiData.emoji
    }));
    setShowEmojiPicker(false);
  };

  // Handle pasted text and extract emoji if present
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedText = (e.clipboardData || window.clipboardData).getData('text');
    
    // Extract first emoji from pasted text
    const emojiRegex = /\p{Emoji}/gu;
    const emojiMatch = pastedText.match(emojiRegex);
    const firstEmoji = emojiMatch ? emojiMatch[0] : null;
    
    // Get text without emojis
    const textWithoutEmojis = pastedText.replace(emojiRegex, '').trim();
    
    // Update state
    setNewSubcategory(prev => ({
      name: prev.name + textWithoutEmojis,
      emoji: firstEmoji || prev.emoji
    }));
  };

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleAddSubcategory = (categoryId) => {
    setAddingSubcategory(categoryId);
    setNewSubcategory({ name: '', emoji: '📝' });
    
    // Focus the input field for the new entry
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
  };

  const handleSaveSubcategory = async (categoryId) => {
    if (!newSubcategory.name.trim()) {
      alert('Please enter a subcategory name');
      return;
    }

    try {
      await addSubcategory(categoryId, {
        name: newSubcategory.name.trim(),
        emoji: newSubcategory.emoji
      });
      setAddingSubcategory(null);
      setNewSubcategory({ name: '', emoji: '📝' });
    } catch (error) {
      console.error('Error adding subcategory:', error);
      alert(error.message || 'Failed to add subcategory. Please try again.');
    }
  };

  // Filter categories based on search term
  const filteredMainCategories = categoriesWithSubcategories.filter(category => {
    // Always show main categories that match search
    if (category.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return true;
    }
    
    // Show main categories that have matching subcategories
    if (category.subcategories && category.subcategories.length > 0) {
      return category.subcategories.some(sub =>
        sub.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return false;
  });


  const getSubcategories = (parentId) => {
    const parentCategory = categoriesWithSubcategories.find(cat => cat.id === parentId);
    return parentCategory?.subcategories || [];
  };

  const getFilteredSubcategories = (parentId) => {
    const subcategories = getSubcategories(parentId);
    if (!searchTerm.trim()) return subcategories;
    
    return subcategories.filter(subcategory =>
      subcategory.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const renderCategory = (category, level = 0) => {
    const isMain = level === 0; // Only the top-level categories are "main"
    const hasChildren = (category.subcategories?.length || 0) > 0;
    const isExpanded = expandedCategories[category.id];

    return (
      <div key={category.id} className={`mb-2 ${level > 0 ? 'ml-6' : ''}`}>
        <div
          className={`flex items-center justify-between p-3 bg-white border rounded-md hover:bg-gray-50 ${isMain ? 'cursor-pointer' : ''}`}
          onClick={(e) => isMain && toggleCategory(category.id, e)}
        >
          <div className="flex items-center">
            {isMain && (
              <div className="mr-2 text-gray-500 w-5 flex-shrink-0">
                {hasChildren ? (
                  isExpanded ? <FaChevronDown className="text-sm" /> : <FaChevronRight className="text-sm" />
                ) : (
                  <span className="w-5 inline-block"></span>
                )}
              </div>
            )}
            <span className="text-xl mr-3">{category.emoji}</span>
            <div>
              <p className="text-sm font-medium">
                {category.name}
              </p>
              <p className="text-xs text-gray-500">
                {category.products || 0} {category.products === 1 ? 'product' : 'products'}
                {isMain && hasChildren && ` • ${category.subcategories.length} subcategories`}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Link
              to={`/dashboard/categories/edit/${category.id}`}
              className="p-1 text-blue-500 hover:text-blue-700"
              title="Edit"
              onClick={(e) => e.stopPropagation()}
            >
              <FaEdit />
            </Link>
            <button
              onClick={() => handleDelete(category.id)}
              className="text-red-600 hover:text-red-800 ml-2"
              title="Delete category"
            >
              <FaTrash />
            </button>
          </div>
        </div>
        
        {isMain && isExpanded && (
          <div className="mt-1 ml-4 border-l-2 border-gray-200 pl-4 transition-all duration-200">
            {category.subcategories.map(child => (
              <div key={child.id} className="mt-1">
                <div className="flex items-center justify-between p-2 bg-gray-50 border rounded-md hover:bg-gray-100">
                  <div className="flex items-center">
                    <span className="text-lg mr-3">{child.emoji}</span>
                    <div>
                      <p className="text-sm font-medium">{child.name}</p>
                      <p className="text-xs text-gray-500">
                        {child.products || 0} {child.products === 1 ? 'product' : 'products'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Link
                      to={`/dashboard/categories/edit/${child.id}`}
                      className="p-1 text-blue-500 hover:text-blue-700"
                      title="Edit"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <FaEdit />
                    </Link>
                    <button
                      onClick={() => handleDelete(category.id, child.id)}
                      className="text-red-600 hover:text-red-800 ml-2"
                      title="Delete subcategory"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Add Subcategory Button */}
            <div className="mt-2 mb-2">
              {addingSubcategory === category.id ? (
                <div className="bg-gray-50 p-3 rounded-md border border-dashed border-gray-300">
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowEmojiPicker(!showEmojiPicker);
                        }}
                        className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-md hover:bg-gray-200"
                      >
                        <span className="text-xl">{newSubcategory.emoji}</span>
                      </button>
                      {showEmojiPicker && addingSubcategory === category.id && (
                        <div ref={emojiPickerRef} className="absolute z-10 mt-1">
                          <EmojiPicker
                            onEmojiClick={onEmojiClick}
                            width={300}
                            height={350}
                            searchPlaceholder="Search emoji..."
                          />
                        </div>
                      )}
                    </div>
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={newSubcategory.name}
                        onChange={(e) => setNewSubcategory(prev => ({ ...prev, name: e.target.value }))}
                        onPaste={handlePaste}
                        placeholder="Enter subcategory name (or paste emoji + text)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        ref={inputRef}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowEmojiPicker(!showEmojiPicker);
                        }}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      >
                        <FaSmile />
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setAddingSubcategory(null)}
                      className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSaveSubcategory(category.id)}
                      className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddSubcategory(category.id);
                  }}
                  className="flex items-center text-sm text-blue-500 hover:text-blue-700 mt-2"
                >
                  <FaPlus className="mr-1 text-xs" />
                  <span>Add Subcategory</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const mainCategoriesToDisplay = searchTerm.trim() ?
    filteredMainCategories :
    categoriesWithSubcategories;

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">My Categories</h2>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          {mainCategoriesToDisplay.length > 0 ? (
            mainCategoriesToDisplay.map(category => renderCategory(category))
          ) : (
            <div className="text-center py-8 text-gray-500">
              No categories found. <Link to="/dashboard/categories/create" className="text-blue-600 hover:underline">Create a new category</Link> to get started.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CategoryList;
