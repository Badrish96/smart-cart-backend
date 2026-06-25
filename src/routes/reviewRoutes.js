const express = require('express');
const { body } = require('express-validator');
const { addReview, getProductReviews, deleteReview } = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router({ mergeParams: true });

const reviewValidation = [
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be an integer between 1 and 5'),
  body('comment').optional().trim().notEmpty().withMessage('Comment cannot be blank'),
];

router.get('/', getProductReviews);
router.post('/', protect, reviewValidation, validate, addReview);
router.delete('/:reviewId', protect, deleteReview);

module.exports = router;
