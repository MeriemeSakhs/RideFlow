const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const userModel = require('../models/userModel');
dotenv.config();

// Verifies the JWT sent as "Authorization: Bearer <token>" and attaches its
// payload (id, email, username, role) to req.user for downstream handlers.
//
// Also re-checks isActive against the database on every request, not just
// at login: the JWT itself is valid for up to an hour, so without this a
// Manager deactivating a Dispatcher would have no effect until that token
// happened to expire. This is the smallest change that makes deactivation
// take effect immediately against an already-issued token.
const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).send({ message: 'Authentication required' });
  }

  const token = authHeader.slice('Bearer '.length);

  try {
    const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await userModel.findById(payload.id).select('isActive');
    if (!user || !user.isActive) {
      return res.status(401).send({ message: 'Your session is no longer valid' });
    }

    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).send({ message: 'Invalid or expired token' });
  }
};

// Must run after requireAuth. Restricts a route to the given user roles.
const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).send({ message: 'You do not have permission to perform this action' });
  }
  next();
};

module.exports = { requireAuth, requireRole };
