/**
 * Socket.IO Client Service
 * Encapsulates Socket.IO connection and event dispatching.
 */

import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  /**
   * Initializes or returns existing socket connection
   * @returns {import('socket.io-client').Socket}
   */
  connect() {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    if (!this.socket) {
      this.socket = io(BACKEND_URL, {
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        transports: ['websocket', 'polling'],
      });
    } else {
      this.socket.connect();
    }

    return this.socket;
  }

  /**
   * Disconnects the socket
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  /**
   * Returns current socket instance
   */
  getSocket() {
    return this.socket;
  }

  /**
   * Emits an event with optional payload
   * @param {string} event 
   * @param {*} data 
   */
  emit(event, ...args) {
    if (this.socket) {
      this.socket.emit(event, ...args);
    }
  }

  /**
   * Registers an event listener
   * @param {string} event 
   * @param {Function} callback 
   */
  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  /**
   * Removes an event listener
   * @param {string} event 
   * @param {Function} callback 
   */
  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }
}

export const socketService = new SocketService();
