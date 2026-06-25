const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');
const { successResponse, errorResponse } = require('../utils/apiResponse');

const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return errorResponse(res, 404, 'Product not found');
    }

    let wishlist = await Wishlist.findOne({ user: req.user._id });

    if (!wishlist) {
      wishlist = await Wishlist.create({ user: req.user._id, products: [productId] });
    } else if (wishlist.products.includes(productId)) {
      return errorResponse(res, 409, 'Product already in wishlist');
    } else {
      wishlist.products.push(productId);
      await wishlist.save();
    }

    await wishlist.populate('products', 'name price images discount');
    return successResponse(res, 200, 'Product added to wishlist', { wishlist });
  } catch (error) {
    return errorResponse(res, 500, 'Server error', error.message);
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    const wishlist = await Wishlist.findOne({ user: req.user._id });
    if (!wishlist) return errorResponse(res, 404, 'Wishlist not found');

    const index = wishlist.products.indexOf(productId);
    if (index === -1) return errorResponse(res, 404, 'Product not in wishlist');

    wishlist.products.splice(index, 1);
    await wishlist.save();
    await wishlist.populate('products', 'name price images discount');

    return successResponse(res, 200, 'Product removed from wishlist', { wishlist });
  } catch (error) {
    return errorResponse(res, 500, 'Server error', error.message);
  }
};

const getWishlist = async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user._id }).populate(
      'products',
      'name price images discount isActive'
    );

    if (!wishlist) return successResponse(res, 200, 'Wishlist is empty', { wishlist: { products: [] } });

    return successResponse(res, 200, 'Wishlist fetched successfully', { wishlist });
  } catch (error) {
    return errorResponse(res, 500, 'Server error', error.message);
  }
};

module.exports = { addToWishlist, removeFromWishlist, getWishlist };
