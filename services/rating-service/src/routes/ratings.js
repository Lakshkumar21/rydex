const express = require('express');
const { submitRating, getUserRatingStats } = require('../controllers/ratingController');

const router = express.Router();

router.post('/', submitRating);
router.get('/user/:userId', getUserRatingStats);

module.exports = router;