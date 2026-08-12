const { Op, fn, col } = require('sequelize');
const Rating = require('../models/rating');
const { ValidationError } = require('shared');

async function submitRating(req, res, next) {
  try {
    const { tripId, raterId, targetId, stars, comment } = req.body;

    if (!tripId || !raterId || !targetId || !stars) {
      throw new ValidationError('tripId, raterId, targetId, and stars are required');
    }
    if (stars < 1 || stars > 5) {
      throw new ValidationError('stars must be between 1 and 5');
    }

    const rating = await Rating.create({
      trip_id: tripId,
      rater_id: raterId,
      target_id: targetId,
      stars,
      comment,
    });

    res.status(201).json(rating);
  } catch (err) {
    next(err);
  }
}

async function getUserRatingStats(req, res, next) {
  try {
    const { userId } = req.params;

    const ratings = await Rating.findAll({ where: { target_id: userId } });

    if (ratings.length === 0) {
      return res.json({ userId, averageStars: null, totalRatings: 0 });
    }

    const result = await Rating.findOne({
      where: { target_id: userId },
      attributes: [[fn('AVG', col('stars')), 'averageStars'], [fn('COUNT', col('id')), 'totalRatings']],
      raw: true,
    });

    res.json({
      userId,
      averageStars: parseFloat(result.averageStars).toFixed(2),
      totalRatings: parseInt(result.totalRatings, 10),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { submitRating, getUserRatingStats };