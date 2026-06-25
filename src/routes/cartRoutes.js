const express = require('express');
const { body, param } = require('express-validator');
const { getCart, addToCart, updateCartItem, removeFromCart, clearCart } = require('../controllers/cartController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();
router.use(protect);

router.get('/', getCart);

router.post(
  '/items',
  body('productId').notEmpty().withMessage('Product ID is required'),
  body('quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  validate,
  addToCart
);

router.put(
  '/items/:itemId',
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  validate,
  updateCartItem
);

router.delete('/items/:itemId', removeFromCart);
router.delete('/', clearCart);

module.exports = router;
