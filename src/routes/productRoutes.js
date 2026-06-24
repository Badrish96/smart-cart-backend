const express = require('express');
const { body } = require('express-validator');
const { addProduct, updateProduct, deleteProduct, getAllProducts, getProductsByCategory, getProductById } = require('../controllers/productController');
const { protect } = require('../middleware/auth');
const { adminOnly } = require('../middleware/adminAuth');
const { handleUpload } = require('../middleware/upload');
const { validate } = require('../middleware/validate');

const router = express.Router();

const productValidation = [
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('stock').isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
  body('brand').optional().trim().notEmpty().withMessage('Brand cannot be empty'),
  body('sku').optional().trim().notEmpty().withMessage('SKU cannot be empty'),
  body('discount').optional().isFloat({ min: 0, max: 100 }).withMessage('Discount must be between 0 and 100'),
];

const productUpdateValidation = [
  body('name').optional().trim().notEmpty().withMessage('Product name cannot be empty'),
  body('description').optional().trim().notEmpty().withMessage('Description cannot be empty'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('category').optional().trim().notEmpty().withMessage('Category cannot be empty'),
  body('stock').optional().isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  body('brand').optional().trim().notEmpty().withMessage('Brand cannot be empty'),
  body('sku').optional().trim().notEmpty().withMessage('SKU cannot be empty'),
  body('discount').optional().isFloat({ min: 0, max: 100 }).withMessage('Discount must be between 0 and 100'),
];

// Public routes
router.get('/', getAllProducts);
router.get('/category/:category', getProductsByCategory);
router.get('/:id', getProductById);

// Admin-only routes
router.post('/', protect, adminOnly, handleUpload('images'), productValidation, validate, addProduct);
router.put('/:id', protect, adminOnly, handleUpload('images'), productUpdateValidation, validate, updateProduct);
router.delete('/:id', protect, adminOnly, deleteProduct);

module.exports = router;
