import React, { useState, useEffect } from 'react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { socketService } from '../services/socketService';
import { SOCKET_EVENTS } from '../shared/constants/socketEvents.js';
import { getPlayerId, getSessionToken, saveActiveSession } from '../services/playerSession';
import { formatRoomCode } from '../utils/helpers';
import './RoomPages.css';

const AVATAR_OPTIONS = ['🦊', '🦁', '🐉', '⚡', '🚀', '👑', '🎯', '👾', '🐺', '🤖', '🐯', '🦅'];

/**
 * Join Room Page (Phase 2)
 * Connects player to an existing room via 6-character room code.
 * 
 * @param {{
 *   onNavigate: (page: string) => void,
 *   onRoomJoined: (roomState: Object, playerName: string) => void,
 *   isConnected: boolean
 * }} props
 */
export function JoinRoomPage({ onNavigate, onRoomJoined, isConnected }) {
  const [playerName, setPlayerName] = useState(() => {
    return localStorage.getItem('uno_player_name') || 'Challenger';
  });
  const [roomCode, setRoomCode] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const codeParam = params.get('code');
      return codeParam ? formatRoomCode(codeParam) : '';
    }
    return '';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const codeParam = params.get('code');
      if (codeParam) {
        setRoomCode(formatRoomCode(codeParam));
      }
    }
  }, []);
  const [selectedAvatar, setSelectedAvatar] = useState(() => {
    return localStorage.getItem('uno_player_avatar') || '🦊';
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleJoinRoom = (e) => {
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

    const cleanedCode = formatRoomCode(roomCode);
    if (!cleanedCode || cleanedCode.length !== 6) {
      setErrorMessage('Please enter a valid 6-character room code.');
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
      setErrorMessage('Joining room timed out. Please check the code and try again.');
    }, 8000);

    let handled = false;
    const handleSuccess = (roomData) => {
      if (handled) return;
      handled = true;
      clearTimeout(timeoutTimer);
      setIsLoading(false);

      saveActiveSession({
        roomCode: cleanedCode,
        playerName: trimmedName,
        avatar: selectedAvatar,
      });

      onRoomJoined(roomData, trimmedName);
      onNavigate('lobby');
    };

    socketService.emit(
      SOCKET_EVENTS.JOIN_ROOM,
      {
        roomCode: cleanedCode,
        playerName: trimmedName,
        avatar: selectedAvatar,
        playerId,
        sessionToken,
      },
      (response) => {
        if (response && response.success) {
          handleSuccess(response.room);
        } else {
          clearTimeout(timeoutTimer);
          setIsLoading(false);
          setErrorMessage(response?.error || 'Unable to join room. Verify the code and try again.');
        }
      }
    );
  };

  return (
    <div className="room-page-container">
      <div className="room-card-wrapper">
        <Card
          title="Join Existing Arena"
          subtitle="Enter a 6-character room code provided by your host"
          glowColor="blue"
        >
          <form className="room-form" onSubmit={handleJoinRoom}>
            {errorMessage && (
              <div className="form-error-alert" role="alert">
                <span>⚠️</span>
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="joinRoomCodeInput">
                Room Code (6 Characters)
                <span className="form-hint">Case insensitive</span>
              </label>
              <input
                id="joinRoomCodeInput"
                type="text"
                className="room-input code-input"
                value={roomCode}
                onChange={(e) => setRoomCode(formatRoomCode(e.target.value))}
                placeholder="A7K9XZ"
                maxLength={6}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="joinPlayerNameInput">
                Your Display Name
                <span className="form-hint">Max 20 chars</span>
              </label>
              <input
                id="joinPlayerNameInput"
                type="text"
                className="room-input"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="e.g. CardNinja"
                maxLength={20}
                required
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
                {isLoading ? 'Joining Room...' : 'JOIN ROOM'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
