const { createEventBus, createLogger } = require('shared');

const logger = createLogger('notification-service');
const eventBus = createEventBus();

function startConsumers() {
  eventBus.subscribe('RideRequested', (payload) => {
    logger.info(
      `[NOTIFY] Driver ${payload.driverId}: New ride request from rider ${payload.riderId} (trip ${payload.tripId})`
    );
    // TODO: wire real SMS/push here via Twilio once credentials are available
  });

  eventBus.subscribe('RideCompleted', (payload) => {
    logger.info(
      `[NOTIFY] Rider ${payload.riderId}: Your trip ${payload.tripId} is complete. Fare: ₹${payload.fare}`
    );
  });

  eventBus.subscribe('PaymentProcessed', (payload) => {
    logger.info(
      `[NOTIFY] Rider ${payload.riderId || ''}: Payment of ₹${payload.amount} succeeded for trip ${payload.tripId}`
    );
  });

  eventBus.subscribe('PaymentFailed', (payload) => {
    logger.warn(
      `[NOTIFY] Payment failed for trip ${payload.tripId}. Reason: ${payload.reason}`
    );
  });
}

module.exports = { startConsumers };