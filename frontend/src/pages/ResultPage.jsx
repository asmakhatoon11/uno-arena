import React, { useEffect, useState } from 'react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { socketService } from '../services/socketService';
import { soundManager } from '../services/soundManager';
import { SOCKET_EVENTS } from '../shared/constants/socketEvents.js';
import './ResultPage.css';

/**
 * ResultPage (Phases 4 & 6)
 * Victory screen, scoreboard with round/total points, and rematch flow.
 * 
 * @param {{
 *   onNavigate: (page: string) => void,
 *   roomState: Object,
 *   socketId: string,
 * }} props
 */
export function ResultPage({ onNavigate, roomState, socketId, onLeaveRoom }) {
  const [rematchRequested, setRematchRequested] = useState(false);

  const roomCode = roomState?.roomCode || roomState?.code;
  const winner = roomState?.winner;
  const isMeWinner = winner?.id === socketId;
  const players = roomState?.players || [];

  const isResultValid = Boolean(
    roomState && (roomState.roomCode || roomState.code) && (roomState.winner || roomState.status === 'finished')
  );

  // Authoritative State Guard: redirect safely if no completed game exists
  useEffect(() => {
    if (!roomState || !(roomState.roomCode || roomState.code)) {
      onNavigate('landing');
    } else if (roomState.status === 'playing') {
      onNavigate('game');
    } else if (roomState.status === 'waiting') {
      onNavigate('lobby');
    }
  }, [roomState?.roomCode, roomState?.code, roomState?.status, onNavigate]);

  // Play victory sound on mount ONLY if result is valid
  useEffect(() => {
    if (isResultValid) {
      soundManager.winner();
    }
  }, [isResultValid]);

  // Listen for rematch start
  useEffect(() => {
    const handleRematchStarted = () => {
      onNavigate('game');
    };

    const handleRoomState = (state) => {
      if (state?.status === 'waiting') {
        onNavigate('lobby');
      } else if (state?.status === 'playing') {
        onNavigate('game');
      }
    };

    socketService.on(SOCKET_EVENTS.REMATCH_STARTED, handleRematchStarted);
    socketService.on(SOCKET_EVENTS.ROOM_STATE, handleRoomState);

    return () => {
      socketService.off(SOCKET_EVENTS.REMATCH_STARTED, handleRematchStarted);
      socketService.off(SOCKET_EVENTS.ROOM_STATE, handleRoomState);
    };
  }, [onNavigate]);

  const handleRematchClick = () => {
    setRematchRequested(true);
    socketService.emit(SOCKET_EVENTS.REMATCH_REQUEST, { roomCode });
  };

  const handleReturnToLobby = () => {
    socketService.emit(SOCKET_EVENTS.RETURN_TO_LOBBY, { roomCode });
    onNavigate('lobby');
  };

  const handleHomeClick = () => {
    socketService.emit(SOCKET_EVENTS.LEAVE_ROOM, { roomCode });
    if (typeof onLeaveRoom === 'function') {
      onLeaveRoom();
    } else {
      onNavigate('landing');
    }
  };

  // If result is not valid, render clean guard loader instead of empty scorecard
  if (!isResultValid) {
    return (
      <div className="arena-loading-screen" role="status">
        <div className="state-guard-card">
          <div className="state-guard-spinner" />
          <h3 className="arena-loading-title">VERIFYING RESULT</h3>
          <p className="state-guard-sub">Returning to Home if no completed match is found...</p>
        </div>
      </div>
    );
  }

  // Sort players by total score
  const sortedPlayers = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));

  const rankBadges = ['🥇 1st', '🥈 2nd', '🥉 3rd', '4th', '5th', '6th', '7th', '8th'];

  return (
    <div className="result-page-container">
      <div className="result-card-wrapper">
        <Card glowColor="yellow">
          {/* Victory Announcement Header */}
          <div className="victory-banner">
            <div className="trophy-icon">🏆</div>
            <h1 className="winner-headline">
              {isMeWinner ? 'YOU WIN THE ARENA!' : `${winner?.name || 'CHAMPION'} WINS!`}
            </h1>
            <p className="victory-subtext">
              Emptied their hand and scored victory points from opponents.
            </p>
          </div>

          {/* Scoreboard */}
          <div className="scoreboard-section">
            {sortedPlayers.map((player, idx) => {
              const isWinnerRow = player.id === winner?.id;

              return (
                <div
                  key={player.id}
                  className={`scoreboard-row ${isWinnerRow ? 'winner-row' : ''}`}
                >
                  <div className="rank-player-col">
                    <span className="rank-badge">{rankBadges[idx] || `${idx + 1}th`}</span>
                    <span className="player-avatar-small">{player.avatar || '🦊'}</span>
                    <span className="player-name-bold">
                      {player.name} {player.id === socketId && '(You)'}
                    </span>
                  </div>

                  <div className="score-stats-col">
                    <div className="cards-left-text">
                      {player.cardsCount === 0 ? '0 cards (Cleared)' : `${player.cardsCount} cards left`}
                    </div>
                    <div className="total-score-badge">
                      {player.score || 0} PTS
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="result-actions">
            <Button variant="secondary" size="md" onClick={handleHomeClick}>
              Home
            </Button>
            <Button variant="outline" size="md" onClick={handleReturnToLobby}>
              Return to Lobby
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleRematchClick}
              disabled={rematchRequested}
            >
              {rematchRequested ? 'Waiting for Contenders...' : 'Rematch'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
