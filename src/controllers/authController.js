const crypto = require('crypto');
const User = require('../models/User');
const { generateToken } = require('../utils/jwt');
const { sendPasswordResetEmail } = require('../utils/email');
const { successResponse, errorResponse } = require('../utils/apiResponse');

const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return errorResponse(res, 409, 'Email already registered');
    }

    const user = await User.create({ name, email, password, role });
    const token = generateToken(user._id);

    return successResponse(res, 201, 'Registration successful', {
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    return errorResponse(res, 500, 'Server error', error.message);
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return errorResponse(res, 404, 'No account found with this email');
    }
    if (!(await user.comparePassword(password))) {
      return errorResponse(res, 401, 'Incorrect password');
    }

    const token = generateToken(user._id);

    return successResponse(res, 200, 'Login successful', {
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    return errorResponse(res, 500, 'Server error', error.message);
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    // Always return 200 to prevent email enumeration
    if (!user) {
      return successResponse(res, 200, 'If that email exists, a reset link has been sent');
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save({ validateBeforeSave: false });

    try {
      await sendPasswordResetEmail(user.email, resetToken);
    } catch {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });
      return errorResponse(res, 500, 'Failed to send reset email. Please try again.');
    }

    return successResponse(res, 200, 'If that email exists, a reset link has been sent');
  } catch (error) {
    return errorResponse(res, 500, 'Server error', error.message);
  }
};

const resetPassword = async (req, res) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    }).select('+password');

    if (!user) {
      return errorResponse(res, 400, 'Reset token is invalid or has expired');
    }

    const isSamePassword = await user.comparePassword(req.body.password);
    if (isSamePassword) {
      return errorResponse(res, 400, 'New password must be different from your current password');
    }

    user.password = req.body.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    const token = generateToken(user._id);

    return successResponse(res, 200, 'Password reset successful', {
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    return errorResponse(res, 500, 'Server error', error.message);
  }
};

const logout = (req, res) => {
  return successResponse(res, 200, 'Logged out successfully');
};

module.exports = { register, login, forgotPassword, resetPassword, logout };
