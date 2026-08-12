require('dotenv').config();
const express = require('express');
const sequelize = require('./db');
const paymentRoutes = require('./routes/payments');
const { startConsumers } = require('./events/consume');
const { createLogger } = require('shared');

const logger = createLogger('payment-service');
const app = express();
app.use(express.json());
app.use('/payments', paymentRoutes);

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  logger.warn(`${statusCode} - ${err.message}`);
  res.status(statusCode).json({ error: err.message });
});

const PORT = process.env.PORT || 4006;

async function start() {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    logger.info('Connected to Postgres');

    startConsumers();
    logger.info('Event consumers started');

    app.listen(PORT, () => {
      logger.info(`payment-service listening on port ${PORT}`);
    });
  } catch (err) {
    logger.error(`Failed to start payment-service: ${err.message}`);
    process.exit(1);
  }
}

start();