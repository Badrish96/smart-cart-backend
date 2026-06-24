const express = require('express');
const { body } = require('express-validator');
const { register, login, forgotPassword, resetPassword, logout } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

router.post(
  '/register',
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['user', 'admin']).withMessage('Role must be user or admin'),
  validate,
  register
);

router.post(
  '/login',
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  validate,
  login
);

router.post(
  '/forgot-password',
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  validate,
  forgotPassword
);

router.post(
  '/reset-password/:token',
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  validate,
  resetPassword
);

router.post('/logout', logout);

module.exports = router;
