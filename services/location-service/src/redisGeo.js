const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL);

const DRIVERS_KEY = 'drivers:locations';

// store/update a driver's current location
async function updateDriverLocation(driverId, longitude, latitude) {
  await redis.geoadd(DRIVERS_KEY, longitude, latitude, driverId);
}

// find drivers within radiusKm of a given point
async function findNearbyDrivers(longitude, latitude, radiusKm = 5) {
  // returns array of driver IDs with distance, sorted nearest first
  const results = await redis.geosearch(
    DRIVERS_KEY,
    'FROMLONLAT', longitude, latitude,
    'BYRADIUS', radiusKm, 'km',
    'ASC',
    'WITHCOORD',
    'WITHDIST'
  );
  return results;
}

module.exports = { redis, updateDriverLocation, findNearbyDrivers };