const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { sendOrderConfirmationEmail, sendOrderStatusEmail, sendOrderCancellationEmail } = require('../utils/email');
const { successResponse, errorResponse } = require('../utils/apiResponse');

const FREE_SHIPPING_THRESHOLD = 500;
const SHIPPING_CHARGE = 49;

// POST /api/orders  — place order (checkout)
const placeOrder = async (req, res) => {
  try {
    const { shippingAddress } = req.body;

    const cart = await Cart.findOne({ user: req.user._id }).populate(
      'items.product',
      'name images price discount stock isActive'
    );

    if (!cart || cart.items.length === 0) {
      return errorResponse(res, 400, 'Your cart is empty');
    }

    // Validate stock and build order items
    const orderItems = [];
    for (const item of cart.items) {
      const product = item.product;

      if (!product || !product.isActive) {
        return errorResponse(res, 400, `Product "${product?.name || item.product}" is no longer available`);
      }
      if (product.stock < item.quantity) {
        return errorResponse(res, 400, `Insufficient stock for "${product.name}". Available: ${product.stock}`);
      }

      const effectivePrice = product.price - (product.price * product.discount) / 100;

      orderItems.push({
        product: product._id,
        name: product.name,
        image: product.images?.[0]?.url || null,
        quantity: item.quantity,
        price: product.price,
        discount: product.discount,
        effectivePrice: Math.round(effectivePrice * 100) / 100,
      });
    }

    const subtotal = Math.round(
      orderItems.reduce((sum, i) => sum + i.effectivePrice * i.quantity, 0) * 100
    ) / 100;

    const shippingCharge = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_CHARGE;
    const totalAmount = Math.round((subtotal + shippingCharge) * 100) / 100;

    // Deduct stock atomically per product
    for (const item of orderItems) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } });
    }

    const order = await Order.create({
      user: req.user._id,
      items: orderItems,
      shippingAddress,
      paymentMethod: 'COD',
      subtotal,
      shippingCharge,
      totalAmount,
      statusHistory: [{ status: 'placed', note: 'Order placed successfully' }],
    });

    // Clear cart after successful order creation
    await Cart.findOneAndDelete({ user: req.user._id });

    // Send confirmation email (non-blocking — don't fail the order if email fails)
    sendOrderConfirmationEmail(req.user.email, req.user.name, order).catch(() => {});

    return successResponse(res, 201, 'Order placed successfully', { order });
  } catch (error) {
    return errorResponse(res, 500, 'Server error', error.message);
  }
};

// GET /api/orders  — current user's orders
const getMyOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const filter = { user: req.user._id };
    if (status) filter.orderStatus = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('items.product', 'name images'),
      Order.countDocuments(filter),
    ]);

    return successResponse(res, 200, 'Orders fetched successfully', {
      orders,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    return errorResponse(res, 500, 'Server error', error.message);
  }
};

// GET /api/orders/:id
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('items.product', 'name images');
    if (!order) return errorResponse(res, 404, 'Order not found');

    // Non-admin users can only view their own orders
    if (req.user.role !== 'admin' && order.user.toString() !== req.user._id.toString()) {
      return errorResponse(res, 403, 'Not authorized');
    }

    return successResponse(res, 200, 'Order fetched successfully', { order });
  } catch (error) {
    return errorResponse(res, 500, 'Server error', error.message);
  }
};

// POST /api/orders/:id/cancel  — user cancels their own order
const cancelOrder = async (req, res) => {
  try {
    const { reason } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return errorResponse(res, 404, 'Order not found');

    if (order.user.toString() !== req.user._id.toString()) {
      return errorResponse(res, 403, 'Not authorized');
    }

    const cancellable = ['placed', 'confirmed'];
    if (!cancellable.includes(order.orderStatus)) {
      return errorResponse(res, 400, `Order cannot be cancelled once it is "${order.orderStatus}"`);
    }

    // Restore stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
    }

    order.orderStatus = 'cancelled';
    order.cancelledAt = new Date();
    order.cancellationReason = reason || 'Cancelled by user';
    order.statusHistory.push({ status: 'cancelled', note: order.cancellationReason });
    await order.save();

    sendOrderCancellationEmail(req.user.email, req.user.name, order).catch((err) =>
      console.error('Cancellation email error:', err.message)
    );

    return successResponse(res, 200, 'Order cancelled successfully', { order });
  } catch (error) {
    return errorResponse(res, 500, 'Server error', error.message);
  }
};

// ── Admin only ──────────────────────────────────────────────────────────────

// GET /api/orders/admin/all
const getAllOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const filter = status ? { orderStatus: status } : {};
    const skip = (Number(page) - 1) * Number(limit);

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('user', 'name email')
        .populate('items.product', 'name images'),
      Order.countDocuments(filter),
    ]);

    return successResponse(res, 200, 'All orders fetched', {
      orders,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    return errorResponse(res, 500, 'Server error', error.message);
  }
};

// PUT /api/orders/admin/:id/status
const updateOrderStatus = async (req, res) => {
  try {
    const { status, note } = req.body;
    const validStatuses = ['confirmed', 'shipped', 'delivered', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return errorResponse(res, 400, `Status must be one of: ${validStatuses.join(', ')}`);
    }

    const order = await Order.findById(req.params.id).populate('user', 'name email');
    if (!order) return errorResponse(res, 404, 'Order not found');

    if (order.orderStatus === 'cancelled') {
      return errorResponse(res, 400, 'Cannot update a cancelled order');
    }

    if (status === 'cancelled') {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
      }
      order.cancelledAt = new Date();
      order.cancellationReason = note || 'Cancelled by admin';
    }

    if (status === 'delivered') {
      order.deliveredAt = new Date();
      order.paymentStatus = 'paid';
    }

    order.orderStatus = status;
    order.statusHistory.push({ status, note: note || '' });
    await order.save();

    if (status === 'cancelled') {
      sendOrderCancellationEmail(order.user.email, order.user.name, order).catch(() => {});
    } else {
      sendOrderStatusEmail(order.user.email, order.user.name, order).catch(() => {});
    }

    return successResponse(res, 200, 'Order status updated', { order });
  } catch (error) {
    return errorResponse(res, 500, 'Server error', error.message);
  }
};

module.exports = { placeOrder, getMyOrders, getOrderById, cancelOrder, getAllOrders, updateOrderStatus };
