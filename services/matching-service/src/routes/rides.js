const express = require('express');
const axios = require('axios');
const { randomUUID } = require('crypto');
const { rankDrivers } = require('../scoring');
const { publishRideRequested } = require('../events/publish');
const { ValidationError, NotFoundError } = require('shared');

const router = express.Router();

router.post('/request', async (req, res, next) => {
  try {
    const { riderId, longitude, latitude } = req.body;

    if (!riderId || longitude === undefined || latitude === undefined) {
      throw new ValidationError('riderId, longitude, and latitude are required');
    }

    // 1. Ask location-service for nearby drivers
    const { data } = await axios.get(`${process.env.LOCATION_SERVICE_URL}/location/nearby`, {
      params: { longitude, latitude, radiusKm: 5 },
    });

    if (!data.drivers || data.drivers.length === 0) {
      throw new NotFoundError('No nearby drivers found');
    }

    // 2. Redis GEOSEARCH format: [driverId, distance, [lng, lat]]
    // map into { driverId, distanceKm, rating } — rating stubbed until rating-service exists
    const candidates = data.drivers.map(([driverId, distanceKm]) => ({
      driverId,
      distanceKm: parseFloat(distanceKm),
      rating: 4.5, // TODO: replace with real value once rating-service is built
    }));

    // 3. Rank and pick the best candidate
    const ranked = rankDrivers(candidates);
    const chosenDriver = ranked[0];

    // 4. Publish event for other services to react to later
    const tripId = randomUUID();
    publishRideRequested({
      tripId,
      riderId,
      driverId: chosenDriver.driverId,
      pickup: { longitude, latitude },
      timestamp: Date.now(),
    });

    res.json({
      tripId,
      chosenDriver,
      allCandidates: ranked,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;