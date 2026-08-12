const { ValidationError } = require('shared');

const VALID_TRANSITIONS = {
  requested: ['assigned', 'cancelled'],
  assigned: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

function assertValidTransition(currentStatus, nextStatus) {
  const allowed = VALID_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(nextStatus)) {
    throw new ValidationError(
      `Cannot transition trip from '${currentStatus}' to '${nextStatus}'`
    );
  }
}

module.exports = { assertValidTransition };