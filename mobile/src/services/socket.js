import { io } from 'socket.io-client';
import { store } from '../store';
import { updateBalance } from '../store/slices/walletSlice';

// ─── SOCKET URL ──────────────────────────────────────────────────────────────
// Android emulator:   'http://10.0.2.2:3000'
// iOS simulator:      'http://localhost:3000'
// Physical device:    'http://<YOUR_LAN_IP>:3000'  (must match API_URL in api.js)
// ─────────────────────────────────────────────────────────────────────────────
const SOCKET_URL = 'http://10.0.2.2:3000';

let socket = null;

export const initSocket = (userId) => {
  if (socket) {
    socket.disconnect();
  }

  socket = io(SOCKET_URL, {
    transports: ['websocket'],
    autoConnect: true,
  });

  socket.on('connect', () => {
    console.log('Socket connected');
    socket.emit('join', userId);
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });

  socket.on('balance_updated', (data) => {
    store.dispatch(updateBalance(data.balance));
  });

  socket.on('payment_received', (data) => {
    // Handle payment notification
    console.log('Payment received:', data);
  });

  socket.on('account_approved', () => {
    // Handle account approval
    console.log('Account approved');
  });

  socket.on('account_suspended', (data) => {
    // Handle account suspension
    console.log('Account suspended:', data.reason);
  });

  socket.on('withdrawal_approved', (data) => {
    store.dispatch(updateBalance(data.newBalance));
    console.log('Withdrawal approved:', data);
  });

  socket.on('withdrawal_rejected', (data) => {
    console.log('Withdrawal rejected:', data.reason);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => socket;
