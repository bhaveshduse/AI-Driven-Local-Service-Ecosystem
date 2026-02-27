import Category from '../../models/Category.js';
import createError from 'http-errors';
import slugify from 'slugify';

/**
 * Fetches all categories.
 * @route GET /api/admin/categories
 */
export const getAllCategories = async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json(categories);
  } catch (error) {
    next(createError(500, 'Error fetching categories.'));
  }
};

/**
 * Creates a new category.
 * Expects 'name' and an optional 'imageFile' in a multipart/form-data request.
 * @route POST /api/admin/categories
 */
export const createCategory = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) {
      return next(createError(400, 'Category name is required.'));
    }

    const newCategory = new Category({
      name,
      slug: slugify(name, { lower: true, strict: true }),
      image: req.file ? req.file.path : undefined,
    });

    await newCategory.save();
    res.status(201).json(newCategory);
  } catch (error) {
    if (error.code === 11000) { // Duplicate key error
      return next(createError(409, 'A category with this name already exists.'));
    }
    next(createError(500, 'Error creating category.'));
  }
};

/**
 * Updates an existing category.
 * @route PUT /api/admin/categories/:id
 */
export const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const updateData = { name };
    if (name) {
      updateData.slug = slugify(name, { lower: true, strict: true });
    }
    if (req.file) {
      updateData.image = req.file.path;
    }

    const updatedCategory = await Category.findByIdAndUpdate(id, updateData, { new: true });
    if (!updatedCategory) {
      return next(createError(404, 'Category not found.'));
    }
    res.json(updatedCategory);
  } catch (error) {
    next(createError(500, 'Error updating category.'));
  }
};

/**
 * Deletes a category.
 * @route DELETE /api/admin/categories/:id
 */
export const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deletedCategory = await Category.findByIdAndDelete(id);
    if (!deletedCategory) {
      return next(createError(404, 'Category not found'));
    }
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    next(createError(500, 'Error deleting category.'));
  }
};