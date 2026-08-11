const express = require('express');
const { updateDriverLocation, findNearbyDrivers } = require('../redisGeo');
const { broadcastDriverLocation } = require('../socket');
const { ValidationError } = require('shared');

const router = express.Router();

// driver app calls this every few seconds
router.post('/update', async (req, res, next) => {
  try {
    const { driverId, longitude, latitude } = req.body;

    if (!driverId || longitude === undefined || latitude === undefined) {
      throw new ValidationError('driverId, longitude, and latitude are required');
    }

    await updateDriverLocation(driverId, longitude, latitude);
    broadcastDriverLocation(driverId, longitude, latitude);

    res.json({ status: 'updated' });
  } catch (err) {
    next(err);
  }
});

// matching-service (or a rider) calls this to find nearby drivers
router.get('/nearby', async (req, res, next) => {
  try {
    const { longitude, latitude, radiusKm } = req.query;

    if (!longitude || !latitude) {
      throw new ValidationError('longitude and latitude query params are required');
    }

    const drivers = await findNearbyDrivers(
      parseFloat(longitude),
      parseFloat(latitude),
      radiusKm ? parseFloat(radiusKm) : 5
    );

    res.json({ drivers });
  } catch (err) {
    next(err);
  }
});

module.exports = router;