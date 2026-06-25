const Product = require('../models/Product');
const { successResponse, errorResponse } = require('../utils/apiResponse');

const addReview = async (req, res) => {
  try {
    const { productId } = req.params;
    const { rating, comment } = req.body;

    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return errorResponse(res, 404, 'Product not found');
    }

    const alreadyReviewed = product.reviews.some(
      (r) => r.user.toString() === req.user._id.toString()
    );
    if (alreadyReviewed) {
      return errorResponse(res, 409, 'You have already reviewed this product');
    }

    product.reviews.push({ user: req.user._id, rating, comment });

    const total = product.reviews.reduce((sum, r) => sum + r.rating, 0);
    product.averageRating = Math.round((total / product.reviews.length) * 10) / 10;

    await product.save();

    await product.populate('reviews.user', 'name profilePicture');
    const newReview = product.reviews[product.reviews.length - 1];

    return successResponse(res, 201, 'Review added successfully', {
      averageRating: product.averageRating,
      totalReviews: product.reviews.length,
      review: newReview,
    });
  } catch (error) {
    return errorResponse(res, 500, 'Server error', error.message);
  }
};

const getProductReviews = async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId)
      .select('reviews averageRating name')
      .populate('reviews.user', 'name profilePicture');

    if (!product) return errorResponse(res, 404, 'Product not found');

    return successResponse(res, 200, 'Reviews fetched successfully', {
      productId: product._id,
      productName: product.name,
      averageRating: product.averageRating,
      totalReviews: product.reviews.length,
      reviews: product.reviews,
    });
  } catch (error) {
    return errorResponse(res, 500, 'Server error', error.message);
  }
};

const deleteReview = async (req, res) => {
  try {
    const { productId, reviewId } = req.params;

    const product = await Product.findById(productId);
    if (!product) return errorResponse(res, 404, 'Product not found');

    const review = product.reviews.id(reviewId);
    if (!review) return errorResponse(res, 404, 'Review not found');

    const isOwner = review.user.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return errorResponse(res, 403, 'Not authorized to delete this review');
    }

    review.deleteOne();

    const total = product.reviews.reduce((sum, r) => sum + r.rating, 0);
    product.averageRating = product.reviews.length
      ? Math.round((total / product.reviews.length) * 10) / 10
      : 0;

    await product.save();

    return successResponse(res, 200, 'Review deleted successfully', {
      averageRating: product.averageRating,
      totalReviews: product.reviews.length,
    });
  } catch (error) {
    return errorResponse(res, 500, 'Server error', error.message);
  }
};

module.exports = { addReview, getProductReviews, deleteReview };
