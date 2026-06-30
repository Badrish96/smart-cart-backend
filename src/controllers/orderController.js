const crypto = require('crypto');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const razorpay = require('../utils/razorpay');
const { sendOrderConfirmationEmail, sendOrderStatusEmail, sendOrderCancellationEmail } = require('../utils/email');
const { successResponse, errorResponse } = require('../utils/apiResponse');

const FREE_SHIPPING_THRESHOLD = 500;
const SHIPPING_CHARGE = 49;

// POST /api/orders  — place order (checkout)
const placeOrder = async (req, res) => {
  try {
    const { shippingAddress, paymentMethod = 'COD' } = req.body;

    if (!['COD', 'Razorpay'].includes(paymentMethod)) {
      return errorResponse(res, 400, 'paymentMethod must be either COD or Razorpay');
    }

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
      paymentMethod,
      subtotal,
      shippingCharge,
      totalAmount,
      statusHistory: [{ status: 'placed', note: 'Order placed successfully' }],
    });

    // Razorpay orders stay unpaid until the frontend completes checkout and we verify the payment
    if (paymentMethod === 'Razorpay') {
      let razorpayOrder;
      try {
        razorpayOrder = await razorpay.orders.create({
          amount: Math.round(totalAmount * 100), // paise
          currency: 'INR',
          receipt: order._id.toString(),
        });
      } catch (rpError) {
        // Roll back: restore stock and remove the order since payment could not be initiated
        for (const item of orderItems) {
          await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
        }
        await Order.findByIdAndDelete(order._id);
        return errorResponse(res, 500, 'Failed to initiate payment', rpError.message);
      }

      order.razorpayOrderId = razorpayOrder.id;
      await order.save();

      // Cart is cleared only once payment is verified (see verifyPayment) for Razorpay orders
      return successResponse(res, 201, 'Razorpay order created — complete payment to confirm', {
        order,
        razorpay: {
          orderId: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          keyId: process.env.RAZORPAY_KEY_ID,
        },
      });
    }

    // COD — finalize immediately
    await Cart.findOneAndDelete({ user: req.user._id });

    sendOrderConfirmationEmail(req.user.email, req.user.name, order).catch((err) =>
      console.error('[Email] Order confirmation failed:', err.message)
    );

    return successResponse(res, 201, 'Order placed successfully', { order });
  } catch (error) {
    return errorResponse(res, 500, 'Server error', error.message);
  }
};

// POST /api/orders/:id/verify-payment  — confirm a Razorpay payment
// POST /api/orders/:id/retry-payment  — resume checkout for a pending Razorpay order
const retryPayment = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return errorResponse(res, 404, 'Order not found');

    if (order.user.toString() !== req.user._id.toString()) {
      return errorResponse(res, 403, 'Not authorized');
    }

    if (order.paymentMethod !== 'Razorpay') {
      return errorResponse(res, 400, 'This order does not use Razorpay payment');
    }

    if (order.paymentStatus === 'paid') {
      return errorResponse(res, 400, 'This order has already been paid');
    }

    if (order.orderStatus === 'cancelled') {
      return errorResponse(res, 400, 'This order has been cancelled');
    }

    return successResponse(res, 200, 'Resume payment for this order', {
      order,
      razorpay: {
        orderId: order.razorpayOrderId,
        amount: Math.round(order.totalAmount * 100),
        currency: 'INR',
        keyId: process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (error) {
    return errorResponse(res, 500, 'Server error', error.message);
  }
};

const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return errorResponse(res, 400, 'Missing Razorpay payment details');
    }

    const order = await Order.findById(req.params.id);
    if (!order) return errorResponse(res, 404, 'Order not found');

    if (order.user.toString() !== req.user._id.toString()) {
      return errorResponse(res, 403, 'Not authorized');
    }

    if (order.paymentMethod !== 'Razorpay' || order.razorpayOrderId !== razorpay_order_id) {
      return errorResponse(res, 400, 'Razorpay order mismatch');
    }

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      order.paymentStatus = 'failed';
      await order.save();
      return errorResponse(res, 400, 'Payment verification failed');
    }

    order.paymentStatus = 'paid';
    order.razorpayPaymentId = razorpay_payment_id;
    order.razorpaySignature = razorpay_signature;
    order.statusHistory.push({ status: 'placed', note: 'Payment verified successfully' });
    await order.save();

    await Cart.findOneAndDelete({ user: req.user._id });

    sendOrderConfirmationEmail(req.user.email, req.user.name, order).catch((err) =>
      console.error('[Email] Order confirmation failed:', err.message)
    );

    return successResponse(res, 200, 'Payment verified, order confirmed', { order });
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

module.exports = { placeOrder, retryPayment, verifyPayment, getMyOrders, getOrderById, cancelOrder, getAllOrders, updateOrderStatus };
