import { io } from 'socket.io-client';

let socket = null;

export function getSocket() {
  return socket;
}

export function connectSocket(token) {
  if (!socket) {
    socket = io('https://apigateway.webtour.ph', {
      auth: token ? { token } : {},
      transports: ['websocket', 'polling'],
      autoConnect: false,
    });
  }

  if (!socket.connected) {
    socket.connect();
    socket.on('connect', () => {
      socket.emit('join-admin-room', { token });
    });
  }

  return socket;
}

export function disconnectSocket() {
  if (socket?.connected) socket.disconnect();
  socket = null;
}
