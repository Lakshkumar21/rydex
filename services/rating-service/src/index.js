require('dotenv').config();
const express = require('express');
const sequelize = require('./db');
const ratingRoutes = require('./routes/ratings');
const { createLogger } = require('shared');

const logger = createLogger('rating-service');
const app = express();
app.use(express.json());
app.use('/ratings', ratingRoutes);

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  logger.warn(`${statusCode} - ${err.message}`);
  res.status(statusCode).json({ error: err.message });
});

const PORT = process.env.PORT || 4008;

async function start() {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    logger.info('Connected to Postgres');

    app.listen(PORT, () => {
      logger.info(`rating-service listening on port ${PORT}`);
    });
  } catch (err) {
    logger.error(`Failed to start rating-service: ${err.message}`);
    process.exit(1);
  }
}

start();