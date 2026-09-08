import { io } from 'socket.io-client';

let socket = null;
let unauthorizedHandler = null;
let currentToken = null;

export function getSocket() {
  return socket;
}

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

function joinRoom(token) {
  const s = socket;
  if (!s || !s.connected) return;
  try {
    s.emit('join-admin-room', { token });
  } catch (e) {
    console.error('socket join error', e);
  }
}

export function connectSocket(token) {
  if (currentToken === token && socket?.connected) {
    return socket;
  }

  if (socket) {
    try {
      socket.off('connect');
      socket.off('connect_error');
      if (socket.connected) socket.disconnect();
    } catch (e) {
      console.error('socket cleanup error', e);
    }
    socket = null;
  }

  currentToken = token;

  try {
    socket = io('https://api.bfc.net.ph', {
      auth: token ? { token } : {},
      transports: ['websocket', 'polling'],
      autoConnect: false,
      forceNew: true,
    });

    socket.once('connect', () => {
      joinRoom(token);
    });

    socket.once('connect_error', (err) => {
      console.error('socket connect_error', err?.message || err);
    });

    socket.connect();
  } catch (e) {
    console.error('socket init error', e);
  }

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    try {
      socket.off('connect');
      socket.off('connect_error');
      if (socket.connected) socket.disconnect();
    } catch (e) {
      console.error('socket disconnect error', e);
    }
    socket = null;
  }
  currentToken = null;
}
