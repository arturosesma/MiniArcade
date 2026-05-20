# TicTacToe.tsx — Full Documentation

File path: `frontend/src/pages/TicTacToe.tsx`
Backend: `backend/src/tic-tac-toe/`

---

## Overview

Tic Tac Toe is a two-player game. The file is structured into four components:

1. **`HistoryModal`** — pop-up showing past match results for both players
2. **`Setup`** — name entry screen before the game begins
3. **`Board`** — renders the 3×3 grid of clickable cells
4. **`TicTacToe`** (default export) — main page component that owns all state

**Key difference from ConnectFour:** winning cell detection happens on the **frontend** using `getWinningCells()` against the board array. The backend only sets `session.winner`; it does not return which cells won.

---

## Constants

| Name | Value | Purpose |
|------|-------|---------|
| `WINNING_LINES` | 8 arrays of 3 indices | All possible winning combinations on a 3×3 board |

```
Rows:       [0,1,2]  [3,4,5]  [6,7,8]
Columns:    [0,3,6]  [1,4,7]  [2,5,8]
Diagonals:  [0,4,8]  [2,4,6]
```

The same `WINNING_LINES` array is also defined inside `tic-tac-toe.service.ts` on the backend — both sides independently check for a winner.

---

## Types

### `Cell`
```ts
type Cell = string | null
```
Represents one square on the board: `'X'`, `'O'`, or `null` (empty).

### `Players`
```ts
type Players = { p1: User; p2: User }
```
Groups the two resolved `User` objects. Player 1 is always **X**, Player 2 is always **O**.

---

## Utility Functions

### `getWinningCells(board: Cell[]): number[]`
Iterates through `WINNING_LINES` and returns the three indices of the winning line, or `[]` if no winner yet. This is called in the main component render:

```ts
const winningCells = session ? getWinningCells(session.board) : []
```

The result is passed directly to `Board` to highlight the winning squares visually.

### `resultColor(r: string): string`
Returns a Tailwind text-color class based on result string. Used in `HistoryModal`.
- `'win'` → `'text-green-400'`
- `'loss'` → `'text-red-400'`
- anything else → `'text-yellow-400'`

### `fmtDate(d: string): string`
Formats an ISO timestamp to a short readable date (e.g. `"May 20, 26"`). Used in `HistoryModal`.

---

## Component: `HistoryModal`

### Props
| Prop | Type | Purpose |
|------|------|---------|
| `players` | `Players` | Both users whose history will be fetched |
| `onClose` | `() => void` | Closes the modal |

### Local State
| Variable | Type | Initial | Purpose |
|----------|------|---------|---------|
| `h1` | `GameHistoryEntry[] \| null` | `null` | Match history for Player 1. `null` = loading |
| `h2` | `GameHistoryEntry[] \| null` | `null` | Match history for Player 2. `null` = loading |

### `useEffect` — fetch on mount
Calls `gameHistoryApi.getByUser(id)` for both players in parallel. Filters each result to entries where `e.game?.name === 'Tic Tac Toe'`. On error both lists default to `[]`.

### Rendering
- `loading` = `h1 === null || h2 === null`
- `len` = `Math.max(h1.length, h2.length)` — determines table row count
- Table columns: Date | Player 1 (X) | Player 2 (O)
- A `—` placeholder appears when one player has fewer history entries than the other

---

## Component: `Setup`

### Props
| Prop | Type | Purpose |
|------|------|---------|
| `onStart` | `(p1: User, p2: User) => void` | Called when both users are resolved from the API |

### Local State
| Variable | Setter | Initial | Purpose |
|----------|--------|---------|---------|
| `name1` | `setName1` | `''` | Controlled input for Player 1's name |
| `name2` | `setName2` | `''` | Controlled input for Player 2's name |
| `loading` | `setLoading` | `false` | Disables the button while the API call is pending |
| `error` | `setError` | `''` | Validation or network error shown in the UI |

### `handleStart()` — async
1. Trims both names
2. Validates: both must be non-empty and different — early return with error if not
3. Calls `usersApi.getOrCreate(n1)` and `usersApi.getOrCreate(n2)` **in parallel**
4. Passes resolved `User` objects to `onStart(p1, p2)`
5. On failure: shows error and re-enables button

`usersApi.getOrCreate` first tries `GET /users/username/:name`. If the user does not exist (404), it falls back to `POST /users` with `email = "${name}@games.local"`. This is where raw name strings become database-backed `User` records with `.id` fields used in all subsequent API calls.

---

## Component: `Board`

### Props
| Prop | Type | Purpose |
|------|------|---------|
| `board` | `Cell[]` | Flat array of 9 cells |
| `winningCells` | `number[]` | Indices of winning cells — get highlighted indigo |
| `onCellClick` | `(index: number) => void` | Called with cell index on click |
| `disabled` | `boolean` | Disables all buttons when loading or game is over |

### Rendering
9 buttons in a 3×3 CSS grid. Each button is disabled if `disabled` is true OR the cell is already filled.

Cell appearance:
- **Winning cell** → indigo background + scale-105
- **Filled, non-winning** → gray-700 background, no hover
- **Empty, interactive** → gray-800 background, hover to gray-700
- **Empty, disabled** → gray-800, 50% opacity

No hover preview column indicator (unlike Connect Four) — the cell directly receives the click.

---

## Component: `TicTacToe` (Main / Default Export)

### State Variables

| Variable | Setter | Initial | Purpose |
|----------|--------|---------|---------|
| `players` | `setPlayers` | `undefined` | The two `User` objects. `undefined` = Setup screen |
| `session` | `setSession` | `null` | Current game session from the backend API |
| `score` | `setScore` | `{ p1: 0, p2: 0 }` | Session win tally. Resets on `startGame`, persists across "Play Again" |
| `loading` | `setLoading` | `false` | True during any API call. Disables the board |
| `resultSaved` | `setResultSaved` | `false` | Guards against double-saving the same game result |
| `apiError` | `setApiError` | `''` | Backend error shown in the UI |
| `showHistory` | `setShowHistory` | `false` | Controls whether `HistoryModal` is mounted |

### Derived Values

```ts
const winningCells = session ? getWinningCells(session.board) : []
```
Computed locally every render from the board state. Not returned by the API.

```ts
const isOver = !!(session?.winner || session?.isDraw)
```
True when the game has ended. Disables the board and shows "Play Again".

---

### Functions

#### `startGame(p1: User, p2: User)`
```ts
const startGame = useCallback(async (p1: User, p2: User) => { ... }, [])
```
Called by `Setup.onStart`.

1. Saves `{ p1, p2 }` to `players`
2. **Resets score to `{ p1: 0, p2: 0 }`** — new session starts at 0–0
3. Calls `POST /tic-tac-toe/games` → gets a fresh `TicTacToeSession`
4. Saves session, sets `resultSaved = false`

---

#### `handleCellClick(index: number)`
```ts
const handleCellClick = useCallback(async (index: number) => { ... }, [session, isOver, loading, players, resultSaved])
```
Called when a board cell is clicked.

1. Guards: returns early if no session, game over, loading, or no players
2. Calls `POST /tic-tac-toe/games/:id/move` with `{ position: index, player: session.currentPlayer }`
3. Backend validates the move, places the piece, checks for a winner, and returns the updated session
4. Frontend updates `session` state

**If the game just ended** and `resultSaved` is false:

| Outcome | Score update | API saves |
|---------|-------------|-----------|
| `winner === 'X'` | `score.p1 + 1` | P1 = win, P2 = loss |
| `winner === 'O'` | `score.p2 + 1` | P1 = loss, P2 = win |
| draw | none | P1 = draw, P2 = draw |

Both saves happen via `POST /tic-tac-toe/games/:id/save` in parallel. Sets `resultSaved = true` after.

---

#### `resetGame()`
```ts
const resetGame = useCallback(async () => { ... }, [session])
```
Called by "Play Again".

1. Calls `POST /tic-tac-toe/games` → fresh session
2. Sets new session, sets `resultSaved = false`
3. **Score is NOT reset** — the running tally (e.g. 2–1) persists across rounds

---

### Derived UI Values (inside render)

```ts
const playerName = (marker: string) => marker === 'X' ? players.p1.username : players.p2.username
```
Converts a board marker to a display name. Used in `statusText`.

```ts
const statusText = session.winner
  ? `${playerName(session.winner)} wins!`
  : session.isDraw
  ? "It's a draw!"
  : `${playerName(session.currentPlayer)}'s turn`
```

Status banner color: indigo on win, yellow on draw, neutral gray during play.

---

## Backend: TicTacToe Module

### HTTP Endpoints (`/tic-tac-toe`)

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/games` | Create a new game session |
| `GET` | `/games/:id` | Get current session state |
| `POST` | `/games/:id/move` | Make a move |
| `POST` | `/games/:id/save` | Persist the game result to the database |

### DTOs

**`MakeMoveDto`**
```ts
{ position: number, player: 'X' | 'O' }
```

**`SaveResultDto`**
```ts
{ userId: number, result: 'win' | 'loss' | 'draw', boardState: (string | null)[] }
```

### `TicTacToeService`

#### Session storage
```ts
private sessions = new Map<string, TicTacToeSession>()
```
Sessions live **in memory** (a `Map`). They are never persisted to the database. A server restart wipes all active sessions. This is intentional for a local dev / casual game setup.

#### `createGame(): TicTacToeSession`
- Generates a UUID with `crypto.randomUUID()`
- Creates a session: `board = Array(9).fill(null)`, `currentPlayer = 'X'`, `winner = null`, `isDraw = false`
- Stores it in `sessions` and returns it

#### `makeMove(sessionId, dto): TicTacToeSession`
Validates in order, throwing `BadRequestException` on failure:
1. Session exists
2. Game is not already over
3. `dto.player === session.currentPlayer` (correct turn)
4. `dto.position` is in range 0–8
5. Cell at `position` is empty

Then:
- Places piece: `session.board[position] = player`
- Calls `checkWinner(board)`
- If no winner and board is full → `isDraw = true`
- If no winner and board not full → flips `currentPlayer` (`X` ↔ `O`)
- Returns updated session

#### `checkWinner(board): string | null`
Iterates `WINNING_LINES`. Returns `'X'` or `'O'` when three matching non-null cells align, or `null`.

#### `saveResult(sessionId, dto): Promise<void>`
1. Calls `gamesService.findByName('Tic Tac Toe')` — looks up the game record
2. If not found, calls `gamesService.create(...)` to auto-create it (self-seeding)
3. Calls `gameHistoryService.create(...)` to write a `game_history` row
4. **Only if `result === 'win'`**: calls `scoresService.create({ score: 1 })` to write a `scores` row

Note: draws and losses do **not** create a score row.

#### `getSession(sessionId): TicTacToeSession`
Returns the session from the Map, or throws `NotFoundException`.

---

## Database Structure

All four tables are shared across all games in the monorepo (Tic Tac Toe, Connect Four, Hangman).

### Table: `users`
| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | `INT` | PK, auto-increment | Unique user identifier |
| `username` | `VARCHAR` | UNIQUE, NOT NULL | The display name players type in |
| `email` | `VARCHAR` | UNIQUE, NOT NULL | Auto-generated as `{name}@games.local` when created via `getOrCreate` |
| `createdAt` | `DATETIME` | auto (`CreateDateColumn`) | When the user was first created |

Relations: one user → many `scores`, many `game_history` rows.

### Table: `games`
| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | `INT` | PK, auto-increment | Unique game type identifier |
| `name` | `VARCHAR` | UNIQUE, NOT NULL | e.g. `'Tic Tac Toe'` — used by `findByName` in `saveResult` |
| `description` | `TEXT` | nullable | Human-readable description, set when auto-created |

This table acts as a **registry** for game types. Rows are created lazily the first time `saveResult` is called for each game. You will see exactly one row per game type (`'Tic Tac Toe'`, `'Connect Four'`, `'Hangman'`) once each game has been played at least once.

### Table: `game_history`
| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | `INT` | PK, auto-increment | Unique record identifier |
| `userId` | `INT` | FK → `users.id` | Which player this result belongs to |
| `gameId` | `INT` | FK → `games.id` | Which game type this result is for |
| `result` | `VARCHAR(10)` | `'win' \| 'loss' \| 'draw'` | The outcome for this specific player |
| `boardState` | `JSON` | NOT NULL | Snapshot of the board at game end |
| `createdAt` | `DATETIME` | auto | When the result was saved |

One game produces **two rows** — one per player. For a Tic Tac Toe game:
- Player X wins → row: `(userId=X, result='win')` + row: `(userId=O, result='loss')`

### Table: `scores`
| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | `INT` | PK, auto-increment | Unique score record |
| `userId` | `INT` | FK → `users.id` | Which player earned the score |
| `gameId` | `INT` | FK → `games.id` | Which game type |
| `score` | `INT` | NOT NULL | Always `1` per win (no weighting) |
| `createdAt` | `DATETIME` | auto | When the score was recorded |

Only wins create a row here. Draws and losses leave no score record. The total score for a player in a game is the count (or sum) of their rows in this table.

### Entity Relationships Diagram

```
users
  │
  ├──< game_history >──┐
  │                    │
  └──< scores >────────┤
                       │
                     games
```

---

## Full Data Flow

```
Player types names
      │
      ▼
Setup.handleStart()
  → usersApi.getOrCreate(n1), getOrCreate(n2)   [parallel]
      ├─ GET /users/username/:name  → found → return User
      └─ 404 → POST /users { username, email: "name@games.local" } → create & return User
  → onStart(p1, p2)
      │
      ▼
TicTacToe.startGame(p1, p2)
  → setPlayers({ p1, p2 })
  → setScore({ p1: 0, p2: 0 })              ← reset to 0–0
  → POST /tic-tac-toe/games                 ← backend creates in-memory session
  → setSession(freshSession)
      │
      ▼
Player clicks a cell
      │
      ▼
handleCellClick(index)
  → POST /tic-tac-toe/games/:id/move { position: index, player: currentPlayer }
      │  Backend: validate → place piece → checkWinner → flip turn
      ▼
  setSession(updatedSession)
      │
      ├─ game still going → board re-renders, other player's turn
      │
      └─ game over (winner or isDraw)
           → Frontend: getWinningCells(board) highlights winning squares
           → score.p1++ or score.p2++ (in React state)
           → POST /tic-tac-toe/games/:id/save { userId: p1.id, result, boardState }
           → POST /tic-tac-toe/games/:id/save { userId: p2.id, result, boardState }  [parallel]
               │  Backend saveResult:
               │    findByName('Tic Tac Toe') or create game row
               │    gameHistoryService.create(...)  → INSERT game_history
               │    if win: scoresService.create({ score: 1 })  → INSERT scores
           → resultSaved = true
           → "Play Again" button appears
                │
                ▼
           resetGame()
             → POST /tic-tac-toe/games   ← fresh session, score unchanged
```

---

## Score vs. History — Key Distinction

| | Session Score (`score` state) | Match History (`game_history` table) |
|-|-------------------------------|--------------------------------------|
| **Where stored** | React state, in memory | MySQL via TypeORM |
| **Scope** | Current browser session only | Permanent, all time |
| **Resets when** | `startGame()` called (new names) | Never (append-only) |
| **Persists across** | Multiple "Play Again" rounds | Page refreshes, future sessions |
| **Shown in** | Score banner (`1 — 2`) | History modal table |

---

## API Layer Summary (`frontend/src/services/api.ts`)

```ts
ticTacToeApi.createGame()
  → POST /tic-tac-toe/games
  → returns TicTacToeSession

ticTacToeApi.makeMove(id, position, player)
  → POST /tic-tac-toe/games/:id/move
  → returns updated TicTacToeSession

ticTacToeApi.saveResult(id, userId, result, boardState)
  → POST /tic-tac-toe/games/:id/save
  → returns void

usersApi.getOrCreate(username)
  → GET /users/username/:name  (or POST /users on 404)
  → returns User

gameHistoryApi.getByUser(userId)
  → GET /game-history/user/:userId
  → returns GameHistoryEntry[]
```

All calls go through the shared `request<T>()` wrapper which sets `Content-Type: application/json` and throws on non-2xx responses.
