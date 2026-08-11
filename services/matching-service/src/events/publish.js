const { createEventBus, createLogger } = require('shared');

const logger = createLogger('matching-service');
const eventBus = createEventBus();

function publishRideRequested(payload) {
  eventBus.publish('RideRequested', payload);
  logger.info(`Published RideRequested for trip ${payload.tripId}`);
}

module.exports = { publishRideRequested };