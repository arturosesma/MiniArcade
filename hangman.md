# Hangman.tsx — Full Documentation

File path: `frontend/src/pages/Hangman.tsx`
Backend: `backend/src/hangman/`

---

## Overview

Hangman is a **single-player** game — only one `User` is needed, not two. This is the most structurally different game in the project:

- No `Players` type, no session score, no score banner
- The backend keeps the actual word **secret** using two separate internal/public interfaces
- Physical keyboard input is supported in addition to on-screen buttons
- Sessions are **deleted from memory** on the backend after the result is saved

The file is structured into five components plus the main game:

1. **`HangmanSVG`** — animated SVG gallows that adds body parts per wrong guess
2. **`WordDisplay`** — renders the masked/revealed word as letter slots
3. **`Keyboard`** — 26-button on-screen alphabet with color states
4. **`HistoryModal`** — pop-up showing a single player's past Hangman results
5. **`Setup`** — single-name entry screen
6. **`Hangman`** (default export) — main page component owning all state

---

## Constant

| Name | Value | Purpose |
|------|-------|---------|
| `ALPHABET` | `['a','b',...,'z']` | The 26 letters used to render the on-screen keyboard |

Generated with `'abcdefghijklmnopqrstuvwxyz'.split('')`.

---

## Component: `HangmanSVG`

### Props
| Prop | Type | Purpose |
|------|------|---------|
| `wrongCount` | `number` | How many wrong guesses have been made (0–6) |

Renders an SVG at `200×250` viewBox. The gallows frame (base, pole, beam, rope) is always visible. Body parts are added conditionally:

| `wrongCount` | Part added |
|-------------|------------|
| ≥ 1 | Head (circle) |
| ≥ 2 | Body (vertical line) |
| ≥ 3 | Left arm (diagonal line) |
| ≥ 4 | Right arm (diagonal line) |
| ≥ 5 | Left leg (diagonal line) |
| ≥ 6 | Right leg — full figure, game lost |

Each conditional is a simple `{wrongCount >= N && <element />}` pattern — no animation, just progressive rendering.

---

## Component: `WordDisplay`

### Props
| Prop | Type | Purpose |
|------|------|---------|
| `maskedWord` | `string[]` | Array from the API: guessed letters shown, `'_'` for unknowns |
| `revealed` | `string \| undefined` | Optional: the actual word shown when the game ends |

When `revealed` is provided (game lost), it shows the full actual word instead of the masked version. Letters that were NOT guessed (still `'_'` in `maskedWord`) are colored `text-red-400` to highlight what the player missed.

Each letter is rendered as a column: the character above, a horizontal line below — classic hangman blank format.

---

## Component: `Keyboard`

### Props
| Prop | Type | Purpose |
|------|------|---------|
| `guessedLetters` | `string[]` | All letters the player has guessed (correct + wrong) |
| `wrongGuesses` | `string[]` | Subset that were incorrect |
| `onGuess` | `(letter: string) => void` | Called when a letter button is clicked |
| `disabled` | `boolean` | Disables all buttons when loading or game is over |

### Letter states
| State | Background | Text | Cursor |
|-------|------------|------|--------|
| Wrong guess | `bg-red-900` | `text-red-400` | default |
| Correct guess | `bg-green-800` | `text-green-300` | default |
| Not yet guessed | `bg-gray-700` / hover `bg-gray-600` | white | pointer |
| Disabled (game over) | `bg-gray-800` | `text-gray-500` | default |

`isGuessed = guessedLetters.includes(letter)` — already-guessed buttons are disabled regardless of `disabled` prop. `isCorrect = isGuessed && !isWrong`.

---

## Component: `HistoryModal`

### Props
| Prop | Type | Purpose |
|------|------|---------|
| `user` | `User` | The single player whose history is shown |
| `onClose` | `() => void` | Closes the modal |

### Local State
| Variable | Type | Initial | Purpose |
|----------|------|---------|---------|
| `history` | `GameHistoryEntry[] \| null` | `null` | Player's Hangman history. `null` = loading |

### `useEffect` — fetch on mount
Calls `gameHistoryApi.getByUser(user.id)` and filters to entries where `e.game?.name === 'Hangman'`. On error defaults to `[]`.

### Rendering
Unlike Tic Tac Toe / Connect Four, this modal shows **one player** only. The table has two columns: Date and Result (Win/Loss). Each row is colored via inline `resultColor` and `fmtDate` helper functions defined locally inside the component (not shared utilities from the module scope).

---

## Component: `Setup`

### Props
| Prop | Type | Purpose |
|------|------|---------|
| `onStart` | `(user: User) => void` | Called with the resolved `User` — only one player |

### Local State
| Variable | Setter | Initial | Purpose |
|----------|--------|---------|---------|
| `username` | `setUsername` | `''` | Controlled input for the player's name |
| `loading` | `setLoading` | `false` | Disables the Play button during the API call |
| `error` | `setError` | `''` | Validation or network error message |

### `handleStart()` — async
1. Trims the name
2. Validates: must be non-empty
3. Calls `usersApi.getOrCreate(name)` — single user only
4. Calls `onStart(user)` with the resolved `User`
5. On failure: shows error and re-enables button

---

## Component: `Hangman` (Main / Default Export)

### State Variables

| Variable | Setter | Initial | Purpose |
|----------|--------|---------|---------|
| `user` | `setUser` | `undefined` | The single `User`. `undefined` = Setup screen |
| `game` | `setGame` | `null` | Current `HangmanGame` from the API |
| `loading` | `setLoading` | `false` | True during any API call |
| `resultSaved` | `setResultSaved` | `false` | Guards against double-saving |
| `apiError` | `setApiError` | `''` | Backend error shown in the UI |
| `showHistory` | `setShowHistory` | `false` | Controls whether `HistoryModal` is mounted |

There is **no `score` state** — Hangman has no session tally between rounds. Each game is independent.

### Derived Value

```ts
const isOver = game?.status !== 'playing'
```

Different from Tic Tac Toe / Connect Four which use `!!(winner || isDraw)`. Here the status field drives everything: `'playing'`, `'won'`, or `'lost'`.

---

### Functions

#### `startGame(selectedUser: User)`
```ts
const startGame = useCallback(async (selectedUser: User) => { ... }, [])
```
Called by `Setup.onStart`.

1. Saves `selectedUser` to `user` state
2. Calls `POST /hangman/games` → gets a `HangmanGame` with a randomly chosen word (masked)
3. Saves game, sets `resultSaved = false`

No score reset here because there is no score state.

---

#### `handleGuess(letter: string)`
```ts
const handleGuess = useCallback(async (letter: string) => { ... }, [game, isOver, loading, user, resultSaved])
```
Called when a keyboard button is clicked OR a physical key is pressed.

1. Guards: returns early if no game, game over, loading, or no user
2. Calls `POST /hangman/games/:id/guess { letter }`
3. Backend validates the guess, updates `guessedLetters`, `wrongGuesses`, and `status`, and returns the updated `HangmanGame`
4. Updates `game` state

**If `updated.status !== 'playing'`** and `resultSaved` is false:
- Maps `status` to result: `'won'` → `'win'`, `'lost'` → `'loss'`
- Calls `POST /hangman/games/:id/save { userId, result, boardState: updated.maskedWord }`
- Sets `resultSaved = true`

Note: only **one** save call (single player). Hangman cannot draw.

---

#### Physical keyboard listener (`useEffect`)
```ts
useEffect(() => {
  function onKey(e: KeyboardEvent) {
    if (/^[a-zA-Z]$/.test(e.key)) handleGuess(e.key.toLowerCase())
  }
  window.addEventListener('keydown', onKey)
  return () => window.removeEventListener('keydown', onKey)
}, [handleGuess])
```
Listens for any single alphabetic keypress and routes it to `handleGuess`. The cleanup function removes the listener when the component unmounts or `handleGuess` changes. This is the only game in the project with physical keyboard support.

---

#### `resetGame()`
```ts
const resetGame = useCallback(async () => { ... }, [])
```
Called by the "New Word" button.

1. Calls `POST /hangman/games` → a fresh game with a new random word
2. Sets new `game`, sets `resultSaved = false`

The same `user` persists — no name re-entry needed.

---

### Derived UI Values (inside render)

```ts
const triesLeft = game.maxWrong - game.wrongCount
```
Used to display "3 attempts left" and to color the text red when `triesLeft <= 2`.

Status message below the drawing:
- Playing: `"N attempt(s) left"`
- Won: `"🎉 You won!"`
- Lost: `"💀 You lost! The word was:"`

On loss, `WordDisplay` is called with `revealed={game.word}` so the actual word appears with missed letters in red.

---

## Backend: Hangman Module

### HTTP Endpoints (`/hangman`)

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/games` | Create a new game session |
| `GET` | `/games/:id` | Get current session (masked) |
| `POST` | `/games/:id/guess` | Submit a letter guess |
| `POST` | `/games/:id/save` | Persist result to database, delete session |

### DTOs

**`MakeGuessDto`**
```ts
{ letter: string }   // validated: single lowercase a–z character
```

**`SaveResultDto`**
```ts
{ userId: number, result: 'win' | 'loss' | 'draw', boardState: (string | null)[] }
```

---

### `HangmanService` — The Two-Interface Design

This is the most important design detail in Hangman. The service uses **two separate TypeScript interfaces**:

#### `HangmanSession` (internal — never sent to the client)
```ts
interface HangmanSession {
  id: string
  word: string          // ← actual secret word, e.g. "elephant"
  guessedLetters: string[]
  wrongGuesses: string[]
  status: HangmanStatus
}
```
Stored in the private `sessions` Map. Contains the actual word in plaintext.

#### `HangmanGame` (public — what the API returns)
```ts
interface HangmanGame {
  id: string
  maskedWord: string[]  // e.g. ['_', '_', '_', 'p', 'h', '_', 'n', 't']
  guessedLetters: string[]
  wrongGuesses: string[]
  wrongCount: number
  maxWrong: number
  status: HangmanStatus
  word?: string         // only present when status !== 'playing'
}
```
The actual word is **never** in the response until the game ends.

#### `toPublic(session: HangmanSession): HangmanGame` — the privacy layer
```ts
private toPublic(session: HangmanSession): HangmanGame {
  const maskedWord = session.word
    .split('')
    .map((letter) => (session.guessedLetters.includes(letter) ? letter : '_'))
  return {
    id: session.id,
    maskedWord,
    guessedLetters: session.guessedLetters,
    wrongGuesses: session.wrongGuesses,
    wrongCount: session.wrongGuesses.length,
    maxWrong: MAX_WRONG,
    status: session.status,
    ...(session.status !== 'playing' && { word: session.word }),
  }
}
```
Every response from `createGame`, `makeGuess`, and `getSession` passes through `toPublic`. The word is only spread into the response object when the game is no longer `'playing'`.

---

### Session Storage

```ts
private sessions = new Map<string, HangmanSession>()
```
Like all games in this project, sessions are **in-memory only**. A server restart wipes them. Unlike Tic Tac Toe and Connect Four, Hangman **deletes sessions after saving results** (see `saveResult` below), preventing the word from being guessable after the game ends.

---

### `createGame(): HangmanGame`
- Picks a word: `WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)]`
- Creates a `HangmanSession` with empty `guessedLetters`, `wrongGuesses`, `status = 'playing'`
- Stores it and returns `toPublic(session)` — the client never sees the actual word

**`WORD_LIST`** contains ~90 words (English and Spanish, no accent marks). Examples: `'elephant'`, `'dragon'`, `'estrella'`, `'corazon'`.

**`MAX_WRONG = 6`** — the maximum wrong guesses before the player loses.

---

### `makeGuess(sessionId, dto): HangmanGame`
Validates in order:
1. Session exists → `NotFoundException`
2. `status === 'playing'` → `BadRequestException` if over
3. `letter` matches `/^[a-z]$/` → `BadRequestException` if invalid
4. Letter not already in `guessedLetters` → `BadRequestException` if duplicate

Then:
- Pushes `letter` to `session.guessedLetters`
- If the letter is NOT in the word → pushes to `session.wrongGuesses`
- **Loss check**: `wrongGuesses.length >= MAX_WRONG` → `status = 'lost'`
- **Win check**: every character of `session.word` is in `guessedLetters` → `status = 'won'`

Returns `toPublic(session)` — if the game just ended, the word is now included in the response.

---

### `saveResult(sessionId, dto): Promise<void>`
1. Verifies the session still exists
2. Calls `gamesService.findByName('Hangman')` — finds or auto-creates the game row in `games` table
3. Calls `gameHistoryService.create(...)` → INSERT into `game_history`
4. If `result === 'win'`: calls `scoresService.create({ score: 1 })` → INSERT into `scores`
5. **`this.sessions.delete(sessionId)`** — removes the session from memory after saving

The session deletion is unique to Hangman. It means you cannot replay or re-fetch a game after saving. This is a cleanup measure — once the game is over and recorded, the in-memory data is freed.

---

### Win / Loss Logic Summary

```
After each guess:

  wrongGuesses.length >= 6  →  status = 'lost'   (checked first)
  every letter of word guessed  →  status = 'won'
  otherwise  →  status = 'playing'
```

---

## Database Structure

Hangman uses the same four shared tables as all other games.

### Table: `users`
| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | `INT` | PK, auto-increment | Unique user identifier |
| `username` | `VARCHAR` | UNIQUE, NOT NULL | Player name typed in Setup |
| `email` | `VARCHAR` | UNIQUE, NOT NULL | Auto-set to `{name}@games.local` via `getOrCreate` |
| `createdAt` | `DATETIME` | auto | First creation timestamp |

### Table: `games`
| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | `INT` | PK, auto-increment | |
| `name` | `VARCHAR` | UNIQUE | `'Hangman'` — created the first time `saveResult` runs |
| `description` | `TEXT` | nullable | `'Guess the hidden word one letter at a time before the man is hanged.'` |

### Table: `game_history`
| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | `INT` | PK, auto-increment | |
| `userId` | `INT` | FK → `users.id` | The player |
| `gameId` | `INT` | FK → `games.id` | Always the Hangman game row |
| `result` | `VARCHAR(10)` | `'win' \| 'loss'` | Hangman cannot draw — only win or loss |
| `boardState` | `JSON` | NOT NULL | The `maskedWord` array at the moment the game ended (e.g. `['e','l','_','p','h','a','n','t']`) |
| `createdAt` | `DATETIME` | auto | When the result was saved |

One game → **one row** (single player). This is different from Tic Tac Toe and Connect Four which produce two rows per game.

### Table: `scores`
| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | `INT` | PK, auto-increment | |
| `userId` | `INT` | FK → `users.id` | The winning player |
| `gameId` | `INT` | FK → `games.id` | Hangman game row |
| `score` | `INT` | NOT NULL | Always `1` per win |
| `createdAt` | `DATETIME` | auto | |

Only wins produce a row. Losses produce no score record.

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
Player types their name
      │
      ▼
Setup.handleStart()
  → usersApi.getOrCreate(name)
      ├─ GET /users/username/:name  → found → return User
      └─ 404 → POST /users { username, email: "name@games.local" } → create & return User
  → onStart(user)
      │
      ▼
Hangman.startGame(user)
  → setUser(user)
  → POST /hangman/games
      Backend: pick random word → create HangmanSession (word secret) → toPublic() → return HangmanGame
  → setGame(hangmanGame)   ← maskedWord is all '_', word not in response
      │
      ▼
Player clicks a letter (or presses a key)
      │
      ▼
handleGuess(letter)
  → POST /hangman/games/:id/guess { letter }
      Backend:
        validate (session exists, still playing, valid letter, not duplicate)
        push to guessedLetters
        if wrong: push to wrongGuesses
        if wrongGuesses.length >= 6: status = 'lost'
        else if all letters guessed: status = 'won'
        return toPublic(session)   ← word revealed if status !== 'playing'
  → setGame(updatedGame)
      │
      ├─ status = 'playing' → board re-renders (new letter revealed or body part added)
      │
      └─ status = 'won' or 'lost'
           → result = status === 'won' ? 'win' : 'loss'
           → POST /hangman/games/:id/save { userId, result, boardState: maskedWord }
               Backend:
                 find/create 'Hangman' game row
                 INSERT game_history (one row)
                 if win: INSERT scores (score = 1)
                 sessions.delete(id)   ← session removed from memory
           → resultSaved = true
           → "New Word" button appears, word revealed (on loss)
                │
                ▼
           resetGame()
             → POST /hangman/games   ← new random word, same user, no score state to carry
```

---

## Key Differences from Tic Tac Toe / Connect Four

| Aspect | Tic Tac Toe / Connect Four | Hangman |
|--------|---------------------------|---------|
| Players | 2 (`Players` type) | 1 (`User`) |
| Session score | Yes (`score.p1`, `score.p2`) | No |
| History modal | Shows both players side by side | Shows one player only |
| `isOver` check | `!!(winner \|\| isDraw)` | `game.status !== 'playing'` |
| Draws possible | Yes | No (`'win' \| 'loss'` only) |
| DB rows per game | 2 (one per player) | 1 (one player) |
| Session cleanup | Sessions stay in memory | `sessions.delete()` after save |
| Backend word hiding | N/A | `toPublic()` strips the word |
| Keyboard input | Mouse only | Mouse + physical keyboard |
| Score reset | On `startGame()` (new names) | N/A |

---

## API Layer Summary (`frontend/src/services/api.ts`)

```ts
hangmanApi.createGame()
  → POST /hangman/games
  → returns HangmanGame (maskedWord all '_', no word field)

hangmanApi.makeGuess(id, letter)
  → POST /hangman/games/:id/guess
  → returns updated HangmanGame (word field appears if game ended)

hangmanApi.saveResult(id, userId, result, boardState)
  → POST /hangman/games/:id/save
  → returns void (session deleted on backend after this)

usersApi.getOrCreate(username)
  → GET /users/username/:name  (or POST /users on 404)
  → returns User

gameHistoryApi.getByUser(userId)
  → GET /game-history/user/:userId
  → returns GameHistoryEntry[] (filtered to Hangman entries in the modal)
```

The `HangmanGame` interface in `api.ts`:
```ts
export interface HangmanGame {
  id: string
  maskedWord: string[]      // '_' for unknown, letter for guessed
  guessedLetters: string[]  // all guesses made
  wrongGuesses: string[]    // subset that missed
  wrongCount: number        // wrongGuesses.length
  maxWrong: number          // always 6
  status: 'playing' | 'won' | 'lost'
  word?: string             // only present when status !== 'playing'
}
```
