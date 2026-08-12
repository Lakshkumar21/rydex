require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { createLogger, authMiddleware } = require('shared');

const proxyConfig = require('./routes/proxyConfig');

const logger = createLogger('api-gateway');
const app = express();

app.use(helmet());
app.use(cors());

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use(limiter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'api-gateway' });
});

// mount each service's proxy — apply authMiddleware only where required
proxyConfig.forEach(({ path, target, prefix, protected: requiresAuth }) => {
  const proxy = createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: { '^/': prefix },
  });

  if (requiresAuth) {
    app.use(path, authMiddleware, proxy);
  } else {
    app.use(path, proxy);
  }

  logger.info(`Mounted ${path} -> ${target} (auth: ${requiresAuth})`);
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  logger.info(`api-gateway listening on port ${PORT}`);
});