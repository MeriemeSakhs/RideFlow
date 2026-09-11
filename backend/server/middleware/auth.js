const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

// Verifies the JWT sent as "Authorization: Bearer <token>" and attaches its
// payload (id, email, username, role) to req.user for downstream handlers.
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).send({ message: 'Authentication required' });
  }

  const token = authHeader.slice('Bearer '.length);

  try {
    req.user = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
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
