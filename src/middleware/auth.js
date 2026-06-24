const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');
const { errorResponse } = require('../utils/apiResponse');

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse(res, 401, 'Unauthorized — no token provided');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token);
    req.user = await User.findById(decoded.id);
    if (!req.user) return errorResponse(res, 401, 'User no longer exists');
    next();
  } catch {
    return errorResponse(res, 401, 'Invalid or expired token');
  }
};

module.exports = { protect };
