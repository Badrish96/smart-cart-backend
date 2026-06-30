const express = require('express');
const { body } = require('express-validator');
const {
  placeOrder,
  retryPayment,
  verifyPayment,
  getMyOrders,
  getOrderById,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
} = require('../controllers/orderController');
const { protect } = require('../middleware/auth');
const { adminOnly } = require('../middleware/adminAuth');
const { validate } = require('../middleware/validate');

const router = express.Router();
router.use(protect);

const addressValidation = [
  body('shippingAddress.fullName').trim().notEmpty().withMessage('Full name is required'),
  body('shippingAddress.phone').trim().notEmpty().withMessage('Phone is required'),
  body('shippingAddress.street').trim().notEmpty().withMessage('Street is required'),
  body('shippingAddress.city').trim().notEmpty().withMessage('City is required'),
  body('shippingAddress.state').trim().notEmpty().withMessage('State is required'),
  body('shippingAddress.zipCode').trim().notEmpty().withMessage('Zip code is required'),
  body('shippingAddress.country').trim().notEmpty().withMessage('Country is required'),
];

// User routes
router.get('/', getMyOrders);
router.get('/:id', getOrderById);
router.post(
  '/',
  addressValidation,
  body('paymentMethod').optional().isIn(['COD', 'Razorpay']).withMessage('paymentMethod must be COD or Razorpay'),
  validate,
  placeOrder
);
router.post('/:id/retry-payment', retryPayment);
router.post(
  '/:id/verify-payment',
  body('razorpay_order_id').notEmpty().withMessage('razorpay_order_id is required'),
  body('razorpay_payment_id').notEmpty().withMessage('razorpay_payment_id is required'),
  body('razorpay_signature').notEmpty().withMessage('razorpay_signature is required'),
  validate,
  verifyPayment
);
router.post(
  '/:id/cancel',
  body('reason').optional().trim().notEmpty().withMessage('Reason cannot be blank'),
  validate,
  cancelOrder
);

// Admin routes
router.get('/admin/all', adminOnly, getAllOrders);
router.put(
  '/admin/:id/status',
  adminOnly,
  body('status').notEmpty().withMessage('Status is required'),
  validate,
  updateOrderStatus
);

module.exports = router;
