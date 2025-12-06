const { Server } = require('socket.io');
const logger = require('../utils/logger');

let io;

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      // origin: process.env.FRONTEND_URL || 'http://localhost:3001',
      origin: '*',
      credentials: true,
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    logger.info(`✅ Client connected: ${socket.id}`);

    // Khách hàng join vào room của ticket
    socket.on('join_ticket', (data) => {
      const { ticketId } = data;
      socket.join(`ticket_${ticketId}`);
      logger.info(`Client ${socket.id} joined ticket_${ticketId}`);
    });

    // // Khách hàng join vào room của line
    // socket.on('join_line', (data) => {
    //   const { lineId } = data;
    //   socket.join(`line_${lineId}`);
    //   logger.info(`Client ${socket.id} joined line_${lineId}`);
    // });

    socket.on('disconnect', () => {
      logger.info(`❌ Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

module.exports = {
  initializeSocket,
  getIO
};