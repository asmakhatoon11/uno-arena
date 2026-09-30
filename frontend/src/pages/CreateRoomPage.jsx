import React, { useState } from 'react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { socketService } from '../services/socketService';
import { SOCKET_EVENTS } from '../shared/constants/socketEvents.js';
import { getPlayerId, getSessionToken, saveActiveSession } from '../services/playerSession';
import './RoomPages.css';

const AVATAR_OPTIONS = ['🦁', '🦊', '🐉', '⚡', '🚀', '👑', '🎯', '👾', '🐺', '🤖', '🐯', '🦅'];

/**
 * Create Room Page (Phase 2)
 * Creates a real multiplayer room on the server with a unique 6-character room code.
 * 
 * @param {{
 *   onNavigate: (page: string) => void,
 *   onRoomJoined: (roomState: Object, playerName: string) => void,
 *   isConnected: boolean
 * }} props
 */
export function CreateRoomPage({ onNavigate, onRoomJoined, isConnected }) {
  const [playerName, setPlayerName] = useState(() => {
    return localStorage.getItem('uno_player_name') || 'Champion';
  });
  const [selectedAvatar, setSelectedAvatar] = useState(() => {
    return localStorage.getItem('uno_player_avatar') || '🦁';
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleCreateRoom = (e) => {
    e?.preventDefault();
    setErrorMessage('');

    const trimmedName = playerName.trim();
    if (!trimmedName) {
      setErrorMessage('Please enter a display name.');
      return;
    }

    if (trimmedName.length > 20) {
      setErrorMessage('Display name must be 20 characters or fewer.');
      return;
    }

    if (!isConnected) {
      setErrorMessage('Server connection is offline. Please wait or check your connection.');
      return;
    }

    setIsLoading(true);

    // Save preferences
    localStorage.setItem('uno_player_name', trimmedName);
    localStorage.setItem('uno_player_avatar', selectedAvatar);

    const playerId = getPlayerId();
    const sessionToken = getSessionToken();

    // Safety timeout in case network stalls
    const timeoutTimer = setTimeout(() => {
      setIsLoading(false);
      setErrorMessage('Room creation timed out. Please check your connection and try again.');
    }, 8000);

    let handled = false;
    const handleSuccess = (roomData) => {
      if (handled) return;
      handled = true;
      clearTimeout(timeoutTimer);
      setIsLoading(false);

      const code = roomData?.roomCode || roomData?.code;
      if (code) {
        saveActiveSession({ roomCode: code, playerName: trimmedName, avatar: selectedAvatar });
      }

      onRoomJoined(roomData, trimmedName);
      onNavigate('lobby');
    };

    // Listen for broadcast event as redundant fallback
    const onRoomCreatedEvent = (state) => {
      if (state) {
        socketService.off(SOCKET_EVENTS.ROOM_CREATED, onRoomCreatedEvent);
        handleSuccess(state);
      }
    };
    // Read turn timer setting from localStorage (allowed: 15, 30, 45, 60 seconds, default 30)
    const storedTimer = parseInt(localStorage.getItem('uno_timer_setting') || '30', 10);
    const turnDuration = [15, 30, 45, 60].includes(storedTimer) ? storedTimer : 30;

    socketService.emit(
      SOCKET_EVENTS.CREATE_ROOM,
      { playerName: trimmedName, avatar: selectedAvatar, playerId, sessionToken, turnDuration },
      (response) => {
        socketService.off(SOCKET_EVENTS.ROOM_CREATED, onRoomCreatedEvent);
        if (response && response.success) {
          handleSuccess(response.room);
        } else {
          clearTimeout(timeoutTimer);
          setIsLoading(false);
          setErrorMessage(response?.error || 'Failed to create room. Please try again.');
        }
      }
    );
  };

  return (
    <div className="room-page-container">
      <div className="room-card-wrapper">
        <Card
          title="Create Match Arena"
          subtitle="Host a real-time multiplayer room and invite your friends"
          glowColor="primary"
        >
          <form className="room-form" onSubmit={handleCreateRoom}>
            {errorMessage && (
              <div className="form-error-alert" role="alert">
                <span>⚠️</span>
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="hostNameInput">
                Host Display Name
                <span className="form-hint">Max 20 chars</span>
              </label>
              <input
                id="hostNameInput"
                type="text"
                className="room-input"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="e.g. MasterStrategist"
                maxLength={20}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">Choose Your Battle Avatar</label>
              <div className="avatar-grid">
                {AVATAR_OPTIONS.map((avatar) => (
                  <button
                    key={avatar}
                    type="button"
                    className={`avatar-btn ${selectedAvatar === avatar ? 'selected' : ''}`}
                    onClick={() => setSelectedAvatar(avatar)}
                    aria-label={`Select avatar ${avatar}`}
                  >
                    {avatar}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-actions">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => onNavigate('landing')}
                disabled={isLoading}
              >
                Back
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={isLoading || !isConnected}
              >
                {isLoading ? 'Creating Room...' : 'CREATE ROOM'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
