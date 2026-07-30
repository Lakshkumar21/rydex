class AppError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
    }
}

class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(message, 404);
    }
}

class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized') {
        super(message, 401);
    }
}

class ValidationError extends AppError {
    constructor(message = 'Invalid input') {
        super(message, 400);
    }
}

module.exports = { AppError, NotFoundError, UnauthorizedError, ValidationError };