const jwt = require("jsonwebtoken");
const User = require("../Modals/User");

/**
 * Optional authentication middleware.
 * If a valid Bearer token is provided, attaches `req.user`.
 * If no token is provided or token is invalid, continues as guest without error.
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (token && process.env.ACCESS_SECRET) {
      const decoded = jwt.verify(token, process.env.ACCESS_SECRET);
      if (decoded && decoded.id) {
        const user = await User.findById(decoded.id).select("-password");
        if (user && user.status !== "blocked") {
          req.user = user;
        }
      }
    }
  } catch (err) {
    // Silently continue for optional auth
  }

  next();
};

module.exports = optionalAuth;
