import { Server } from 'socket.io';
import { config } from '../config/env.js';
import { logger } from '../config/logger.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { findUserById } from '../domains/users/users.repository.js';

let io = null;

export function initSockets(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(',').map((s) => s.trim()),
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.query?.token ||
        (socket.handshake.headers?.authorization?.startsWith('Bearer ')
          ? socket.handshake.headers.authorization.slice(7)
          : null);
      if (!token) return next(new Error('NO_AUTH'));

      let payload;
      try {
        payload = verifyAccessToken(token);
      } catch {
        return next(new Error('INVALID_TOKEN'));
      }

      const user = await findUserById(payload.sub);
      if (!user) return next(new Error('USER_NOT_FOUND'));
      if (!user.household_id) return next(new Error('NO_HOUSEHOLD'));

      socket.data.user = {
        id: user.id,
        household_id: user.household_id,
        email: user.email,
        name: user.name,
      };
      next();
    } catch (err) {
      logger.error({ err }, 'socket.io handshake fallido');
      next(new Error('HANDSHAKE_ERROR'));
    }
  });

  io.on('connection', (socket) => {
    const { id: userId, household_id: householdId } = socket.data.user;
    const room = `household:${householdId}`;
    socket.join(room);
    logger.info({ socket_id: socket.id, user_id: userId, household_id: householdId }, 'socket conectado');

    // Eventos de presencia
    socket.to(room).emit('presence:user-online', { user_id: userId });

    socket.on('typing:start', () => {
      socket.to(room).emit('typing:start', { user_id: userId });
    });
    socket.on('typing:stop', () => {
      socket.to(room).emit('typing:stop', { user_id: userId });
    });

    socket.on('disconnect', (reason) => {
      socket.to(room).emit('presence:user-offline', { user_id: userId });
      logger.debug({ socket_id: socket.id, reason }, 'socket desconectado');
    });
  });

  return io;
}

export function getIO() {
  return io;
}

/**
 * Emite a la room household:<id>. Si el server aún no se ha inicializado
 * (por ejemplo en tests/scripts), no hace nada.
 */
export function emitToHousehold(householdId, event, payload) {
  if (!io) return;
  io.to(`household:${householdId}`).emit(event, payload);
}

export function emitToUser(userId, event, payload) {
  if (!io) return;
  // Buscamos sockets cuyo data.user.id coincida
  for (const [, socket] of io.sockets.sockets) {
    if (socket.data?.user?.id === userId) socket.emit(event, payload);
  }
}
