require('dotenv').config();
const express = require('express');
const { createLogger } = require('shared');

const pricingRoutes = require('./routes/pricing');
const { startSurgeJob } = require('./surgeJob');

const logger = createLogger('surge-service');
const app = express();
app.use(express.json());
app.use('/pricing', pricingRoutes);

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  logger.warn(`${statusCode} - ${err.message}`);
  res.status(statusCode).json({ error: err.message });
});

const PORT = process.env.PORT || 4005;

startSurgeJob();

app.listen(PORT, () => {
  logger.info(`surge-service listening on port ${PORT}`);
});