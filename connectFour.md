# ConnectFour.tsx — File Documentation

File path: `frontend/src/pages/ConnectFour.tsx`

---

## Overview

This file contains the entire Connect Four game UI, split into three React components and a main page component:

1. **`HistoryModal`** — pop-up that shows past match results for both players
2. **`Setup`** — the screen where players enter their names before the game starts
3. **`Board`** — renders the 6×7 grid and handles hover/click interactions
4. **`ConnectFour`** (default export) — the main component that owns all game state and orchestrates the others

The data flow is: **Setup → ConnectFour (state owner) → Board + HistoryModal**

---

## Constants

| Name | Value | Purpose |
|------|-------|---------|
| `ROWS` | `6` | Number of rows in the board |
| `COLS` | `7` | Number of columns in the board |

These are used to generate the board array and to render the grid layout.

---

## Utility Functions

### `resultColor(r: string)`
```ts
function resultColor(r: string): string
```
Returns a Tailwind CSS text color class based on a game result string:
- `'win'` → `'text-green-400'`
- `'loss'` → `'text-red-400'`
- anything else (draw) → `'text-yellow-400'`

Used inside `HistoryModal` to color-code each result in the history table.

---

### `fmtDate(d: string)`
```ts
function fmtDate(d: string): string
```
Converts an ISO date string (e.g. `"2026-05-20T14:30:00Z"`) into a short human-readable format like `"May 20, 26"`. Used in `HistoryModal` to display the date of each past match.

---

## Type

### `Players`
```ts
type Players = { p1: User; p2: User }
```
A simple shape that groups the two `User` objects for the current session. Player 1 is always **Red**, Player 2 is always **Yellow**.

---

## Component: `HistoryModal`

### Props
| Prop | Type | Purpose |
|------|------|---------|
| `players` | `Players` | The two players whose history will be fetched |
| `onClose` | `() => void` | Called when the modal should close |

### Local State
| Variable | Type | Initial | Purpose |
|----------|------|---------|---------|
| `h1` | `GameHistoryEntry[] \| null` | `null` | Match history for Player 1. `null` means still loading |
| `h2` | `GameHistoryEntry[] \| null` | `null` | Match history for Player 2. `null` means still loading |

### `loading` (derived)
```ts
const loading = h1 === null || h2 === null
```
True while either player's history hasn't arrived yet. Drives the loading message in the UI.

### `len` (derived)
```ts
const len = loading ? 0 : Math.max(h1.length, h2.length)
```
The number of table rows to render — whichever player has more entries determines the row count.

### `useEffect` — data fetch
Runs once when the modal mounts (and if player IDs change). Calls `gameHistoryApi.getByUser` for both players in parallel via `Promise.all`, then filters results to only Connect Four entries (`e.game?.name === 'Connect Four'`). On error, both lists default to `[]` so the UI shows "No matches."

### Rendering logic
- If loading → shows "Loading…"
- If `len === 0` → shows "No matches played yet."
- Otherwise → renders a table with one row per match. Each row shows: date, Player 1 result (Win/Loss/Draw), Player 2 result. A `—` is shown if one player has fewer entries than the other.

---

## Component: `Setup`

### Props
| Prop | Type | Purpose |
|------|------|---------|
| `onStart` | `(p1: User, p2: User) => void` | Called with both resolved `User` objects when setup succeeds |

### Local State
| Variable | Setter | Initial | Purpose |
|----------|--------|---------|---------|
| `name1` | `setName1` | `''` | Controlled input value for Player 1's name |
| `name2` | `setName2` | `''` | Controlled input value for Player 2's name |
| `loading` | `setLoading` | `false` | Disables the button and shows "Setting up…" while the API call is in flight |
| `error` | `setError` | `''` | Validation or API error message shown below the inputs |

### `handleStart()` — the key function
This is an `async` function triggered by the "Start Game" button (or Enter key on the second input).

**Flow:**
1. Trims both names (`n1`, `n2`)
2. Validates: both must be non-empty, and they must be different — sets `error` and returns early if not
3. Sets `loading = true`, clears `error`
4. Calls `usersApi.getOrCreate(n1)` and `usersApi.getOrCreate(n2)` **in parallel** via `Promise.all`
   - `getOrCreate` either finds an existing user by username in the database or creates a new one, returning a `User` object with an `id` and `username`
5. Calls `onStart(p1, p2)` — this is where the `User` objects (with their database IDs) are passed up to `ConnectFour`
6. On failure: shows an error message and re-enables the button

**This is where names become database-backed `User` records.** From this point on the app works with `user.id` and `user.username`, not raw strings.

---

## Component: `Board`

### Props
| Prop | Type | Purpose |
|------|------|---------|
| `board` | `(string \| null)[]` | Flat array of 42 cells (`ROWS × COLS`). Each cell is `'R'`, `'Y'`, or `null` |
| `winningCells` | `number[]` | Indices of the 4 winning cells — they get a white ring and scale-up effect |
| `onColClick` | `(col: number) => void` | Called with the column index when a cell is clicked |
| `disabled` | `boolean` | Prevents interaction when it's loading or the game is over |
| `currentPlayer` | `'R' \| 'Y'` | Used to color the hover indicator above each column |

### Local State
| Variable | Setter | Initial | Purpose |
|----------|--------|---------|---------|
| `hoveredCol` | `setHoveredCol` | `null` | Tracks which column the cursor is over for the drop preview |

### Rendering logic
The board is rendered as a CSS grid of `ROWS × COLS = 42` circular buttons. The index formula `i = row * COLS + col` maps 2D coordinates to the flat array.

Each cell's color:
- **Winning cell** → bright red (`#f87171`) or bright yellow (`#fde047`) + white ring
- **Red piece** → `#ef4444`
- **Yellow piece** → `#facc15`
- **Empty** → dark blue (`#1e3a8a`, the board color)

Above the grid, a row of small colored circles shows a preview dot over the hovered column, matching the current player's color.

---

## Component: `ConnectFour` (Main / Default Export)

This is the page-level component. It owns all game state and coordinates the other components.

### State Variables

| Variable | Setter | Initial | Purpose |
|----------|--------|---------|---------|
| `players` | `setPlayers` | `undefined` | The two `User` objects. `undefined` means Setup screen hasn't completed yet |
| `session` | `setSession` | `null` | The current game session from the API. Contains `board`, `currentPlayer`, `winner`, `isDraw`, `winningCells` |
| `score` | `setScore` | `{ p1: 0, p2: 0 }` | **Session score** — counts wins for each player during the current play session. Resets to `0–0` every time `startGame` is called (new session), but persists across "Play Again" resets |
| `loading` | `setLoading` | `false` | True while any API call is in flight. Disables the board |
| `resultSaved` | `setResultSaved` | `false` | Guards against saving the same game result twice if the component re-renders |
| `apiError` | `setApiError` | `''` | Displays backend errors in the UI |
| `showHistory` | `setShowHistory` | `false` | Controls whether `HistoryModal` is rendered |

### Derived Value

```ts
const isOver = !!(session?.winner || session?.isDraw)
```
True when the game has ended. Used to disable the board and show the "Play Again" button.

---

### Functions

#### `startGame(p1: User, p2: User)`
```ts
const startGame = useCallback(async (p1: User, p2: User) => { ... }, [])
```
Called by `Setup` when both players are resolved.

**Flow:**
1. Saves `{ p1, p2 }` to `players` state
2. **Resets `score` to `{ p1: 0, p2: 0 }`** — a brand new session starts at 0–0
3. Calls `connectFourApi.createGame()` to get a fresh session from the backend
4. Saves the returned session to `session` state
5. Sets `resultSaved = false`

---

#### `handleColClick(col: number)`
```ts
const handleColClick = useCallback(async (col: number) => { ... }, [session, isOver, loading, players, resultSaved])
```
Called when the user clicks a column on the board.

**Flow:**
1. Guards: returns early if no session, game is over, loading, or no players
2. Calls `connectFourApi.dropPiece(session.id, col, session.currentPlayer)` — the backend places the piece in the lowest available row of `col` and returns the updated session
3. Updates `session` with the new state

**If the game just ended** (`updated.winner` or `updated.isDraw`) and `resultSaved` is still `false`:

| Outcome | Score update | API calls |
|---------|-------------|-----------|
| `winner === 'R'` | `score.p1 + 1` | P1 = win, P2 = loss |
| `winner === 'Y'` | `score.p2 + 1` | P1 = loss, P2 = win |
| draw | none | P1 = draw, P2 = draw |

The save calls use `connectFourApi.saveResult(sessionId, userId, result, board)`.

Sets `resultSaved = true` to prevent duplicate saves.

**This is where the score increments** — it is purely local (in-memory for the session) and happens the moment the backend confirms a winner.

---

#### `resetGame()`
```ts
const resetGame = useCallback(async () => { ... }, [])
```
Called by the "Play Again" button.

**Flow:**
1. Calls `connectFourApi.createGame()` to get a fresh board from the backend
2. Sets `session` to the new session
3. Sets `resultSaved = false`

Note: **score is NOT reset here** — it persists across rounds so players can see the running tally (e.g. 2–1) across multiple games in the same session.

---

### Derived UI Values (inside render)

```ts
const playerName = (marker: string) => marker === 'R' ? players.p1.username : players.p2.username
const playerColor = (marker: string) => marker === 'R' ? 'Red' : 'Yellow'
```
Helper closures that convert a board marker (`'R'` or `'Y'`) to a display name or color label. Used in `statusText`.

```ts
const statusText = session.winner
  ? `${playerName(session.winner)} (${playerColor(session.winner)}) wins!`
  : session.isDraw
  ? "It's a draw!"
  : `${playerName(session.currentPlayer)}'s turn`
```
The main status line shown above the board.

```ts
const statusColor = ...
```
A Tailwind class string that colors the status banner: red background for Red's turn/win, yellow for Yellow's, gray for draw.

---

## Data Flow Summary

```
User types names
      │
      ▼
Setup.handleStart()
  → usersApi.getOrCreate(name1, name2)   ← creates/fetches User records in DB
  → onStart(p1, p2)                      ← passes User objects up to ConnectFour
      │
      ▼
ConnectFour.startGame(p1, p2)
  → sets players state (User objects with .id and .username)
  → resets score to { p1: 0, p2: 0 }
  → connectFourApi.createGame()           ← backend creates a new session
  → sets session state
      │
      ▼
Player clicks a column
      │
      ▼
ConnectFour.handleColClick(col)
  → connectFourApi.dropPiece(sessionId, col, currentPlayer)
  → backend validates move, updates board, detects win/draw
  → session state updated (new board, currentPlayer flips, maybe winner set)
      │
      ├─ game still going → board re-renders, other player's turn
      │
      └─ game over
           → score.p1++ or score.p2++ (in memory)
           → connectFourApi.saveResult() × 2 (win+loss or draw+draw)   ← persists to DB
           → resultSaved = true
           → "Play Again" button appears
                │
                ▼
            ConnectFour.resetGame()
              → connectFourApi.createGame()   ← fresh board, same players, score unchanged
```

---

## Score vs. History — Key Distinction

| | Session Score (`score` state) | Match History (`GameHistoryEntry`) |
|-|-------------------------------|------------------------------------|
| **Where stored** | React state — lives in memory | Database via `gameHistoryApi` |
| **Scope** | Current browser session only | Permanent, across all sessions |
| **Resets when** | `startGame()` is called (new player names) | Never (append-only) |
| **Persists across** | Multiple "Play Again" rounds | Page refreshes, future sessions |
| **Shown in** | Score banner (`2 — 1`) | History modal table |

The session score answers "who's winning right now in this sitting." The history answers "what's their all-time record."

---

## API Calls Summary

| Function | API Call | When |
|----------|----------|------|
| `Setup.handleStart` | `usersApi.getOrCreate(name)` × 2 | Before the first game |
| `startGame` | `connectFourApi.createGame()` | When players are confirmed |
| `handleColClick` | `connectFourApi.dropPiece(id, col, player)` | Every turn |
| `handleColClick` (on end) | `connectFourApi.saveResult(id, userId, result, board)` × 2 | Once per game end |
| `resetGame` | `connectFourApi.createGame()` | "Play Again" |
| `HistoryModal useEffect` | `gameHistoryApi.getByUser(id)` × 2 | When modal opens |
