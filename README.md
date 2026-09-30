# UNO ARENA — REAL-TIME MULTIPLAYER CARD GAME

> **PLAY. MATCH. SHOUT UNO.**

UNO ARENA is a modern, high-performance, real-time multiplayer web card game built from the ground up with **React + Vite**, **Node.js + Express**, and **Socket.IO**. Designed with a dark gaming aesthetic and vibrant functional UNO-inspired accents, it delivers authentic card game mechanics, server-authoritative multiplayer security, synchronized turn timers, rich micro-interactions, spatial audio synthesis, chat, emotes, and an interactive tutorial onboarding system.

---

## 🎮 Features by Phase

### Phase 1 — Technical Architecture & Engine Foundation
- **Modern Full-Stack Setup**: React 18, Vite 5, Node.js, Express, Socket.IO 4.
- **Pure JavaScript Game Engine**: 9 standalone mathematical & logical game modules (`createDeck`, `shuffleDeck`, `dealCards`, `isValidMove`, `playCard`, `drawCard`, `nextTurn`, `calculateScore`, `checkWinner`, `reshuffleDiscard`).
- **REST Diagnostics**: `/api/health` providing live service status.
- **Real-Time Handshake**: Socket.IO connection acknowledgement and ping/pong diagnostics.

### Phase 2 — Premium UI & Room Management
- **Original Dark Gaming Identity**: Dominated by deep background `#0B0B0F`, dark glass panels `#17171C`, and functional neon accents (`#FF3B30`, `#FFD60A`, `#30D158`, `#0A84FF`).
- **6-Character Room Codes**: Cryptographically sound, collision-free uppercase room codes (e.g. `A7K9XZ`).
- **One-Click Sharing**: Instant clipboard copy feedback and Web Share API integration.
- **Live Multiplayer Lobby**: Real-time player slot tracking, customizable emoji avatars, host crown badges, ready toggles, and empty slot placeholders.
- **Host Transfer**: Automatic promotion of the longest-connected contender upon host disconnect.

### Phase 3 — Authoritative Game Engine & Table Arena
- **Server Authoritative State**: All move validation, card drawing, discard reshuffling, and turn progression are strictly enforced by the server. Clients cannot alter game state.
- **Private Card Security**: Zero client hand leakage. Clients only receive their own hand array and other players' card counts.
- **Complete Action Cards**:
  - **Skip (⊘)**: Bypasses the next player in rotation.
  - **Reverse (⇄)**: Inverts rotation direction (in 2-player mode, acts as a Skip).
  - **Draw Two (+2)**: Deals 2 penalty cards to the next player and skips their turn.
  - **Wild (★)**: Allows choice of Red, Blue, Green, or Yellow via a color selector modal.
  - **Wild Draw Four (+4)**: Sets active color, forces victim to draw 4 cards, and skips their turn.
- **Smart Micro-Interactions**: Hover lift, playable card glow pulses, and active turn highlights.
- **Game Log**: Live activity log tracking every card play, draw, action card, and shout.

### Phase 4 — UNO Shouting, Scoring & Rematch Loop
- **Authoritative UNO Calling**: Prominent UNO shout button when holding 1 card. False shout penalties apply (+2 cards).
- **Penalty Catching**: Contenders can catch an opponent who reaches 1 card without shouting UNO to inflict a +2 penalty.
- **Authentic Tournament Scoring**: Winner receives points from all cards remaining in opponent hands:
  - Number Cards (0–9): Face value
  - Action Cards (Skip, Reverse, Draw Two): 20 points
  - Wild & Wild Draw Four: 50 points
- **Rematch Loop**: Complete round reset (deck, hands, turns, discard) while preserving cumulative match points.

### Phase 5 — Chat, Emotes, Turn Timer & Sound
- **Authoritative Turn Timer**: 30s countdown with warning at 10s and pulse at 5s. Auto-draws card on expiration.
- **Zero-Dependency Sound Manager**: Synthesizes pure Web Audio API tones for plays, draws, turn starts, UNO shouts, timers, and victories without external audio file latency.
- **Emotes System**: Whitelisted floating reactions (`😂`, `😎`, `🔥`, `😱`, `👏`, `😈`, `🤯`, `💀`, `❤️`, `👀`).
- **In-Game Chat**: Max 200 chars, HTML-sanitized, and rate-limited to 5 messages per 5 seconds.
- **Settings Modal**: Persistent toggles for sound, animations, turn timer (15s/30s/45s/60s/Off), and reduced motion.

### Phase 6 — Tutorial, Profile & Accessibility
- **Interactive Onboarding**: 6-step beginner-friendly tutorial walkthrough with Next, Previous, Skip, and Finish.
- **Contender Profile**: Tracks lifetime victories, win rate %, total points, and unlockable achievement badges.
- **Full Responsiveness**: Adaptive layouts for desktop, tablet, and mobile with >=44px touch targets.
- **Accessibility**: High-contrast text, semantic markup, keyboard focus rings, and `prefers-reduced-motion` compliance.

---

## 🏗️ Architecture & Folder Structure

```text
UNO/
├── package.json                   # Root workspace scripts & module definition
├── PROJECT_STATUS.md              # 7-phase progress tracker
├── README.md                      # Complete system documentation
├── shared/
│   └── constants/
│       ├── cardConstants.js       # Card colors, types, values, points & limits
│       ├── socketEvents.js        # Standardized Socket.IO event names
│       └── index.js
├── backend/
│   ├── server.js                  # Express & Socket.IO server entry point
│   ├── package.json
│   └── src/
│       ├── config/index.js        # Environment config
│       ├── utils/logger.js        # Structured console logger
│       ├── rooms/
│       │   ├── roomManager.js     # Authoritative room store & sanitization
│       │   └── roomManager.test.js
│       ├── game/
│       │   ├── deck.js            # Deck generator, Fisher-Yates shuffle, draw
│       │   ├── rules.js           # Play rules, action card effects, turn engine
│       │   ├── scoring.js         # Point calculators
│       │   ├── index.js           # Engine exports
│       │   ├── gameEngine.test.js
│       │   ├── gameFlow.test.js
│       │   └── fullSystem.test.js
│       └── socket/
│           ├── socketHandler.js   # Real-time event lifecycle handlers
│           └── socketIntegration.test.js
└── frontend/
    ├── index.html                 # HTML shell with SVG favicon
    ├── package.json
    ├── vite.config.js             # Vite configuration
    └── src/
        ├── main.jsx               # React entry point
        ├── App.jsx                # Route coordinator & global modal hub
        ├── App.css
        ├── styles/
        │   ├── variables.css      # Design tokens (#0B0B0F, #FF3B30, #FFD60A, etc.)
        │   └── global.css
        ├── services/
        │   ├── socketService.js   # Socket.IO client singleton
        │   └── soundManager.js    # Web Audio API sound synthesizers
        ├── hooks/
        │   └── useSocket.js       # React socket lifecycle hook
        ├── utils/
        │   └── helpers.js         # Room code & card formatting helpers
        ├── components/
        │   ├── common/
        │   │   ├── Button.jsx & .css
        │   │   ├── Card.jsx & .css
        │   │   ├── Modal.jsx & .css
        │   │   ├── ConnectionBadge.jsx & .css
        │   │   ├── SettingsModal.jsx & .css
        │   │   ├── TutorialModal.jsx & .css
        │   │   └── ProfileModal.jsx & .css
        │   ├── layout/
        │   │   ├── Header.jsx & .css
        │   │   └── BackgroundCards.jsx & .css
        │   └── game/
        │       ├── UnoCard.jsx & .css
        │       └── ColorPickerModal.jsx & .css
        └── pages/
            ├── LandingPage.jsx & .css
            ├── CreateRoomPage.jsx & RoomPages.css
            ├── JoinRoomPage.jsx
            ├── LobbyPage.jsx
            ├── GamePage.jsx & .css
            └── ResultPage.jsx & .css
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### 2. Environment Variables
Create a `.env` file in the root or `backend` folder:
```env
PORT=5000
FRONTEND_PORT=5173
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
NODE_ENV=development
```

### 3. Installation
Install all dependencies across both client and server:
```bash
npm run install:all
```

### 4. Running Backend Server
```bash
npm run dev:backend
# Or: node backend/server.js
# Backend listening on http://localhost:5000
# REST health check available at http://localhost:5000/api/health
```

### 5. Running Frontend
```bash
npm run dev:frontend
# App accessible at http://localhost:5173
```

---

## 🧪 Automated Test Suites
Run the automated verification suites:

1. **Core Game Engine Foundation (9 modules)**:
   ```bash
   node backend/src/game/gameEngine.test.js
   ```

2. **Room Management & State Sanitization (Security)**:
   ```bash
   node backend/src/rooms/roomManager.test.js
   ```

3. **Socket.IO Real-Time Integration**:
   ```bash
   node backend/src/socket/socketIntegration.test.js
   ```

4. **Game Flow, Action Cards, UNO & Scoring**:
   ```bash
   node backend/src/game/gameFlow.test.js
   ```

5. **Complete 7-Phase System Suite**:
   ```bash
   node backend/src/game/fullSystem.test.js
   ```

---

## 📡 Socket.IO Real-Time Protocol

| Event Name | Direction | Description |
|---|---|---|
| `createRoom` | Client ➔ Server | Request room creation with player name & avatar |
| `roomCreated` | Server ➔ Client | Returns initial sanitized room state |
| `joinRoom` | Client ➔ Server | Request to join via 6-character room code |
| `roomJoined` | Server ➔ Client | Confirms join and transmits sanitized room state |
| `setReady` | Client ➔ Server | Toggles contender ready status in lobby |
| `playerJoined` | Server ➔ Broadcast | Informs room of a new contender |
| `playerLeft` | Server ➔ Broadcast | Informs room of contender disconnect |
| `hostChanged` | Server ➔ Broadcast | Informs room of new authoritative room host |
| `roomState` | Server ➔ Client | Broadcasts sanitized room state (individual hands) |
| `startGame` | Client ➔ Server | Host launches match (requires 2+ ready players) |
| `gameStarted` | Server ➔ Broadcast | Signals transition to active table view |
| `playCard` | Client ➔ Server | Attempts card play with cardId and optional chosenColor |
| `cardPlayed` | Server ➔ Broadcast | Animates card play and special action triggers |
| `drawCard` | Client ➔ Server | Draws a card from deck on player's turn |
| `cardDrawn` | Server ➔ Broadcast | Animates draw deck action |
| `callUno` | Client ➔ Server | Shouts UNO when holding 1 card |
| `unoCalled` | Server ➔ Broadcast | Broadcasts dramatic UNO shout animation |
| `unoPenalty` | Client / Server | Enforces +2 penalty for false UNO or uncaught 1 card |
| `roundEnded` | Server ➔ Broadcast | Broadcasts round winner, scores, and scoreboard |
| `rematchRequest` | Client ➔ Server | Player signals ready for rematch |
| `rematchStarted` | Server ➔ Broadcast | Resets game deck & hands, preserving cumulative points |
| `sendChatMessage` | Client ➔ Server | Sends chat message (max 200 chars, rate-limited) |
| `chatMessage` | Server ➔ Broadcast | Distributes sanitized chat message |
| `sendEmote` | Client ➔ Server | Sends whitelisted emoji reaction |
| `playerEmote` | Server ➔ Broadcast | Displays floating reaction on game table |

---

## 🔒 Security & Anti-Cheat Hardening

1. **Private Hand Concealment**: Opponent card IDs, values, and colors are completely omitted from room state broadcasts. Opponents only ever see integer `cardsCount`.
2. **Turn Validation**: Clients cannot play or draw out of turn.
3. **Move Validation**: Color and symbol matching are verified against server-authoritative discard state.
4. **Color Selection Validation**: Wild chosen colors are constrained strictly to `red`, `blue`, `green`, `yellow`.
5. **Rate Limiting**: Socket chat input is rate-limited to 5 messages per 5 seconds per socket.
6. **Input Sanitization**: Room codes are stripped of invalid symbols and truncated to 6 characters. Names and chat messages have HTML tags stripped.

---

## ♿ Accessibility & Performance

- **Reduced Motion**: Respects `prefers-reduced-motion: reduce` across background cards, card hover lifts, banners, and floating emotes.
- **Touch Targets**: All interactive elements (cards, buttons, modal controls) maintain minimum 44px touch boundaries.
- **Contrast**: Full compliance with WCAG AA standards using `#FFFFFF` and `#A1A1AA` against `#0B0B0F` and `#17171C`.
- **Keyboard Navigation**: Buttons and playable cards are accessible via `Tab` and `Enter`.
- **Zero Audio Latency**: Pure Web Audio API synthesis eliminates network requests for audio files.

---

## 🎬 College Presentation Demo Flow

1. **Open UNO ARENA**: Open `http://localhost:5173` in Browser 1. Show the animated landing page with floating cards and design tokens.
2. **Open How to Play**: Click `HOW TO PLAY` or the `📖` header icon to demonstrate the 6-step interactive tutorial.
3. **Open Settings**: Click `⚙️` to demonstrate audio, animation, timer, and reduced-motion controls.
4. **Host Creates Room**: Enter name "Alice", choose avatar 🦁, click `CREATE ROOM`. Note the 6-character room code (e.g. `WXFJE2`).
5. **Second Contender Joins**: Open an Incognito window or second browser. Click `JOIN ROOM`, enter room code, name "Bob", choose avatar 🦊.
6. **Live Lobby Sync**: Show both browser windows side-by-side. Bob clicks `READY UP` — watch Alice's screen instantly update with the green `✓ READY` badge.
7. **Launch Match**: Alice (Host) clicks `START GAME`. Both windows seamlessly transition to the game table.
8. **Gameplay**: Play matching cards, demonstrate hover lifts, active color glow on felt, and turn timer countdown.
9. **Action Cards**: Play a Skip or Reverse card — observe direction indicator rotation and banner feedback.
10. **Draw Cards**: Click the draw deck to draw a card and pass turn.
11. **Call UNO**: When holding 1 card, press the pulsating `UNO!` button.
12. **Victory Celebration**: Empty hand — observe victory screen, gold trophy, fanfare sound, and scoreboard points calculation.
13. **Rematch**: Click `Rematch` to reset the round and play again with cumulative points preserved.
