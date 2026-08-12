const express = require('express');
const axios = require('axios');
const { randomUUID } = require('crypto');
const { rankDrivers } = require('../scoring');
const { publishRideRequested } = require('../events/publish');
const { ValidationError, NotFoundError, createLogger } = require('shared');

const logger = createLogger('matching-service');
const router = express.Router();

router.post('/request', async (req, res, next) => {
  try {
    const { riderId, longitude, latitude } = req.body;

    if (!riderId || longitude === undefined || latitude === undefined) {
      throw new ValidationError('riderId, longitude, and latitude are required');
    }

    const { data } = await axios.get(`${process.env.LOCATION_SERVICE_URL}/location/nearby`, {
      params: { longitude, latitude, radiusKm: 5 },
    });

    if (!data.drivers || data.drivers.length === 0) {
      throw new NotFoundError('No nearby drivers found');
    }

    const candidates = data.drivers.map(([driverId, distanceKm]) => ({
      driverId,
      distanceKm: parseFloat(distanceKm),
      rating: 4.5,
    }));

    const ranked = rankDrivers(candidates);
    const chosenDriver = ranked[0];

    const tripId = randomUUID();
    publishRideRequested({
      tripId,
      riderId,
      driverId: chosenDriver.driverId,
      pickup: { longitude, latitude },
      timestamp: Date.now(),
    });

    // record demand for surge pricing — fire-and-forget, shouldn't block the response
    axios.post(`${process.env.SURGE_SERVICE_URL}/pricing/surge/demand`).catch((err) => {
      logger.warn(`Failed to record surge demand: ${err.message}`);
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