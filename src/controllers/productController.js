const Product = require('../models/Product');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');
const { successResponse, errorResponse } = require('../utils/apiResponse');

const parseJSON = (value) => {
  if (!value) return undefined;
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return value; }
};

const addProduct = async (req, res) => {
  try {
    const { name, description, price, category, stock, brand, sku, discount, tags, keyFeatures, specifications, weight, dimensions } = req.body;

    if (!req.files || req.files.length === 0) {
      return errorResponse(res, 400, 'At least one product image is required');
    }

    const images = await Promise.all(
      req.files.map((file) => uploadToCloudinary(file.buffer, 'smart-cart/products'))
    );

    const product = await Product.create({
      name,
      description,
      price: Number(price),
      category,
      stock: Number(stock),
      brand,
      sku,
      discount: discount ? Number(discount) : 0,
      tags: parseJSON(tags),
      keyFeatures: parseJSON(keyFeatures),
      specifications: parseJSON(specifications),
      weight: parseJSON(weight),
      dimensions: parseJSON(dimensions),
      images,
      createdBy: req.user._id,
    });

    return successResponse(res, 201, 'Product added successfully', { product });
  } catch (error) {
    return errorResponse(res, 500, 'Server error', error.message);
  }
};

const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return errorResponse(res, 404, 'Product not found');

    const { name, description, price, category, stock, isActive, brand, sku, discount, tags, keyFeatures, specifications, weight, dimensions } = req.body;
    if (name !== undefined) product.name = name;
    if (description !== undefined) product.description = description;
    if (price !== undefined) product.price = Number(price);
    if (category !== undefined) product.category = category;
    if (stock !== undefined) product.stock = Number(stock);
    if (isActive !== undefined) product.isActive = isActive === 'true' || isActive === true;
    if (brand !== undefined) product.brand = brand;
    if (sku !== undefined) product.sku = sku;
    if (discount !== undefined) product.discount = Number(discount);
    if (tags !== undefined) product.tags = parseJSON(tags);
    if (keyFeatures !== undefined) product.keyFeatures = parseJSON(keyFeatures);
    if (specifications !== undefined) product.specifications = parseJSON(specifications);
    if (weight !== undefined) product.weight = parseJSON(weight);
    if (dimensions !== undefined) product.dimensions = parseJSON(dimensions);

    // If new images uploaded, delete old ones from Cloudinary and replace
    if (req.files && req.files.length > 0) {
      await Promise.all(product.images.map((img) => deleteFromCloudinary(img.publicId)));
      product.images = await Promise.all(
        req.files.map((file) => uploadToCloudinary(file.buffer, 'smart-cart/products'))
      );
    }

    await product.save();
    return successResponse(res, 200, 'Product updated successfully', { product });
  } catch (error) {
    return errorResponse(res, 500, 'Server error', error.message);
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return errorResponse(res, 404, 'Product not found');

    await product.deleteOne();

    return successResponse(res, 200, 'Product deleted successfully');
  } catch (error) {
    return errorResponse(res, 500, 'Server error', error.message);
  }
};

const getAllProducts = async (req, res) => {
  try {
    const { category, minPrice, maxPrice, search, page = 1, limit = 10 } = req.query;

    const filter = { isActive: true };
    if (category) filter.category = category;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    if (search) filter.name = { $regex: search, $options: 'i' };

    const skip = (Number(page) - 1) * Number(limit);
    const [products, total] = await Promise.all([
      Product.find(filter).skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
      Product.countDocuments(filter),
    ]);

    return successResponse(res, 200, 'Products fetched successfully', {
      products,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return errorResponse(res, 500, 'Server error', error.message);
  }
};

const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return errorResponse(res, 404, 'Product not found');
    return successResponse(res, 200, 'Product fetched successfully', { product });
  } catch (error) {
    return errorResponse(res, 500, 'Server error', error.message);
  }
};

module.exports = { addProduct, updateProduct, deleteProduct, getAllProducts, getProductById };
