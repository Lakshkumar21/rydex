const { createProxyMiddleware } = require('http-proxy-middleware');

const authProxy = createProxyMiddleware({
  target: process.env.AUTH_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/': '/auth/',
  },
});

module.exports = authProxy;