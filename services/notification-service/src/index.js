require('dotenv').config();
const express = require('express');
const { createLogger } = require('shared');
const { startConsumers } = require('./events/consume');

const logger = createLogger('notification-service');
const app = express();

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'notification-service' });
});

const PORT = process.env.PORT || 4007;

startConsumers();
logger.info('Event consumers started');

app.listen(PORT, () => {
  logger.info(`notification-service listening on port ${PORT}`);
});