const jwt = require('jsonwebtoken');

// Optional auth middleware - extracts user from token if present, doesn't fail if missing
const optionalAuth = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = { _id: decoded.id };
        }
    } catch (error) {
        // Silently continue without user
    }
    next();
};

module.exports = { optionalAuth };
