const { Category, Subcategory, Product } = require('../models');
const { Op } = require('sequelize');

// Update a category
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, emoji } = req.body;

    if (!name || !emoji) {
      return res.status(400).json({ error: 'Name and emoji are required' });
    }

    // Check if name is already taken by another category
    const existingCategory = await Category.findOne({
      where: {
        name,
        id: { [Op.ne]: id } // Exclude current category from the check
      }
    });

    if (existingCategory) {
      return res.status(400).json({ error: 'A category with this name already exists' });
    }

    const category = await Category.findByPk(id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Update the category
    await category.update({
      name: name.trim(),
      emoji,
      slug: name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')
    });

    res.json(category);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Server error while updating category' });
  }
};

// Update a subcategory
const updateSubcategory = async (req, res) => {
  try {
    const { categoryId, subcategoryId } = req.params;
    const { name, emoji } = req.body;

    if (!name || !emoji) {
      return res.status(400).json({ error: 'Name and emoji are required' });
    }

    // Check if the parent category exists
    const parentCategory = await Category.findByPk(categoryId);
    if (!parentCategory) {
      return res.status(404).json({ error: 'Parent category not found' });
    }

    // Check if name is already taken by another subcategory in the same category
    const existingSubcategory = await Subcategory.findOne({
      where: {
        name,
        categoryId: categoryId,
        id: { [Op.ne]: subcategoryId } // Exclude current subcategory from the check
      }
    });

    if (existingSubcategory) {
      return res.status(400).json({ error: 'A subcategory with this name already exists in this category' });
    }

    const subcategory = await Subcategory.findByPk(subcategoryId);
    if (!subcategory) {
      return res.status(404).json({ error: 'Subcategory not found' });
    }

    // Update the subcategory
    await subcategory.update({
      name: name.trim(),
      emoji,
      slug: name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')
    });

    res.json(subcategory);
  } catch (error) {
    console.error('Error updating subcategory:', error);
    res.status(500).json({ error: 'Server error while updating subcategory' });
  }
};

// Create a new category
const createCategory = async (req, res) => {
  try {
    const { name, emoji, isActive = true } = req.body;

    if (!name || !emoji) {
      return res.status(400).json({ error: 'Name and emoji are required' });
    }

    // Check if name is already taken
    const existingCategory = await Category.findOne({
      where: {
        name: name.trim()
      }
    });

    if (existingCategory) {
      return res.status(400).json({ error: 'A category with this name already exists' });
    }

    // Create the category
    const category = await Category.create({
      name: name.trim(),
      emoji,
      slug: name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      isActive
    });

    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Server error while creating category' });
  }
};

// Create a new subcategory
const createSubcategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { name, emoji, isActive = true } = req.body;

    if (!name || !emoji) {
      return res.status(400).json({ error: 'Name and emoji are required' });
    }

    // Check if the parent category exists
    const parentCategory = await Category.findByPk(categoryId);
    if (!parentCategory) {
      return res.status(404).json({ error: 'Parent category not found' });
    }

    // Check if name is already taken by another subcategory in the same category
    const existingSubcategory = await Subcategory.findOne({
      where: {
        name: name.trim(),
        categoryId: categoryId
      }
    });

    if (existingSubcategory) {
      return res.status(400).json({ error: 'A subcategory with this name already exists in this category' });
    }

    // Create the subcategory
    const subcategory = await Subcategory.create({
      name: name.trim(),
      emoji,
      slug: name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      categoryId: categoryId,
      isActive
    });

    res.status(201).json(subcategory);
  } catch (error) {
    console.error('Error creating subcategory:', error);
    res.status(500).json({ error: 'Server error while creating subcategory' });
  }
};

// Delete a category
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findByPk(id, {
      include: [{
        model: Subcategory,
        as: 'Subcategory', // Changed from 'subcategory' to match model association
        required: false
      }]
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Check if category has subcategories
    if (category.Subcategory && category.Subcategory.length > 0) {
      return res.status(400).json({
        error: 'Cannot delete category with subcategories. Please delete all subcategories first.'
      });
    }

    // Check if category has products
    const productCount = await Product.count({
      where: { categoryId: id }
    });

    if (productCount > 0) {
      return res.status(400).json({
        error: `Cannot delete category. It has ${productCount} products associated with it.`
      });
    }

    // Delete the category
    await category.destroy();

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Server error while deleting category' });
  }
};

// Delete a subcategory
const deleteSubcategory = async (req, res) => {
  try {
    const { categoryId, subcategoryId } = req.params;

    // Check if subcategory exists and belongs to the specified category
    const subcategory = await Subcategory.findOne({
      where: {
        id: subcategoryId,
        categoryId: categoryId
      }
    });

    if (!subcategory) {
      return res.status(404).json({ error: 'Subcategory not found or does not belong to specified category' });
    }

    // Check if subcategory has products
    const productCount = await Product.count({
      where: { subcategoryId: subcategoryId }
    });

    if (productCount > 0) {
      return res.status(400).json({
        error: `Cannot delete subcategory. It has ${productCount} products associated with it.`
      });
    }

    // Delete the subcategory
    await subcategory.destroy();

    res.json({ message: 'Subcategory deleted successfully' });
  } catch (error) {
    console.error('Error deleting subcategory:', error);
    res.status(500).json({ error: 'Server error while deleting subcategory' });
  }
};

module.exports = {
  createCategory,
  createSubcategory,
  updateCategory,
  updateSubcategory,
  deleteCategory,
  deleteSubcategory
};
