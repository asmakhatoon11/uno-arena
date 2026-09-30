import React, { useState, useEffect, useRef } from 'react';
import { UnoCard } from '../components/game/UnoCard';
import { ColorPickerModal } from '../components/game/ColorPickerModal';
import { ChatPanel } from '../components/game/ChatPanel';
import { socketService } from '../services/socketService';
import { soundManager } from '../services/soundManager';
import { SOCKET_EVENTS } from '../shared/constants/socketEvents.js';
import { CARD_COLORS, CARD_VALUES } from '../shared/constants/cardConstants.js';
import './GamePage.css';

const EMOTE_LIST = ['😂', '😎', '🔥', '😱', '👏', '😈', '🤯', '💀', '❤️', '👀'];

/**
 * GamePage (Phases 3, 4, 5 + Master UX Redesign)
 * Real-time Authoritative Multiplayer Game Table
 * 
 * Features:
 * - Clear 4-zone layout (Opponents, Center Arena, Player Hand, Side Activity Feed)
 * - In-game Real-time Text Chat Panel (Phase 3)
 * - Large high-visibility active discard pile with color indicator
 * - Real card play flight animation (hand -> discard pile)
 * - Draw card travel animation (deck -> hand) + newly drawn card glow
 * - Reshuffling animation + ruffle sound
 * - Action card impact animations (Skip, Reverse 360 spin, +2 slam, Wild ripple, UNO celebration)
 * - Turn feedback ("YOUR TURN" vs "OPPONENT'S TURN")
 * - Invalid card click feedback ("That card cannot be played" + wiggle + sound)
 * - Collapsible, non-overlapping side activity feed
 * - Full settings & reduced-motion support
 */
export function GamePage({ onNavigate, roomState, socketId, onLeaveRoom }) {
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [pendingWildCardId, setPendingWildCardId] = useState(null);
  const [pendingWildCardRect, setPendingWildCardRect] = useState(null);
  const [recentActionBanner, setRecentActionBanner] = useState('');
  const [activeEmotes, setActiveEmotes] = useState([]);
  const [timeLeft, setTimeLeft] = useState(() => {
    return roomState?.turnDuration ? Math.round(roomState.turnDuration / 1000) : 30;
  });
  const [isLogCollapsed, setIsLogCollapsed] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState('chat'); // 'chat' | 'log'
  const [chatMessages, setChatMessages] = useState([]);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [invalidCardId, setInvalidCardId] = useState(null);
  const [newlyDrawnCardId, setNewlyDrawnCardId] = useState(null);
  const [isShuffling, setIsShuffling] = useState(false);
  const [reverseSpinKey, setReverseSpinKey] = useState(0);
  const [wildRippleColor, setWildRippleColor] = useState(null);
  const [canScrollOpponentsLeft, setCanScrollOpponentsLeft] = useState(false);
  const [canScrollOpponentsRight, setCanScrollOpponentsRight] = useState(false);

  // Flight animation state: { card, startX, startY, deltaX, deltaY }
  const [flyingPlayCard, setFlyingPlayCard] = useState(null);
  const [flyingDrawCard, setFlyingDrawCard] = useState(null);

  // Refs for animation measurement & scrolling
  const discardRef = useRef(null);
  const deckRef = useRef(null);
  const handRef = useRef(null);
  const opponentsRowRef = useRef(null);
  const logEndRef = useRef(null);
  const previousTurnIdRef = useRef(null);
  const prevHandIdsRef = useRef([]);
  const prevDrawPileCountRef = useRef(null);

  const roomCode = roomState?.roomCode || roomState?.code;
  const players = roomState?.players || [];
  const myHand = roomState?.myHand || [];
  const discardTop = roomState?.discardTop;
  const currentColor = roomState?.currentColor || discardTop?.color;
  const isMyTurn = socketId === roomState?.currentPlayerId;
  const drawPileCount = roomState?.drawPileCount ?? 80;
  const isClockwise = (roomState?.direction ?? 1) === 1;

  const isGameValid = Boolean(roomState && (roomState.roomCode || roomState.code) && roomState.status === 'playing');

  // Authoritative State Guard: redirect safely if no active match exists
  useEffect(() => {
    if (!roomState || !(roomState.roomCode || roomState.code)) {
      onNavigate('landing');
    } else if (roomState.status === 'waiting') {
      onNavigate('lobby');
    } else if (roomState.status === 'finished') {
      onNavigate('result');
    }
  }, [roomState?.roomCode, roomState?.code, roomState?.status, onNavigate]);

  // Track hand changes to detect newly drawn cards
  useEffect(() => {
    const currentIds = myHand.map((c) => c.id);
    if (prevHandIdsRef.current.length > 0) {
      const addedCardId = currentIds.find((id) => !prevHandIdsRef.current.includes(id));
      if (addedCardId) {
        setNewlyDrawnCardId(addedCardId);
        setTimeout(() => setNewlyDrawnCardId(null), 1600);
      }
    }
    prevHandIdsRef.current = currentIds;
  }, [myHand]);

  // Track reshuffle events (draw pile count increases by more than 4)
  useEffect(() => {
    if (prevDrawPileCountRef.current !== null && drawPileCount > prevDrawPileCountRef.current + 4) {
      setIsShuffling(true);
      soundManager.shuffle();
      setTimeout(() => setIsShuffling(false), 750);
    }
    prevDrawPileCountRef.current = drawPileCount;
  }, [drawPileCount]);

  // Turn start sound and visual feedback
  useEffect(() => {
    if (roomState?.currentPlayerId) {
      if (previousTurnIdRef.current !== roomState.currentPlayerId) {
        previousTurnIdRef.current = roomState.currentPlayerId;
        if (roomState.currentPlayerId === socketId) {
          soundManager.turnStart();
        }
      }
    }
  }, [roomState?.currentPlayerId, socketId]);

  // Turn timer countdown with audio warnings
  useEffect(() => {
    if (!roomState?.turnExpiresAt) {
      const defaultDurationSec = roomState?.turnDuration ? Math.round(roomState.turnDuration / 1000) : 30;
      setTimeLeft(defaultDurationSec);
      return;
    }

    const updateTimer = () => {
      const remainingMs = Math.max(0, roomState.turnExpiresAt - Date.now());
      const remainingSec = Math.ceil(remainingMs / 1000);
      setTimeLeft(remainingSec);

      if (isMyTurn) {
        if (remainingSec === 10) {
          soundManager.timerTick();
        } else if (remainingSec <= 5 && remainingSec > 0) {
          soundManager.warning();
        }
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 500);

    return () => clearInterval(interval);
  }, [roomState?.turnExpiresAt, roomState?.turnDuration, isMyTurn]);

  // Auto-scroll activity feed to bottom
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [roomState?.gameLog]);

  // Monitor horizontal scrollability for 8-player opponent row
  useEffect(() => {
    const el = opponentsRowRef.current;
    if (!el) return;

    const updateScrollHints = () => {
      const { scrollLeft, scrollWidth, clientWidth } = el;
      const maxScroll = scrollWidth - clientWidth;
      setCanScrollOpponentsLeft(scrollLeft > 6);
      setCanScrollOpponentsRight(maxScroll > 6 && scrollLeft < maxScroll - 6);
    };

    updateScrollHints();
    el.addEventListener('scroll', updateScrollHints, { passive: true });
    window.addEventListener('resize', updateScrollHints);

    let ro = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(updateScrollHints);
      ro.observe(el);
    }

    return () => {
      el.removeEventListener('scroll', updateScrollHints);
      window.removeEventListener('resize', updateScrollHints);
      ro?.disconnect();
    };
  }, [players.length]);

  // Listen for real-time game events & special card animations
  useEffect(() => {
    const handleCardPlayed = ({ playedCard, specialAction, currentColor: newColor }) => {
      if (specialAction) {
        const actionLabels = {
          SKIP: '🚫 SKIP!',
          REVERSE: '🔄 REVERSE!',
          DRAW_TWO: '+2 CARDS!',
          WILD: `🌈 COLOR: ${(newColor || 'WILD').toUpperCase()}!`,
          WILD_DRAW_FOUR: `💥 +4 CARDS & ${(newColor || 'WILD').toUpperCase()}!`,
        };
        const label = actionLabels[specialAction] || specialAction;
        setRecentActionBanner(label);

        // Action-specific sound effects and animations
        if (specialAction === 'SKIP') {
          soundManager.skip();
        } else if (specialAction === 'REVERSE') {
          soundManager.reverse();
          setReverseSpinKey((k) => k + 1);
        } else if (specialAction === 'DRAW_TWO') {
          soundManager.drawTwo();
        } else if (specialAction === 'WILD') {
          soundManager.wild();
          setWildRippleColor(newColor || 'red');
          setTimeout(() => setWildRippleColor(null), 1200);
        } else if (specialAction === 'WILD_DRAW_FOUR') {
          soundManager.wildDrawFour();
          setWildRippleColor(newColor || 'red');
          setTimeout(() => setWildRippleColor(null), 1200);
        }

        setTimeout(() => setRecentActionBanner(''), 2200);
      } else {
        soundManager.cardPlay();
      }
    };

    const handleCardDrawn = () => {
      soundManager.cardDraw();
    };

    const handleUnoCalled = ({ playerName }) => {
      soundManager.unoCall();
      setRecentActionBanner(`🔥 ${playerName.toUpperCase()} SHOUTED UNO! 🔥`);
      setTimeout(() => setRecentActionBanner(''), 2500);
    };

    const handleUnoPenalty = ({ playerName, reason }) => {
      soundManager.error();
      setRecentActionBanner(`⚠️ ${playerName.toUpperCase()} UNO PENALTY (+2)!`);
      setTimeout(() => setRecentActionBanner(''), 2500);
    };

    const handlePlayerEmote = ({ playerName, emote }) => {
      soundManager.emote();
      const emoteItem = {
        id: `emote_${Date.now()}_${Math.random()}`,
        emote,
        playerName,
        left: 25 + Math.random() * 50,
        top: 25 + Math.random() * 40,
      };
      setActiveEmotes((prev) => [...prev, emoteItem]);
      setTimeout(() => {
        setActiveEmotes((prev) => prev.filter((e) => e.id !== emoteItem.id));
      }, 1500);
    };

    const handleIncomingChatMessage = (chatItem) => {
      if (!chatItem) return;
      setChatMessages((prev) => {
        if (prev.some((m) => m.id === chatItem.id)) return prev;
        return [...prev, chatItem].slice(-50);
      });

      if (chatItem.senderId !== socketId) {
        soundManager.chatMessage();
        setUnreadChatCount((prev) => prev + 1);
      }
    };

    socketService.on(SOCKET_EVENTS.CARD_PLAYED, handleCardPlayed);
    socketService.on(SOCKET_EVENTS.CARD_DRAWN, handleCardDrawn);
    socketService.on(SOCKET_EVENTS.UNO_CALLED, handleUnoCalled);
    socketService.on(SOCKET_EVENTS.UNO_PENALTY, handleUnoPenalty);
    socketService.on(SOCKET_EVENTS.PLAYER_EMOTE, handlePlayerEmote);
    socketService.on(SOCKET_EVENTS.CHAT_MESSAGE, handleIncomingChatMessage);

    return () => {
      socketService.off(SOCKET_EVENTS.CARD_PLAYED, handleCardPlayed);
      socketService.off(SOCKET_EVENTS.CARD_DRAWN, handleCardDrawn);
      socketService.off(SOCKET_EVENTS.UNO_CALLED, handleUnoCalled);
      socketService.off(SOCKET_EVENTS.UNO_PENALTY, handleUnoPenalty);
      socketService.off(SOCKET_EVENTS.PLAYER_EMOTE, handlePlayerEmote);
      socketService.off(SOCKET_EVENTS.CHAT_MESSAGE, handleIncomingChatMessage);
    };
  }, [socketId]);

  // Playable card rule check
  const checkCardIsPlayable = (card) => {
    if (!isMyTurn || !discardTop) return false;
    if (card.color === CARD_COLORS.WILD) return true;
    const effectiveColor = currentColor || discardTop.color;
    return card.color === effectiveColor || card.value === discardTop.value;
  };

  // Card click handler with interactive animations & invalid feedback
  const handleCardClick = (card, event) => {
    soundManager.unlock();

    // Not player's turn feedback
    if (!isMyTurn) {
      setErrorMessage("It's not your turn yet!");
      setInvalidCardId(card.id);
      soundManager.error();
      setTimeout(() => {
        setErrorMessage('');
        setInvalidCardId(null);
      }, 1800);
      return;
    }

    // Invalid card rule feedback
    if (!checkCardIsPlayable(card)) {
      setErrorMessage('That card cannot be played.');
      setInvalidCardId(card.id);
      soundManager.error();
      setTimeout(() => {
        setErrorMessage('');
        setInvalidCardId(null);
      }, 1800);
      return;
    }

    // Wild Card color picker trigger
    if (card.color === CARD_COLORS.WILD) {
      setSelectedCardId(card.id);
      soundManager.cardSelect();
      setPendingWildCardId(card.id);
      if (event?.currentTarget && typeof event.currentTarget.getBoundingClientRect === 'function') {
        const rect = event.currentTarget.getBoundingClientRect();
        setPendingWildCardRect({
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        });
      } else {
        setPendingWildCardRect(null);
      }
      setIsColorPickerOpen(true);
      return;
    }

    // Execute card play with flight animation
    triggerCardFlightAndPlay(card, event, null);
  };

  const handleColorSelected = (chosenColor) => {
    setIsColorPickerOpen(false);
    if (pendingWildCardId) {
      const card = myHand.find((c) => c.id === pendingWildCardId);
      const savedRect = pendingWildCardRect;
      setPendingWildCardRect(null);
      setPendingWildCardId(null);
      setSelectedCardId(null);
      if (card) {
        triggerCardFlightAndPlay(card, null, chosenColor, savedRect);
      }
    }
  };

  /**
   * Animates card flying from player's hand to center discard pile
   */
  const triggerCardFlightAndPlay = (card, event, chosenColor, customRect = null) => {
    setSelectedCardId(card?.id || null);
    const animationsEnabled =
      localStorage.getItem('uno_animations_enabled') !== 'false' &&
      !document.body.classList.contains('reduce-motion');

    const cardRect = customRect || (event?.currentTarget && typeof event.currentTarget.getBoundingClientRect === 'function'
      ? event.currentTarget.getBoundingClientRect()
      : null);

    if (animationsEnabled && discardRef.current && cardRect) {
      const discardRect = discardRef.current.getBoundingClientRect();

      const deltaX = discardRect.left - cardRect.left;
      const deltaY = discardRect.top - cardRect.top;

      setFlyingPlayCard({
        card,
        startX: cardRect.left,
        startY: cardRect.top,
        deltaX,
        deltaY,
      });

      soundManager.cardPlay();

      setTimeout(() => {
        setFlyingPlayCard(null);
        setSelectedCardId(null);
        executePlay(card.id, chosenColor);
      }, 320);
    } else {
      soundManager.cardPlay();
      setSelectedCardId(null);
      executePlay(card.id, chosenColor);
    }
  };

  const executePlay = (cardId, chosenColor) => {
    setErrorMessage('');
    socketService.emit(
      SOCKET_EVENTS.PLAY_CARD,
      { roomCode, cardId, chosenColor },
      (res) => {
        if (!res?.success) {
          setErrorMessage(res?.error || 'Illegal move.');
          soundManager.error();
          setTimeout(() => setErrorMessage(''), 2500);
        }
      }
    );
  };

  // Draw card handler with deck-to-hand travel animation
  const handleDrawClick = (event) => {
    soundManager.unlock();

    if (!isMyTurn) {
      setErrorMessage('It is not your turn to draw.');
      soundManager.error();
      setTimeout(() => setErrorMessage(''), 2000);
      return;
    }

    const animationsEnabled =
      localStorage.getItem('uno_animations_enabled') !== 'false' &&
      !document.body.classList.contains('reduce-motion');

    if (animationsEnabled && deckRef.current && handRef.current) {
      const deckRect = deckRef.current.getBoundingClientRect();
      const handRect = handRef.current.getBoundingClientRect();

      const deltaX = handRect.left + handRect.width / 2 - deckRect.left;
      const deltaY = handRect.top - deckRect.top;

      setFlyingDrawCard({
        startX: deckRect.left,
        startY: deckRect.top,
        deltaX,
        deltaY,
      });

      soundManager.cardDraw();

      setTimeout(() => {
        setFlyingDrawCard(null);
      }, 280);
    } else {
      soundManager.cardDraw();
    }

    socketService.emit(SOCKET_EVENTS.DRAW_CARD, { roomCode }, (res) => {
      if (!res?.success) {
        setErrorMessage(res?.error || 'Cannot draw.');
        soundManager.error();
        setTimeout(() => setErrorMessage(''), 2500);
      }
    });
  };

  // Keyboard accessibility for Draw Deck (Enter & Space)
  const handleDeckKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (isMyTurn) {
        handleDrawClick(e);
      }
    }
  };

  // Shouting UNO
  const handleShoutUno = () => {
    soundManager.unlock();
    socketService.emit(SOCKET_EVENTS.CALL_UNO, { roomCode }, (res) => {
      if (!res?.success) {
        setErrorMessage(res?.error || 'Failed to call UNO.');
        soundManager.error();
        setTimeout(() => setErrorMessage(''), 2500);
      }
    });
  };

  // Catching an opponent who didn't shout UNO
  const handleCatchUno = (targetPlayerId) => {
    soundManager.unlock();
    socketService.emit(SOCKET_EVENTS.UNO_PENALTY, { roomCode, targetPlayerId });
  };

  // Quick Emote reaction
  const handleSendEmote = (emote) => {
    soundManager.unlock();
    socketService.emit(SOCKET_EVENTS.SEND_EMOTE, { roomCode, emote });
  };

  // In-Game Text Chat Send Handler (Phase 3)
  const handleSendChatMessage = (messageText, callback) => {
    soundManager.unlock();
    const trimmed = (messageText || '').trim().slice(0, 200);
    if (!trimmed) return;

    socketService.emit(
      SOCKET_EVENTS.SEND_CHAT_MESSAGE,
      { roomCode, message: trimmed },
      (res) => {
        if (res && res.success) {
          callback?.({ success: true, message: res.message });
        } else {
          callback?.({
            success: false,
            error: res?.error || 'Failed to send message. Please wait a moment.',
          });
        }
      }
    );
  };

  // Handle Escape key to close mobile chat drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isMobileChatOpen) {
        setIsMobileChatOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileChatOpen]);

  // If game state is not valid or ready, show clean guard loader instead of broken table
  if (!isGameValid) {
    return (
      <div className="arena-loading-screen" role="status">
        <div className="state-guard-card">
          <div className="state-guard-spinner" />
          <h3 className="arena-loading-title">VERIFYING GAME SESSION</h3>
          <p className="state-guard-sub">Redirecting to valid game state...</p>
        </div>
      </div>
    );
  }

  const opponents = players.filter((p) => p.id !== socketId);
  const myCardsCount = myHand.length;
  const currentTurnPlayer = players.find((p) => p.id === roomState?.currentPlayerId);
  const currentTurnName = currentTurnPlayer?.name || 'Opponent';

  return (
    <div className="game-page-container">
      {/* Dynamic Action Banner Overlay */}
      {recentActionBanner && (
        <div className="event-banner-overlay">{recentActionBanner}</div>
      )}

      {/* Floating Emotes */}
      {activeEmotes.map((item) => (
        <div
          key={item.id}
          className="floating-emote-bubble"
          style={{ left: `${item.left}%`, top: `${item.top}%` }}
        >
          <span className="emote-bubble-icon">{item.emote}</span>
          <span className="emote-bubble-author">{item.playerName}</span>
        </div>
      ))}

      {/* Animated Card Play Flight Clone */}
      {flyingPlayCard && (
        <div
          className="flying-card-clone play-flight"
          style={{
            left: `${flyingPlayCard.startX}px`,
            top: `${flyingPlayCard.startY}px`,
            '--delta-x': `${flyingPlayCard.deltaX}px`,
            '--delta-y': `${flyingPlayCard.deltaY}px`,
          }}
        >
          <UnoCard card={flyingPlayCard.card} size="md" />
        </div>
      )}

      {/* Animated Card Draw Flight Clone */}
      {flyingDrawCard && (
        <div
          className="flying-card-clone draw-flight"
          style={{
            left: `${flyingDrawCard.startX}px`,
            top: `${flyingDrawCard.startY}px`,
            '--delta-x': `${flyingDrawCard.deltaX}px`,
            '--delta-y': `${flyingDrawCard.deltaY}px`,
          }}
        >
          <UnoCard isFaceDown size="md" />
        </div>
      )}

      {/* TOP ZONE: Opponent Contenders with Scroll Hint */}
      <section className="opponents-wrapper" aria-label="Opponent Contenders">
        {canScrollOpponentsLeft && (
          <div className="opponents-scroll-hint hint-left" aria-hidden="true">
            <span className="scroll-chevron">‹</span>
          </div>
        )}
        <div className="opponents-row" ref={opponentsRowRef}>
          {opponents.map((opp) => {
            const isOppTurn = opp.id === roomState?.currentPlayerId;
            const oppHasOneCard = opp.cardsCount === 1;

            return (
              <div
                key={opp.id}
                className={`opponent-card ${isOppTurn ? 'is-active-turn' : ''} ${!opp.connected ? 'is-disconnected' : ''}`}
              >
                <div className="opponent-avatar">
                  <span>{opp.avatar || '🦊'}</span>
                  {!opp.connected && (
                    <span className="opponent-reconnecting-badge" title="Temporarily disconnected (reconnecting...)">⏳</span>
                  )}
                  {oppHasOneCard && (
                    <span className="opponent-uno-badge">UNO!</span>
                  )}
                </div>

                <div className="opponent-info">
                  <span className="opponent-name" title={opp.name}>
                    {opp.name} {!opp.connected && <span className="reconnecting-text">(Reconnecting...)</span>}
                  </span>
                  <div className="opponent-cards-badge">
                    <div className="opponent-card-icon" />
                    <span>{opp.cardsCount} {opp.cardsCount === 1 ? 'card' : 'cards'}</span>
                  </div>
                </div>

                {oppHasOneCard && !opp.calledUno && (
                  <button
                    type="button"
                    className="catch-penalty-btn"
                    onClick={() => handleCatchUno(opp.id)}
                    title="Catch opponent who forgot to shout UNO (+2 cards)"
                  >
                    CATCH UNO!
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {canScrollOpponentsRight && (
          <div className="opponents-scroll-hint hint-right" aria-hidden="true">
            <span className="scroll-chevron">›</span>
          </div>
        )}
      </section>

      {/* MIDDLE ZONE: Table Arena & Side Activity Feed */}
      <section className="table-main-wrapper">
        {/* CENTER TABLE ARENA */}
        <div className="table-center-arena">
          <div
            className={`table-felt color-${currentColor || 'red'} ${
              wildRippleColor ? `ripple-${wildRippleColor}` : ''
            }`}
          >
            {/* Draw Pile with Reshuffle & 3D Stacking Feedback */}
            <div className="pile-container">
              <span className="pile-label">DRAW DECK</span>
              <div
                ref={deckRef}
                className={`draw-pile-interactive ${isShuffling ? 'is-reshuffling' : ''}`}
                onClick={handleDrawClick}
                onKeyDown={handleDeckKeyDown}
                role="button"
                tabIndex={isMyTurn ? 0 : -1}
                aria-disabled={!isMyTurn}
                aria-label="Draw card from deck"
                title={isMyTurn ? 'Click or press Enter/Space to draw a card' : 'Wait for your turn to draw'}
              >
                {/* 3D stacked cards appearance */}
                <div className="deck-card-layer deck-layer-3" />
                <div className="deck-card-layer deck-layer-2" />
                <div className="deck-card-layer deck-layer-1">
                  <UnoCard isFaceDown size="lg" />
                </div>

                <span className="draw-pile-count" title={`${drawPileCount} cards remaining`}>
                  {drawPileCount}
                </span>

                {isShuffling && (
                  <div className="shuffling-indicator-badge">
                    <span>🔀 RESHUFFLING...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Direction Indicator & Turn Status in Center */}
            <div className="center-indicator-box">
              <div
                key={reverseSpinKey}
                className={`direction-indicator ${reverseSpinKey > 0 ? 'spin-trigger' : ''}`}
                title={`Play direction: ${isClockwise ? 'Clockwise' : 'Counter-Clockwise'}`}
              >
                <span
                  className={`direction-arrow ${
                    isClockwise ? 'clockwise' : 'counter-clockwise'
                  }`}
                >
                  {isClockwise ? '↻' : '↺'}
                </span>
                <span className="direction-label">
                  {isClockwise ? 'CW' : 'CCW'}
                </span>
              </div>

              {/* Center Turn Status Pill */}
              <div className={`center-turn-indicator ${isMyTurn ? 'my-turn-active' : 'opp-turn-active'}`}>
                {isMyTurn ? '⚡ YOUR TURN' : `${currentTurnName.toUpperCase()}'S TURN`}
              </div>
            </div>

            {/* Active Discard Pile with Large Card & Clear Current Color Indicator */}
            <div className="pile-container discard-pile-container">
              <span className="pile-label">ACTIVE DISCARD</span>
              <div
                ref={discardRef}
                className={`discard-pile-display color-glow-${currentColor || 'red'}`}
              >
                {discardTop ? (
                  <UnoCard card={discardTop} size="lg" />
                ) : (
                  <div className="discard-placeholder" />
                )}

                {/* Prominent Current Color Indicator */}
                <div className={`current-color-badge color-bg-${currentColor || 'red'}`}>
                  <span className="color-swatch-dot" />
                  <span className="color-text-label">
                    COLOR: {(currentColor || 'RED').toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SIDE ACTIVITY & CHAT PANEL */}
        <aside
          className={`game-activity-sidebar ${isLogCollapsed ? 'is-collapsed' : ''}`}
          aria-label="Activity & Chat Feed"
        >
          <div className="sidebar-header">
            {isLogCollapsed ? (
              <button
                type="button"
                className="sidebar-collapse-toggle"
                onClick={() => {
                  setIsLogCollapsed(false);
                  if (activeSidebarTab === 'chat') setUnreadChatCount(0);
                }}
                title="Expand Chat & Activity"
              >
                <span className="feed-icon">💬</span>
                {unreadChatCount > 0 && <span className="tab-unread-pill">{unreadChatCount}</span>}
                <span className="toggle-symbol">◀</span>
              </button>
            ) : (
              <>
                <div className="sidebar-tabs-nav" role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeSidebarTab === 'chat'}
                    className={`sidebar-tab-btn ${activeSidebarTab === 'chat' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveSidebarTab('chat');
                      setUnreadChatCount(0);
                    }}
                    title="In-Game Chat"
                  >
                    <span>💬 Chat</span>
                    {unreadChatCount > 0 && (
                      <span className="tab-unread-pill">{unreadChatCount}</span>
                    )}
                  </button>

                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeSidebarTab === 'log'}
                    className={`sidebar-tab-btn ${activeSidebarTab === 'log' ? 'active' : ''}`}
                    onClick={() => setActiveSidebarTab('log')}
                    title="Game Activity Log"
                  >
                    <span>📋 Log</span>
                  </button>
                </div>

                <div className="sidebar-header-actions">
                  <button
                    type="button"
                    className="leave-game-btn"
                    onClick={() => {
                      if (window.confirm('Are you sure you want to leave this match?')) {
                        socketService.emit(SOCKET_EVENTS.LEAVE_ROOM, { roomCode });
                        onLeaveRoom();
                      }
                    }}
                    title="Leave Match"
                  >
                    🚪
                  </button>

                  <button
                    type="button"
                    className="sidebar-collapse-toggle"
                    onClick={() => setIsLogCollapsed(true)}
                    title="Collapse Panel"
                  >
                    <span className="toggle-symbol">▼</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {!isLogCollapsed && (
            <div className="sidebar-body-container">
              {activeSidebarTab === 'chat' ? (
                <ChatPanel
                  messages={chatMessages}
                  currentUserId={socketId}
                  onSendMessage={handleSendChatMessage}
                  onSendEmote={handleSendEmote}
                  emotes={EMOTE_LIST}
                />
              ) : (
                <>
                  <div className="sidebar-body">
                    {(roomState?.gameLog || []).map((entry, index) => {
                      const isLatest = index === (roomState?.gameLog?.length || 0) - 1;
                      return (
                        <div
                          key={index}
                          className={`log-item ${entry.type || 'play'} ${isLatest ? 'latest-entry' : ''}`}
                        >
                          <span className="log-icon">
                            {entry.type === 'uno' ? '🔥' : entry.type === 'penalty' ? '⚠️' : entry.type === 'draw' ? '📥' : '🃏'}
                          </span>
                          <span className="log-text">{entry.text}</span>
                        </div>
                      );
                    })}
                    <div ref={logEndRef} />
                  </div>

                  {/* Quick Emote Reactions Bar */}
                  <div className="emotes-bar">
                    {EMOTE_LIST.map((emote) => (
                      <button
                        key={emote}
                        type="button"
                        className="quick-emote-btn"
                        onClick={() => handleSendEmote(emote)}
                        title={`Send emote: ${emote}`}
                      >
                        {emote}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </aside>
      </section>

      {/* BOTTOM ZONE: Turn Feedback & Player's Cards */}
      <section className="bottom-controls-section" ref={handRef}>
        {/* Floating Invalid Move Notice */}
        {errorMessage && (
          <div className="floating-invalid-notice">
            <span className="notice-icon">⚠️</span>
            <span className="notice-text">{errorMessage}</span>
          </div>
        )}

        {/* Turn Status & Timer Bar */}
        <div className={`turn-bar ${isMyTurn ? 'is-my-turn-bar' : ''}`}>
          <div className="turn-message-content">
            <span className={`turn-status-badge ${isMyTurn ? 'status-green' : 'status-gray'}`}>
              {isMyTurn ? '🟢 YOUR TURN' : `⏳ ${currentTurnName.toUpperCase()}'S TURN`}
            </span>
            <span className="turn-guidance-text">
              {isMyTurn
                ? 'Play a matching color or number card, or draw from deck'
                : `Waiting for ${currentTurnName} to make a move...`}
            </span>
          </div>

          <div
            className={`turn-timer-badge ${
              timeLeft <= 5 ? 'critical' : timeLeft <= 10 ? 'warning' : ''
            }`}
            title="Time remaining for this turn"
          >
            ⏱️ {timeLeft}s
          </div>
        </div>

        {/* Player's Cards Row */}
        <div className="hand-container">
          <div className="cards-scroll-wrapper">
            {myHand.map((card, idx) => {
              const playable = checkCardIsPlayable(card);
              const isSelected = selectedCardId === card.id;
              const isNewlyDrawn = newlyDrawnCardId === card.id;
              const isInvalid = invalidCardId === card.id;

              return (
                <UnoCard
                  key={card.id || idx}
                  card={card}
                  isPlayable={playable}
                  isSelected={isSelected}
                  isNewlyDrawn={isNewlyDrawn}
                  isInvalidAttempt={isInvalid}
                  size="md"
                  onClick={(c, e) => handleCardClick(c, e)}
                />
              );
            })}
          </div>

          {/* UNO Shout Button (Prominent when holding 1 card) */}
          {myCardsCount === 1 && (
            <button
              type="button"
              className="uno-shout-button"
              onClick={handleShoutUno}
              title="Shout UNO before getting caught!"
              aria-label="Shout UNO"
            >
              UNO!
            </button>
          )}
        </div>
      </section>

      {/* Wild Color Selection Modal */}
      <ColorPickerModal
        isOpen={isColorPickerOpen}
        onSelectColor={handleColorSelected}
      />

      {/* Floating Chat Trigger Button for Mobile & Small Screens */}
      <button
        type="button"
        className={`mobile-chat-fab ${unreadChatCount > 0 ? 'has-unread' : ''}`}
        onClick={() => {
          setIsMobileChatOpen(true);
          setUnreadChatCount(0);
        }}
        aria-label="Open In-Game Chat"
        aria-expanded={isMobileChatOpen}
        title="Open Chat"
      >
        <span className="fab-icon">💬</span>
        <span className="fab-text">CHAT</span>
        {unreadChatCount > 0 && (
          <span className="fab-unread-count">{unreadChatCount}</span>
        )}
      </button>

      {/* Mobile Chat Drawer Modal */}
      {isMobileChatOpen && (
        <div
          className="mobile-chat-backdrop"
          onClick={() => setIsMobileChatOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Match Chat Drawer"
        >
          <div
            className="mobile-chat-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <ChatPanel
              messages={chatMessages}
              currentUserId={socketId}
              onSendMessage={handleSendChatMessage}
              onSendEmote={handleSendEmote}
              emotes={EMOTE_LIST}
              isMobile
              onClose={() => setIsMobileChatOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
