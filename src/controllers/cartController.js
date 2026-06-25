const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { successResponse, errorResponse } = require('../utils/apiResponse');

const populateOpts = { path: 'items.product', select: 'name images price discount isActive stock' };

const calcTotals = (items) => {
  const subtotal = items.reduce((sum, item) => {
    const effective = item.price - (item.price * item.discount) / 100;
    return sum + effective * item.quantity;
  }, 0);
  return Math.round(subtotal * 100) / 100;
};

const getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id }).populate(populateOpts);
    if (!cart) return successResponse(res, 200, 'Cart is empty', { cart: { items: [], subtotal: 0 } });

    return successResponse(res, 200, 'Cart fetched successfully', {
      cart,
      subtotal: calcTotals(cart.items),
    });
  } catch (error) {
    return errorResponse(res, 500, 'Server error', error.message);
  }
};

const addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    const qty = Number(quantity);

    const product = await Product.findById(productId);
    if (!product || !product.isActive) return errorResponse(res, 404, 'Product not found');
    if (product.stock < qty) return errorResponse(res, 400, `Only ${product.stock} unit(s) available`);

    let cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      cart = new Cart({ user: req.user._id, items: [] });
    }

    const existingIndex = cart.items.findIndex(
      (i) => i.product.toString() === productId
    );

    if (existingIndex >= 0) {
      const newQty = cart.items[existingIndex].quantity + qty;
      if (newQty > product.stock) {
        return errorResponse(res, 400, `Only ${product.stock} unit(s) available in stock`);
      }
      cart.items[existingIndex].quantity = newQty;
      // Refresh price/discount in case they changed
      cart.items[existingIndex].price = product.price;
      cart.items[existingIndex].discount = product.discount;
    } else {
      cart.items.push({
        product: productId,
        quantity: qty,
        price: product.price,
        discount: product.discount,
      });
    }

    await cart.save();
    await cart.populate(populateOpts);

    return successResponse(res, 200, 'Item added to cart', {
      cart,
      subtotal: calcTotals(cart.items),
    });
  } catch (error) {
    return errorResponse(res, 500, 'Server error', error.message);
  }
};

const updateCartItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;
    const qty = Number(quantity);

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return errorResponse(res, 404, 'Cart not found');

    const item = cart.items.id(itemId);
    if (!item) return errorResponse(res, 404, 'Cart item not found');

    const product = await Product.findById(item.product);
    if (!product || !product.isActive) return errorResponse(res, 404, 'Product no longer available');
    if (qty > product.stock) return errorResponse(res, 400, `Only ${product.stock} unit(s) available`);

    item.quantity = qty;
    await cart.save();
    await cart.populate(populateOpts);

    return successResponse(res, 200, 'Cart updated', {
      cart,
      subtotal: calcTotals(cart.items),
    });
  } catch (error) {
    return errorResponse(res, 500, 'Server error', error.message);
  }
};

const removeFromCart = async (req, res) => {
  try {
    const { itemId } = req.params;

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return errorResponse(res, 404, 'Cart not found');

    const item = cart.items.id(itemId);
    if (!item) return errorResponse(res, 404, 'Cart item not found');

    item.deleteOne();
    await cart.save();
    await cart.populate(populateOpts);

    return successResponse(res, 200, 'Item removed from cart', {
      cart,
      subtotal: calcTotals(cart.items),
    });
  } catch (error) {
    return errorResponse(res, 500, 'Server error', error.message);
  }
};

const clearCart = async (req, res) => {
  try {
    await Cart.findOneAndDelete({ user: req.user._id });
    return successResponse(res, 200, 'Cart cleared');
  } catch (error) {
    return errorResponse(res, 500, 'Server error', error.message);
  }
};

module.exports = { getCart, addToCart, updateCartItem, removeFromCart, clearCart };
