import { useState, useEffect } from 'react';
import { socketService } from '../services/socketService';

/**
 * Custom React Hook to manage Socket.IO lifecycle and connection state.
 * 
 * @returns {{
 *   socket: import('socket.io-client').Socket | null,
 *   isConnected: boolean,
 *   socketId: string | null
 * }}
 */
export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [socketId, setSocketId] = useState(null);

  useEffect(() => {
    const socket = socketService.connect();

    const onConnect = () => {
      setIsConnected(true);
      setSocketId(socket.id || null);
    };

    const onDisconnect = () => {
      setIsConnected(false);
      setSocketId(null);
    };

    const onConnectError = (err) => {
      setIsConnected(false);
      console.warn('[Socket] Connection error:', err.message);
    };

    // If already connected when hook mounts
    if (socket.connected) {
      onConnect();
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
    };
  }, []);

  return {
    socket: socketService.getSocket(),
    isConnected,
    socketId,
  };
}
