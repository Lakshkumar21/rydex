require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createLogger } = require('shared');

const authProxy = require('./routes/authProxy');

const logger = createLogger('api-gateway');
const app = express();

app.use(helmet());
app.use(cors());

// basic rate limiting to protect all downstream services
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per window
});
app.use(limiter);

// route: anything hitting /auth/* gets forwarded to auth-service
app.use('/auth', authProxy);

// health check for the gateway itself
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'api-gateway' });
});

// fallback for unmatched routes
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  logger.info(`api-gateway listening on port ${PORT}`);
});