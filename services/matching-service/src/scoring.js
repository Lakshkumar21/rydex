const WEIGHT_DISTANCE = 0.7;
const WEIGHT_RATING = 0.3;
const DEFAULT_SEARCH_RADIUS_KM = 5;

// distance: km from rider. rating: 0-5 stars.
function scoreDriver(distanceKm, rating, maxRadiusKm = DEFAULT_SEARCH_RADIUS_KM) {
  const distanceScore = Math.max(0, 1 - distanceKm / maxRadiusKm); // closer = higher score
  const ratingScore = rating / 5;

  return WEIGHT_DISTANCE * distanceScore + WEIGHT_RATING * ratingScore;
}

// candidates: array of { driverId, distanceKm, rating }
function rankDrivers(candidates, maxRadiusKm = DEFAULT_SEARCH_RADIUS_KM) {
  return candidates
    .map((c) => ({
      ...c,
      score: scoreDriver(c.distanceKm, c.rating, maxRadiusKm),
    }))
    .sort((a, b) => b.score - a.score); // highest score first
}

module.exports = { scoreDriver, rankDrivers };