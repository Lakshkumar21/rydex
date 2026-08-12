const cron = require('node-cron');
const { createLogger } = require('shared');
const {
  getDemandCount,
  getAvailableDriverCount,
  setMultiplier,
} = require('./redisSurge');

const logger = createLogger('surge-service');

function computeMultiplier(demand, supply) {
  if (supply === 0) return demand > 0 ? 2.5 : 1.0; // no drivers at all = max surge if anyone's asking

  const ratio = demand / supply;

  if (ratio < 1.0) return 1.0;
  if (ratio <= 2.0) {
    // linear scale between 1.2x and 1.5x across ratio 1.0-2.0
    return 1.2 + (ratio - 1.0) * 0.3;
  }
  // cap at 2.5x for anything beyond ratio 2.0
  return Math.min(1.5 + (ratio - 2.0) * 0.2, 2.5);
}

async function recomputeSurge() {
  try {
    const demand = await getDemandCount();
    const supply = await getAvailableDriverCount();
    const multiplier = computeMultiplier(demand, supply);

    await setMultiplier(multiplier);
    logger.info(
      `Surge recomputed: demand=${demand} supply=${supply} multiplier=${multiplier.toFixed(2)}`
    );
  } catch (err) {
    logger.error(`Failed to recompute surge: ${err.message}`);
  }
}

function startSurgeJob() {
  // run once immediately on startup, then every 60 seconds
  recomputeSurge();
  cron.schedule('*/60 * * * * *', recomputeSurge);
}

module.exports = { startSurgeJob, computeMultiplier, recomputeSurge };