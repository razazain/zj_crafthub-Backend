import Category from "../models/CategoryModel.js";


// ✅ Create Category
export const createCategory = async (req, res) => {
  try {
    const { name, description, status } = req.body;

    // ✅ Check if category already exists
    const existingCategory = await Category.findOne({ name: name.trim() });
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: "Category with this name already exists",
      });
    }

    // ✅ Handle single image (from multer + Cloudinary)
    const image = req.file
      ? [{ url: req.file.path, alt: name }]
      : [];

    const category = await Category.create({
      name,
      description,
      status,
      images: image,   // store single image as array
    });

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      category,
    });
  } catch (error) {
    console.error("Create Category Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create category",
      error: error.message,
    });
  }
};

// ✅ Get All Categories
export const getCategories = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const filter = {};
    if (status) {
      filter.status = status; // active / inactive
    }

    const currentPage = Math.max(parseInt(page), 1);
    const pageLimit = Math.max(parseInt(limit), 1);
    const skip = (currentPage - 1) * pageLimit;

    const [categories, total] = await Promise.all([
      Category.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageLimit),
      Category.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: categories.length,
      total,
      page: currentPage,
      totalPages: Math.ceil(total / pageLimit),
      limit: pageLimit,
      categories,
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
      error: error.message,
    });
  }
};

// ✅ Get Single Category by ID or Slug
export const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    // Try by ID first, then by slug
    const category =
      (await Category.findById(id)) || (await Category.findOne({ slug: id }));

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    res.status(200).json({
      success: true,
      category,
    });
  } catch (error) {
    console.error("Error fetching category:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch category",
      error: error.message,
    });
  }
};

// ✅ Update Category
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, status } = req.body;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // ✅ Update fields
    if (name) category.name = name;
    if (description) category.description = description;
    if (status) category.status = status;

    // ✅ If a new image is uploaded, replace old one
    if (req.file) {
      category.images = [
        { url: req.file.path, alt: name || category.name }
      ];
    }

    await category.save();

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      category,
    });
  } catch (error) {
    console.error("Update Category Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update category",
      error: error.message,
    });
  }
};

// ✅ Delete Category
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findByIdAndDelete(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete category",
      error: error.message,
    });
  }
};


