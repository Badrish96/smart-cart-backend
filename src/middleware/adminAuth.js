const { errorResponse } = require('../utils/apiResponse');

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return errorResponse(res, 403, 'Access denied — admins only');
  }
  next();
};

module.exports = { adminOnly };
