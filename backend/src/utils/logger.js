/**
 * Basic logger utility for UNO Arena
 */

export const logger = {
  info: (msg, ...args) => {
    console.log(`[INFO] ${new Date().toISOString().split('T')[1].slice(0, 8)} - ${msg}`, ...args);
  },
  warn: (msg, ...args) => {
    console.warn(`[WARN] ${new Date().toISOString().split('T')[1].slice(0, 8)} - ${msg}`, ...args);
  },
  error: (msg, ...args) => {
    console.error(`[ERROR] ${new Date().toISOString().split('T')[1].slice(0, 8)} - ${msg}`, ...args);
  },
  socket: (msg, ...args) => {
    console.log(`[SOCKET] ${new Date().toISOString().split('T')[1].slice(0, 8)} - ${msg}`, ...args);
  },
  room: (msg, ...args) => {
    console.log(`[ROOM] ${new Date().toISOString().split('T')[1].slice(0, 8)} - ${msg}`, ...args);
  },
  game: (msg, ...args) => {
    console.log(`[GAME] ${new Date().toISOString().split('T')[1].slice(0, 8)} - ${msg}`, ...args);
  },
};
