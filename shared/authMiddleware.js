const jwt = require('jsonwebtoken');
const { UnauthorizedError } = require('./error');

function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new UnauthorizedError('Missing or malformed token'));
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // e.g. { id, role, email }
        next();
    } catch (err) {
        next(new UnauthorizedError('Invalid or expired token'));
    }
}

module.exports = authMiddleware;