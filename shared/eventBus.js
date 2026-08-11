// shared/src/eventBus.js
const Redis = require('ioredis');

function createEventBus(redisUrl = process.env.REDIS_URL || 'redis://localhost:6379') {
  const publisher = new Redis(redisUrl);
  const subscriber = new Redis(redisUrl);

  function publish(channel, data) {
    publisher.publish(channel, JSON.stringify(data));
  }

  function subscribe(channel, handler) {
    subscriber.subscribe(channel);
    subscriber.on('message', (ch, message) => {
      if (ch === channel) handler(JSON.parse(message));
    });
  }

  return { publish, subscribe };
}

module.exports = createEventBus;