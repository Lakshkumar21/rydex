const express = require('express');
const Payment = require('../models/payment');
const { NotFoundError } = require('shared');

const router = express.Router();

router.get('/:tripId', async (req, res, next) => {
  try {
    const payment = await Payment.findOne({ where: { trip_id: req.params.tripId } });
    if (!payment) throw new NotFoundError('Payment not found for this trip');
    res.json(payment);
  } catch (err) {
    next(err);
  }
});

module.exports = router;