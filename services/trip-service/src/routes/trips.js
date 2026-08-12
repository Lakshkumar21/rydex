const express = require('express');
const Trip = require('../models/trip');
const { assertValidTransition } = require('../stateMachine');
const { publishRideCompleted } = require('../events/publish');
const { NotFoundError } = require('shared');

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

    const { fare } = req.body;
    trip.status = 'completed';
    trip.fare = fare || 100 * trip.surge_multiplier; // placeholder fare calc until surge-service is wired in

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