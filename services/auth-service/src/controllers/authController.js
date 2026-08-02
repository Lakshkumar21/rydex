const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { ValidationError, UnauthorizedError } = require('shared');

const SALT_ROUNDS = 10;

async function signup(req, res, next) {
    try {
        const { email, password, role } = req.body;

        if (!email || !password) {
            throw new ValidationError('Email and password are required');
        }

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            throw new ValidationError('An account with this email already exists');
        }

        const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

        const user = await User.create({
            email,
            password_hash,
            role: role === 'driver' ? 'driver' : 'rider',
        });

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.status(201).json({
            token,
            user: { id: user.id, email: user.email, role: user.role },
        });
    } catch (err) {
        next(err);
    }
}

async function login(req, res, next) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            throw new ValidationError('Email and password are required');
        }

        const user = await User.findOne({ where: { email } });
        if (!user) {
            throw new UnauthorizedError('Invalid email or password');
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            throw new UnauthorizedError('Invalid email or password');
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.json({
            token,
            user: { id: user.id, email: user.email, role: user.role },
        });
    } catch (err) {
        next(err);
    }
}

module.exports = { signup, login };