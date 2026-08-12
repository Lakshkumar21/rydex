const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL);

const DEMAND_KEY = 'surge:demand_count';
const DRIVERS_GEO_KEY = 'drivers:locations'; // same key location-service writes to
const MULTIPLIER_KEY = 'surge:current_multiplier';
const DEMAND_TTL_SECONDS = 300; // a pending request "counts" for 5 minutes

async function recordDemand() {
  const count = await redis.incr(DEMAND_KEY);
  if (count === 1) {
    // only set expiry on first increment so it doesn't keep resetting
    await redis.expire(DEMAND_KEY, DEMAND_TTL_SECONDS);
  }
}

async function getDemandCount() {
  const count = await redis.get(DEMAND_KEY);
  return parseInt(count || '0', 10);
}

async function getAvailableDriverCount() {
  // ZCARD counts members in the geo sorted set = number of drivers currently tracked
  return redis.zcard(DRIVERS_GEO_KEY);
}

async function setMultiplier(multiplier) {
  await redis.set(MULTIPLIER_KEY, multiplier);
}

async function getMultiplier() {
  const value = await redis.get(MULTIPLIER_KEY);
  return value ? parseFloat(value) : 1.0;
}

module.exports = {
  recordDemand,
  getDemandCount,
  getAvailableDriverCount,
  setMultiplier,
  getMultiplier,
};