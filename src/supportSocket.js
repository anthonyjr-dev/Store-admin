import { io } from 'socket.io-client';

const BASE_URL = 'https://api.bfc.net.ph';
export const SUPPORT_API_BASE = BASE_URL;

let socket = null;

/** Agent connection to the live-support namespace (authenticated). */
export function getSupportSocket(token, name) {
  if (socket?.active) return socket;
  socket = io(`${BASE_URL}/support`, {
    auth: { token, name: name || 'Support Agent' },
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 10,
    reconnectionDelay: 1500,
  });
  return socket;
}

export function closeSupportSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
