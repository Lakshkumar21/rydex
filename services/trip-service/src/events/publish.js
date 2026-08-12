const { createEventBus, createLogger } = require('shared');

const logger = createLogger('trip-service');
const eventBus = createEventBus();

function publishRideCompleted(trip) {
  eventBus.publish('RideCompleted', {
    tripId: trip.id,
    riderId: trip.rider_id,
    driverId: trip.driver_id,
    fare: trip.fare,
    timestamp: Date.now(),
  });
  logger.info(`Published RideCompleted for trip ${trip.id}`);
}

module.exports = { publishRideCompleted };