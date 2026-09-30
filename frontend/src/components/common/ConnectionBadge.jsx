import React from 'react';
import './ConnectionBadge.css';

/**
 * Connection indicator showing 🟢 Connected or 🔴 Disconnected
 * 
 * @param {{ isConnected: boolean, socketId?: string }} props
 */
export function ConnectionBadge({ isConnected, socketId }) {
  return (
    <div className={`connection-badge ${isConnected ? 'connected' : 'disconnected'}`}>
      <span className="status-indicator">
        {isConnected ? '🟢' : '🔴'}
      </span>
      <span className="status-text">
        {isConnected ? 'Connected' : 'Disconnected'}
      </span>
      {isConnected && socketId && (
        <span className="socket-id-tag" title={`Socket ID: ${socketId}`}>
          {socketId.slice(0, 5)}...
        </span>
      )}
    </div>
  );
}
