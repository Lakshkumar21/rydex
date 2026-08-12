const { createEventBus, createLogger } = require('shared');

const logger = createLogger('payment-service');
const eventBus = createEventBus();

function publishPaymentProcessed(payload) {
  eventBus.publish('PaymentProcessed', payload);
  logger.info(`Published PaymentProcessed for trip ${payload.tripId}`);
}

function publishPaymentFailed(payload) {
  eventBus.publish('PaymentFailed', payload);
  logger.info(`Published PaymentFailed for trip ${payload.tripId}`);
}

module.exports = { publishPaymentProcessed, publishPaymentFailed };