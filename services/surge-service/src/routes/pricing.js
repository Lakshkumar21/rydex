const express = require('express');
const { getMultiplier, recordDemand } = require('../redisSurge');

const router = express.Router();

router.get('/surge', async (req, res, next) => {
  try {
    const multiplier = await getMultiplier();
    res.json({ multiplier });
  } catch (err) {
    next(err);
  }
});

// matching-service or trip-service calls this whenever a new ride is requested
router.post('/surge/demand', async (req, res, next) => {
  try {
    await recordDemand();
    res.json({ status: 'recorded' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;