const { createEventBus, createLogger } = require('shared');
const stripe = require('../stripeClient');
const Payment = require('../models/payment');
const { publishPaymentProcessed, publishPaymentFailed } = require('./publish');

const logger = createLogger('payment-service');
const eventBus = createEventBus();

function startConsumers() {
  eventBus.subscribe('RideCompleted', async (payload) => {
    const { tripId, riderId, fare } = payload;

    try {
      // amount must be in the smallest currency unit (paise for INR, cents for USD)
      const amountInSmallestUnit = Math.round(fare * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInSmallestUnit,
        currency: 'inr',
        payment_method: 'pm_card_visa', // Stripe's built-in test payment method
        confirm: true, // charge immediately rather than requiring a separate confirm step
        automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
      });

      const payment = await Payment.create({
        trip_id: tripId,
        rider_id: riderId,
        amount: fare,
        status: paymentIntent.status === 'succeeded' ? 'succeeded' : 'pending',
        stripe_payment_intent_id: paymentIntent.id,
      });

      if (paymentIntent.status === 'succeeded') {
        publishPaymentProcessed({ tripId, paymentId: payment.id, amount: fare });
        logger.info(`Payment succeeded for trip ${tripId}`);
      } else {
        publishPaymentFailed({ tripId, paymentId: payment.id, reason: paymentIntent.status });
        logger.warn(`Payment not immediately successful for trip ${tripId}: ${paymentIntent.status}`);
      }
    } catch (err) {
      // charge genuinely failed (e.g. declined test card)
      await Payment.create({
        trip_id: tripId,
        rider_id: riderId,
        amount: fare,
        status: 'failed',
        failure_reason: err.message,
      });

      publishPaymentFailed({ tripId, reason: err.message });
      logger.error(`Payment failed for trip ${tripId}: ${err.message}`);
    }
  });
}

module.exports = { startConsumers };