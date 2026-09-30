import React, { useState, useEffect } from 'react';
import { Button } from '../components/common/Button';
import { socketService } from '../services/socketService';
import { SOCKET_EVENTS } from '../shared/constants/socketEvents.js';
import './RoomPages.css';

/**
 * Lobby Page (Phase 2 & 3)
 * Real-time multiplayer lobby supporting 2 to 8 players.
 * Game can start with 2, 3, 4, 5, 6, 7, or 8 players as long as all joined players are ready.
 * 
 * @param {{
 *   onNavigate: (page: string) => void,
 *   roomState: Object | null,
 *   socketId: string | null,
 *   onLeaveRoom: () => void,
 *   onStartGame: () => void,
 * }} props
 */
export function LobbyPage({ onNavigate, roomState, socketId, onLeaveRoom, onStartGame }) {
  const [copied, setCopied] = useState(false);
  const [shareFeedback, setShareFeedback] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isStarting, setIsStarting] = useState(false);

  // Auto navigate back to home if no room is loaded or to game if match in progress
  useEffect(() => {
    if (!roomState || !roomState.roomCode) {
      onNavigate('landing');
    } else if (roomState.status === 'playing') {
      onNavigate('game');
    }
  }, [roomState?.roomCode, roomState?.status, onNavigate]);

  // If room state is not yet loaded, render clean guard state instead of broken lobby
  if (!roomState || !roomState.roomCode) {
    return (
      <div className="arena-loading-screen" role="status">
        <div className="state-guard-card">
          <div className="state-guard-spinner" />
          <h3 className="arena-loading-title">VERIFYING LOBBY</h3>
          <p className="state-guard-sub">Returning to Home if no active room is found...</p>
        </div>
      </div>
    );
  }

  const roomCode = roomState.roomCode || roomState.code || '';
  const players = roomState.players || [];
  const hostId = roomState.hostId || '';
  const isHost = socketId === hostId;
  const me = players.find((p) => p.id === socketId);
  const isReady = me?.ready || false;

  // Real-time player counts and readiness checks (Min 2, Max 8)
  const playerCount = players.length;
  const readyCount = players.filter((p) => p.ready).length;
  const minPlayersMet = playerCount >= 2;
  const allPlayersReady = minPlayersMet && readyCount === playerCount;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Clipboard write error', err);
    }
  };

  const handleShareRoom = async () => {
    const shareUrl = `${window.location.origin}/join?code=${roomCode}`;
    const shareText = `Join my UNO ARENA match! Room code: ${roomCode}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'UNO ARENA Match',
          text: shareText,
          url: shareUrl,
        });
      } catch (e) {
        if (e?.name !== 'AbortError') {
          try {
            await navigator.clipboard.writeText(shareUrl);
            setShareFeedback('Link copied to clipboard!');
            setTimeout(() => setShareFeedback(''), 2500);
          } catch {
            handleCopyCode();
          }
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setShareFeedback('Link copied to clipboard!');
        setTimeout(() => setShareFeedback(''), 2500);
      } catch {
        handleCopyCode();
        setShareFeedback('Code copied to clipboard!');
        setTimeout(() => setShareFeedback(''), 2500);
      }
    }
  };

  const handleToggleReady = () => {
    setErrorMessage('');
    socketService.emit(SOCKET_EVENTS.SET_READY, { roomCode }, (res) => {
      if (!res?.success) {
        setErrorMessage(res?.error || 'Failed to update ready status.');
      }
    });
  };

  const handleStartGameClick = () => {
    if (!isHost) return;
    if (!minPlayersMet) {
      setErrorMessage('At least 2 players are required to start the match.');
      return;
    }
    if (!allPlayersReady) {
      setErrorMessage('Waiting for all players to Ready Up.');
      return;
    }

    setIsStarting(true);
    setErrorMessage('');
    socketService.emit(SOCKET_EVENTS.START_GAME, { roomCode }, (res) => {
      setIsStarting(false);
      if (!res?.success) {
        setErrorMessage(res?.error || 'Failed to start game.');
      } else {
        onStartGame();
      }
    });
  };

  const handleLeave = () => {
    socketService.emit(SOCKET_EVENTS.LEAVE_ROOM, { roomCode });
    onLeaveRoom();
    onNavigate('landing');
  };

  // Dynamic status messaging
  let statusTip = '';
  if (playerCount < 2) {
    statusTip = 'Need at least 2 players to start. Share the room code — up to 8 players can join!';
  } else if (!allPlayersReady) {
    statusTip = 'Waiting for all players to Ready Up';
  } else if (isHost) {
    statusTip = 'All players ready — Start Game (or wait for more players to join)';
  } else {
    statusTip = 'All players ready — Waiting for Host to start match...';
  }

  // Dynamic Start Game button label for Host
  let startButtonLabel = 'START GAME';
  if (isStarting) {
    startButtonLabel = 'Launching...';
  } else if (playerCount < 2) {
    startButtonLabel = 'Waiting for at least 2 players';
  } else if (!allPlayersReady) {
    startButtonLabel = 'Waiting for all players to Ready Up';
  } else {
    startButtonLabel = 'All players ready — Start Game';
  }

  return (
    <div className="lobby-container">
      {/* Top Banner & Room Code */}
      <div className="lobby-header-panel">
        <div className="lobby-info">
          <h2>BATTLE ARENA LOBBY</h2>
          <p className="lobby-subtitle">
            Assemble your contenders. Ready up to commence combat (2–8 players).
          </p>
        </div>

        <div className="room-code-badge">
          <span className="code-label">ROOM CODE:</span>
          <span className="code-value">{roomCode || '------'}</span>
          <button
            type="button"
            className={`copy-code-btn ${copied ? 'copied' : ''}`}
            onClick={handleCopyCode}
            aria-label="Copy Room Code"
          >
            {copied ? '✓ COPIED' : '📋 COPY'}
          </button>
          <button
            type="button"
            className="share-code-btn"
            onClick={handleShareRoom}
            aria-label="Share Room"
          >
            🔗 SHARE
          </button>
        </div>
      </div>

      {shareFeedback && (
        <div style={{ textAlign: 'center', color: 'var(--uno-green)', marginBottom: '16px', fontWeight: 700 }}>
          {shareFeedback}
        </div>
      )}

      {errorMessage && (
        <div className="form-error-alert" style={{ marginBottom: '20px' }}>
          <span>⚠️</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Players Grid Section Header */}
      <div className="players-section-title">
        <div className="section-title-left">
          <h3>ACTIVE CONTENDERS</h3>
          <span className="player-capacity-subtle">Up to 8 players can join</span>
        </div>
        <span className={`player-count-pill ${playerCount === 8 ? 'room-full' : ''}`}>
          {playerCount === 8 ? 'ROOM FULL — 8/8' : `PLAYERS ${playerCount} / 8`}
        </span>
      </div>

      <div className="players-grid">
        {players.map((player) => {
          const isMe = player.id === socketId;
          const playerIsHost = player.isHost || player.id === hostId;

          return (
            <div
              key={player.id}
              className={`player-card ${isMe ? 'is-me' : ''} ${player.ready ? 'is-ready' : ''}`}
            >
              {playerIsHost && (
                <div className="host-badge-pill">
                  <span>👑</span>
                  <span>HOST</span>
                </div>
              )}

              <div className="player-avatar-wrapper">
                <span>{player.avatar || '🦊'}</span>
                <span
                  className={`online-dot ${player.connected ? '' : 'offline'}`}
                  title={player.connected ? 'Connected' : 'Disconnected'}
                />
              </div>

              <div className="player-name-row">
                <span className="player-name-text" title={player.name}>
                  {player.name}
                </span>
                {isMe && <span className="you-tag">YOU</span>}
              </div>

              <div className={`ready-status-pill ${player.ready ? 'ready' : 'waiting'}`}>
                {player.ready ? '✓ READY' : '⏳ NOT READY'}
              </div>
            </div>
          );
        })}

        {/* Dynamic open slot inviting up to 8 players */}
        {playerCount < 8 && (
          <div className="player-card empty-slot open-slot">
            <div className="empty-slot-icon">＋</div>
            <span className="empty-slot-text">Open Slot ({playerCount + 1}/8)</span>
            <span className="empty-slot-subtext">Up to 8 players can join</span>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="lobby-controls-panel">
        <div className="lobby-rules-tip">
          <span className="tip-icon">💡</span>
          <span>{statusTip}</span>
        </div>

        <div className="lobby-action-buttons">
          <Button variant="secondary" onClick={handleLeave}>
            Leave Room
          </Button>

          <Button
            variant={isReady ? 'outline' : 'success'}
            onClick={handleToggleReady}
          >
            {isReady ? 'CANCEL READY' : 'READY UP'}
          </Button>

          {isHost && (
            <Button
              variant="primary"
              disabled={!allPlayersReady || isStarting || playerCount < 2}
              onClick={handleStartGameClick}
            >
              {startButtonLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
