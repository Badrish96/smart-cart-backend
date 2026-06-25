const express = require('express');
const { body } = require('express-validator');
const {
  getProfile,
  updateProfile,
  addAddress,
  updateAddress,
  deleteAddress,
} = require('../controllers/profileController');
const { protect } = require('../middleware/auth');
const { handleUpload } = require('../middleware/upload');
const { validate } = require('../middleware/validate');

const router = express.Router();

router.use(protect);

const addressValidation = [
  body('street').trim().notEmpty().withMessage('Street is required'),
  body('city').trim().notEmpty().withMessage('City is required'),
  body('state').trim().notEmpty().withMessage('State is required'),
  body('zipCode').trim().notEmpty().withMessage('Zip code is required'),
  body('country').optional().trim().notEmpty().withMessage('Country cannot be blank'),
];

router.get('/', getProfile);
router.put('/', handleUpload('profilePicture', 1), updateProfile);

router.post('/addresses', addressValidation, validate, addAddress);
router.put('/addresses/:addressId', addressValidation.map((v) => v.optional()), validate, updateAddress);
router.delete('/addresses/:addressId', deleteAddress);

module.exports = router;
