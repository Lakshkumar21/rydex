const { createEventBus, createLogger } = require('shared');
const Trip = require('../models/trip');

const logger = createLogger('trip-service');
const eventBus = createEventBus();

function startConsumers() {
  eventBus.subscribe('RideRequested', async (payload) => {
    try {
      const { tripId, riderId, driverId, pickup } = payload;

      await Trip.create({
        id: tripId,
        rider_id: riderId,
        driver_id: driverId,
        pickup_longitude: pickup.longitude,
        pickup_latitude: pickup.latitude,
        status: 'requested',
      });

      logger.info(`Trip ${tripId} created from RideRequested event`);
    } catch (err) {
      logger.error(`Failed to create trip from RideRequested: ${err.message}`);
    }
  });
}

module.exports = { startConsumers };