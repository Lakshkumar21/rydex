require('dotenv').config();
const express = require('express');
const sequelize = require('./db');
const authRoutes = require('./routes/auth');
const { createLogger } = require('shared');

const logger = createLogger('auth-service');
const app = express();

app.use(express.json());
app.use('/auth', authRoutes);

// central error handler — catches AppError subclasses thrown anywhere above
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  if (!err.isOperational) {
    logger.error(`Unexpected error: ${err.message}`);
  } else {
    logger.warn(`${statusCode} - ${err.message}`);
  }
  res.status(statusCode).json({ error: err.message });
});

const PORT = process.env.PORT || 4001;

async function start() {
  try {
    await sequelize.authenticate();
    await sequelize.sync(); // creates the users table if it doesn't exist
    logger.info('Connected to Postgres');

    app.listen(PORT, () => {
      logger.info(`auth-service listening on port ${PORT}`);
    });
  } catch (err) {
    logger.error(`Failed to start auth-service: ${err.message}`);
    process.exit(1);
  }
}

start();