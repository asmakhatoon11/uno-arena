import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from './hooks/useSocket';
import { socketService } from './services/socketService';
import { soundManager } from './services/soundManager';
import { SOCKET_EVENTS } from './shared/constants/socketEvents.js';
import {
  getActiveSession,
  clearActiveSession,
  getPlayerId,
  getSessionToken,
} from './services/playerSession';
import { Header } from './components/layout/Header';
import { BackgroundCards } from './components/layout/BackgroundCards';
import { SettingsModal } from './components/common/SettingsModal';
import { TutorialModal } from './components/common/TutorialModal';
import { ProfileModal } from './components/common/ProfileModal';
import { LandingPage } from './pages/LandingPage';
import { CreateRoomPage } from './pages/CreateRoomPage';
import { JoinRoomPage } from './pages/JoinRoomPage';
import { LobbyPage } from './pages/LobbyPage';
import { GamePage } from './pages/GamePage';
import { ResultPage } from './pages/ResultPage';
import './App.css';

/**
 * URL Path to Page Mapping
 */
const PAGE_PATHS = {
  landing: '/',
  create: '/create',
  join: '/join',
  lobby: '/lobby',
  game: '/game',
  result: '/result',
};

/**
 * Resolves application page from current URL pathname
 * @param {string} pathname 
 * @returns {'landing'|'create'|'join'|'lobby'|'game'|'result'}
 */
function getPageFromPath(pathname) {
  const clean = (pathname || '/').toLowerCase().replace(/\/$/, '') || '/';
  if (clean === '/create') return 'create';
  if (clean === '/join') return 'join';
  if (clean === '/lobby') return 'lobby';
  if (clean === '/game') return 'game';
  if (clean === '/result') return 'result';
  return 'landing';
}

/**
 * Root Application Component (Phases 1 - 5)
 * Manages active route view, state-safety navigation guards, background effects, modals, and real-time socket lifecycle
 */
export function App() {
  const initialPathPage = typeof window !== 'undefined'
    ? getPageFromPath(window.location.pathname)
    : 'landing';

  // Determine initial page: allow safe pages immediately; hold state-dependent pages only if active session exists
  const [currentPage, setCurrentPage] = useState(() => {
    if (['landing', 'create', 'join'].includes(initialPathPage)) {
      return initialPathPage;
    }
    const session = getActiveSession();
    if (session?.roomCode) {
      return initialPathPage;
    }
    return 'landing';
  });

  const [roomState, setRoomState] = useState(null);
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('uno_player_name') || 'Player');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Status banner for friendly system notices (reconnecting, warning, info, success)
  const [statusBanner, setStatusBanner] = useState({ visible: false, message: '', type: 'info' });
  const bannerTimerRef = useRef(null);

  // Tracks active session verification lifecycle
  const [isVerifyingSession, setIsVerifyingSession] = useState(() => {
    const session = getActiveSession();
    return Boolean(session?.roomCode);
  });

  const attemptedSocketRef = useRef(null);

  const { isConnected, socketId } = useSocket();

  /**
   * Displays a friendly non-blocking notification toast
   */
  const showNotice = useCallback((message, type = 'info', duration = 3500) => {
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    setStatusBanner({ visible: true, message, type });
    bannerTimerRef.current = setTimeout(() => {
      setStatusBanner({ visible: false, message: '', type: 'info' });
    }, duration);
  }, []);

  /**
   * Low-level navigation updating browser history and page state
   */
  const executeNavigate = useCallback((page, replace = false) => {
    soundManager.unlock();
    const targetPath = PAGE_PATHS[page] || '/';
    if (typeof window !== 'undefined') {
      if (replace) {
        window.history.replaceState({ page }, '', targetPath);
      } else if (window.location.pathname !== targetPath) {
        window.history.pushState({ page }, '', targetPath);
      }
    }
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  /**
   * Authoritative Navigation Guard
   * Validates target page prerequisites before allowing navigation
   */
  const handleNavigate = useCallback(
    (targetPage, replace = false) => {
      // 1. Lobby Guard
      if (targetPage === 'lobby') {
        if (roomState && (roomState.roomCode || roomState.code) && (roomState.status === 'waiting' || !roomState.status)) {
          executeNavigate('lobby', replace);
        } else if (roomState && roomState.status === 'playing') {
          executeNavigate('game', true);
        } else if (isVerifyingSession) {
          executeNavigate('lobby', replace);
        } else {
          executeNavigate('landing', true);
          showNotice('Room session not found. Returning to Home...', 'warning');
        }
        return;
      }

      // 2. Game Guard
      if (targetPage === 'game') {
        if (roomState && (roomState.roomCode || roomState.code) && roomState.status === 'playing') {
          executeNavigate('game', replace);
        } else if (roomState && roomState.status === 'finished') {
          executeNavigate('result', true);
        } else if (roomState && roomState.status === 'waiting') {
          executeNavigate('lobby', true);
        } else if (isVerifyingSession) {
          executeNavigate('game', replace);
        } else {
          executeNavigate('landing', true);
          showNotice('Game session not found. Returning to Home...', 'warning');
        }
        return;
      }

      // 3. Result Guard
      if (targetPage === 'result') {
        if (roomState && (roomState.roomCode || roomState.code) && (roomState.status === 'finished' || roomState.winner)) {
          executeNavigate('result', replace);
        } else if (roomState && roomState.status === 'playing') {
          executeNavigate('game', true);
        } else if (roomState && roomState.status === 'waiting') {
          executeNavigate('lobby', true);
        } else if (isVerifyingSession) {
          executeNavigate('result', replace);
        } else {
          executeNavigate('landing', true);
          showNotice('Completed match result not found. Returning to Home...', 'warning');
        }
        return;
      }

      // 4. Safe Pages: 'landing', 'create', 'join'
      executeNavigate(targetPage, replace);
    },
    [roomState, isVerifyingSession, executeNavigate, showNotice]
  );

  // Initialize accessibility and animation preferences from localStorage
  useEffect(() => {
    if (localStorage.getItem('uno_reduced_motion') === 'true') {
      document.body.classList.add('reduce-motion');
    }
    if (localStorage.getItem('uno_animations_enabled') === 'false') {
      document.body.classList.add('no-animations');
    }
  }, []);

  // Initial URL check: if direct navigation to state-dependent page without session, redirect safely
  useEffect(() => {
    const session = getActiveSession();
    if (!session?.roomCode && ['lobby', 'game', 'result'].includes(initialPathPage)) {
      if (window.location.pathname !== '/') {
        window.history.replaceState({ page: 'landing' }, '', '/');
      }
      showNotice(
        initialPathPage === 'lobby'
          ? 'Room session not found. Returning to Home...'
          : initialPathPage === 'game'
          ? 'Game session not found. Returning to Home...'
          : 'Completed match result not found. Returning to Home...',
        'warning'
      );
    } else {
      const search = (currentPage === 'join' && window.location.search) ? window.location.search : '';
      const initialPath = (PAGE_PATHS[currentPage] || '/') + search;
      window.history.replaceState({ page: currentPage }, '', initialPath);
    }
  }, []); // Run once on mount

  // Handle Browser Back / Forward buttons (popstate)
  useEffect(() => {
    const handlePopState = (e) => {
      const destPage = e.state?.page || getPageFromPath(window.location.pathname);
      handleNavigate(destPage, true);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [handleNavigate]);

  // Automatic Reconnection Effect upon Socket Connection (Phase 4 preservation)
  useEffect(() => {
    if (!isConnected || !socketId) return;
    if (attemptedSocketRef.current === socketId) return;

    const activeSession = getActiveSession();
    if (activeSession && activeSession.roomCode) {
      attemptedSocketRef.current = socketId;
      showNotice(`Reconnecting to room #${activeSession.roomCode}...`, 'reconnecting', 10000);

      socketService.emit(
        SOCKET_EVENTS.RECONNECT_PLAYER,
        {
          roomCode: activeSession.roomCode,
          playerId: getPlayerId(),
          sessionToken: getSessionToken(),
        },
        (response) => {
          setIsVerifyingSession(false);
          if (response && response.success && response.room) {
            setRoomState(response.room);
            if (activeSession.playerName) {
              setPlayerName(activeSession.playerName);
            }

            if (response.room.status === 'playing') {
              executeNavigate('game', true);
            } else if (response.room.status === 'finished') {
              executeNavigate('result', true);
            } else {
              executeNavigate('lobby', true);
            }

            showNotice(`Reconnected to room #${activeSession.roomCode}!`, 'reconnected', 3000);
          } else {
            console.warn('[Reconnect] Session restore rejected:', response?.error);
            clearActiveSession();
            setRoomState(null);
            executeNavigate('landing', true);
            showNotice(
              response?.error
                ? `Room session expired: ${response.error}`
                : 'Room session expired. Returning to Home...',
              'warning',
              4000
            );
          }
        }
      );
    } else {
      setIsVerifyingSession(false);
    }
  }, [isConnected, socketId, executeNavigate, showNotice]);

  // Safety Timeout for Session Verification
  useEffect(() => {
    if (isVerifyingSession) {
      const timer = setTimeout(() => {
        setIsVerifyingSession(false);
        const active = getActiveSession();
        if (active && !roomState) {
          clearActiveSession();
          executeNavigate('landing', true);
          showNotice('Connection timed out. Returning to Home...', 'warning');
        }
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [isVerifyingSession, roomState, executeNavigate, showNotice]);

  // Socket event listeners for synchronized state
  useEffect(() => {
    const handleRoomState = (state) => {
      if (state) {
        setRoomState(state);
        // Synchronize view if room status progressed
        if (state.status === 'playing' && currentPage === 'lobby') {
          executeNavigate('game', true);
        } else if (state.status === 'waiting' && currentPage === 'game') {
          executeNavigate('lobby', true);
        }
      }
    };

    const handleGameStarted = (state) => {
      if (state) setRoomState(state);
      executeNavigate('game', true);
    };

    const handleRoundEnded = (payload) => {
      if (payload) {
        // Record match stats in localStorage
        const isWinner = payload.winner?.id === socketId;
        const prevWins = parseInt(localStorage.getItem('uno_stats_wins') || '0', 10);
        const prevGames = parseInt(localStorage.getItem('uno_stats_games') || '0', 10);
        const prevPts = parseInt(localStorage.getItem('uno_stats_points') || '0', 10);

        localStorage.setItem('uno_stats_games', (prevGames + 1).toString());
        if (isWinner) {
          localStorage.setItem('uno_stats_wins', (prevWins + 1).toString());
          localStorage.setItem('uno_stats_points', (prevPts + (payload.roundScore || 0)).toString());
        }
      }
      executeNavigate('result', true);
    };

    const handlePlayerLeft = ({ playerId }) => {
      if (playerId === socketId) {
        clearActiveSession();
        setRoomState(null);
        setIsVerifyingSession(false);
        executeNavigate('landing', true);
        showNotice('You left the room.', 'info');
      }
    };

    socketService.on(SOCKET_EVENTS.ROOM_STATE, handleRoomState);
    socketService.on(SOCKET_EVENTS.GAME_STARTED, handleGameStarted);
    socketService.on(SOCKET_EVENTS.ROUND_ENDED, handleRoundEnded);
    socketService.on(SOCKET_EVENTS.PLAYER_LEFT, handlePlayerLeft);

    return () => {
      socketService.off(SOCKET_EVENTS.ROOM_STATE, handleRoomState);
      socketService.off(SOCKET_EVENTS.GAME_STARTED, handleGameStarted);
      socketService.off(SOCKET_EVENTS.ROUND_ENDED, handleRoundEnded);
      socketService.off(SOCKET_EVENTS.PLAYER_LEFT, handlePlayerLeft);
    };
  }, [socketId, currentPage, executeNavigate, showNotice]);

  const handleRoomJoined = (initialRoomState, name) => {
    setRoomState(initialRoomState);
    if (name) setPlayerName(name);
    executeNavigate('lobby', false);
  };

  const handleLeaveRoom = () => {
    clearActiveSession();
    setRoomState(null);
    setIsVerifyingSession(false);
    executeNavigate('landing', true);
    showNotice('You left the room.', 'info');
  };

  /**
   * Renders currently active page view with state-safety protection
   */
  const renderCurrentPage = () => {
    // If actively verifying a session on a state-dependent page, show clean loading view
    if (isVerifyingSession && ['lobby', 'game', 'result'].includes(currentPage)) {
      const activeSession = getActiveSession();
      return (
        <div className="arena-loading-screen" role="status" aria-live="polite">
          <div className="arena-loading-card">
            <div className="arena-loading-brand">
              <div className="brand-badge">
                <span className="badge-u">U</span>
                <span className="badge-no">NO</span>
              </div>
              <span className="brand-name">ARENA</span>
            </div>
            <div className="arena-loading-spinner" />
            <h3 className="arena-loading-title">RECONNECTING TO ARENA</h3>
            <p className="arena-loading-sub">
              {activeSession?.roomCode
                ? `Restoring session for room #${activeSession.roomCode}...`
                : 'Verifying battle arena state...'}
            </p>
          </div>
        </div>
      );
    }

    switch (currentPage) {
      case 'landing':
        return (
          <LandingPage
            onNavigate={handleNavigate}
            onOpenTutorial={() => setIsTutorialOpen(true)}
          />
        );
      case 'create':
        return (
          <CreateRoomPage
            onNavigate={handleNavigate}
            onRoomJoined={handleRoomJoined}
            isConnected={isConnected}
          />
        );
      case 'join':
        return (
          <JoinRoomPage
            onNavigate={handleNavigate}
            onRoomJoined={handleRoomJoined}
            isConnected={isConnected}
          />
        );
      case 'lobby':
        return (
          <LobbyPage
            onNavigate={handleNavigate}
            roomState={roomState}
            socketId={socketId}
            onLeaveRoom={handleLeaveRoom}
            onStartGame={() => executeNavigate('game', true)}
          />
        );
      case 'game':
        return (
          <GamePage
            onNavigate={handleNavigate}
            roomState={roomState}
            socketId={socketId}
            onLeaveRoom={handleLeaveRoom}
          />
        );
      case 'result':
        return (
          <ResultPage
            onNavigate={handleNavigate}
            roomState={roomState}
            socketId={socketId}
            onLeaveRoom={handleLeaveRoom}
          />
        );
      default:
        return <LandingPage onNavigate={handleNavigate} />;
    }
  };

  const activeRoomCode = roomState?.roomCode || roomState?.code;

  return (
    <div className="arena-app">
      {/* Subtle Background Card Shapes with Smooth Floating Motion */}
      <BackgroundCards />

      {/* Main Header with Navigation, Room Code, Live Socket Connection Badge & Utility Modals */}
      <Header
        currentPage={currentPage}
        onNavigate={handleNavigate}
        isConnected={isConnected}
        socketId={socketId}
        roomCode={activeRoomCode}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenTutorial={() => setIsTutorialOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
      />

      {/* Non-blocking System & Reconnection Status Banner */}
      {statusBanner.visible && (
        <div className={`reconnect-banner ${statusBanner.type}`} role="alert" aria-live="assertive">
          <span className="reconnect-spinner">
            {statusBanner.type === 'reconnecting' ? '🔄' : statusBanner.type === 'warning' ? '⚠️' : '✅'}
          </span>
          <span>{statusBanner.message}</span>
        </div>
      )}

      {/* Dynamic View Container */}
      <main className="arena-main">
        {renderCurrentPage()}
      </main>

      {/* Footer */}
      <footer className="arena-footer">
        <div className="container footer-content">
          <span className="footer-credits">
            UNO ARENA &bull; Play. Match. Shout UNO.
          </span>
          <div className="footer-status">
            <span>Authoritative Engine: Node.js + Express + Socket.IO</span>
          </div>
        </div>
      </footer>

      {/* Global Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
      <TutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
      />
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </div>
  );
}

export default App;
