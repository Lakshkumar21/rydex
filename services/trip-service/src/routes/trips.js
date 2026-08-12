const express = require('express');
const axios = require('axios');
const Trip = require('../models/trip');
const { assertValidTransition } = require('../stateMachine');
const { publishRideCompleted } = require('../events/publish');
const { NotFoundError, createLogger } = require('shared');

const logger = createLogger('trip-service');
const router = express.Router();

async function getTripOr404(id) {
  const trip = await Trip.findByPk(id);
  if (!trip) throw new NotFoundError('Trip not found');
  return trip;
}

router.get('/:id', async (req, res, next) => {
  try {
    const trip = await getTripOr404(req.params.id);
    res.json(trip);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/assign', async (req, res, next) => {
  try {
    const trip = await getTripOr404(req.params.id);
    assertValidTransition(trip.status, 'assigned');
    trip.status = 'assigned';
    await trip.save();
    res.json(trip);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/start', async (req, res, next) => {
  try {
    const trip = await getTripOr404(req.params.id);
    assertValidTransition(trip.status, 'in_progress');
    trip.status = 'in_progress';
    await trip.save();
    res.json(trip);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/complete', async (req, res, next) => {
  try {
    const trip = await getTripOr404(req.params.id);
    assertValidTransition(trip.status, 'completed');

    // fetch real surge multiplier, fall back to 1.0 if surge-service is unreachable
    let surgeMultiplier = 1.0;
    try {
      const { data } = await axios.get(`${process.env.SURGE_SERVICE_URL}/pricing/surge`);
      surgeMultiplier = data.multiplier;
    } catch (err) {
      logger.warn(`Could not fetch surge multiplier, defaulting to 1.0: ${err.message}`);
    }

    const { baseFare } = req.body;
    const BASE_FARE = baseFare || 100;

    trip.status = 'completed';
    trip.surge_multiplier = surgeMultiplier;
    trip.fare = BASE_FARE * surgeMultiplier;

    await trip.save();
    publishRideCompleted(trip);

    res.json(trip);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/cancel', async (req, res, next) => {
  try {
    const trip = await getTripOr404(req.params.id);
    assertValidTransition(trip.status, 'cancelled');
    trip.status = 'cancelled';
    await trip.save();
    res.json(trip);
  } catch (err) {
    next(err);
  }
});

module.exports = router;