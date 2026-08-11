const { Server } = require('socket.io');
const { createLogger } = require('shared');

const logger = createLogger('location-service');

let io;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: '*' }, // fine for dev; tighten in a real deployment
  });

  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);

    // rider app subscribes to a specific driver's updates
    socket.on('subscribe-driver', (driverId) => {
      socket.join(`driver:${driverId}`);
      logger.info(`Socket ${socket.id} subscribed to driver:${driverId}`);
    });

    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

// called whenever a driver's location updates, to push it to subscribed riders
function broadcastDriverLocation(driverId, longitude, latitude) {
  if (!io) return;
  io.to(`driver:${driverId}`).emit('driver-location-update', {
    driverId,
    longitude,
    latitude,
    timestamp: Date.now(),
  });
}

module.exports = { initSocket, broadcastDriverLocation };