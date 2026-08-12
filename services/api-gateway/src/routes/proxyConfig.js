// Maps gateway path prefixes -> target service + whether auth is required
module.exports = [
  { path: '/auth', target: process.env.AUTH_SERVICE_URL, prefix: '/auth/', protected: false },
  { path: '/location', target: process.env.LOCATION_SERVICE_URL, prefix: '/location/', protected: true },
  { path: '/rides', target: process.env.MATCHING_SERVICE_URL, prefix: '/rides/', protected: true },
  { path: '/trips', target: process.env.TRIP_SERVICE_URL, prefix: '/trips/', protected: true },
  { path: '/pricing', target: process.env.SURGE_SERVICE_URL, prefix: '/pricing/', protected: false },
  { path: '/payments', target: process.env.PAYMENT_SERVICE_URL, prefix: '/payments/', protected: true },
  { path: '/ratings', target: process.env.RATING_SERVICE_URL, prefix: '/ratings/', protected: true },
];