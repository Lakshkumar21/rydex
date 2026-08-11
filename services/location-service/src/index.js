require('dotenv').config();
const express = require('express');
const http = require('http');
const { createLogger } = require('shared');

const locationRoutes = require('./routes/location');
const { initSocket } = require('./socket');

const logger = createLogger('location-service');
const app = express();
app.use(express.json());
app.use('/location', locationRoutes);

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  logger.warn(`${statusCode} - ${err.message}`);
  res.status(statusCode).json({ error: err.message });
});

const PORT = process.env.PORT || 4002;

// need an http.Server (not just Express app) so Socket.io can attach to it
const httpServer = http.createServer(app);
initSocket(httpServer);

httpServer.listen(PORT, () => {
  logger.info(`location-service listening on port ${PORT}`);
});