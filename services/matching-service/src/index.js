require('dotenv').config();
const express = require('express');
const { createLogger } = require('shared');

const ridesRoutes = require('./routes/rides');

const logger = createLogger('matching-service');
const app = express();
app.use(express.json());
app.use('/rides', ridesRoutes);

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  logger.warn(`${statusCode} - ${err.message}`);
  res.status(statusCode).json({ error: err.message });
});

const PORT = process.env.PORT || 4003;

app.listen(PORT, () => {
  logger.info(`matching-service listening on port ${PORT}`);
});