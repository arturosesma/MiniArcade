import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ticTacToeApi, usersApi, type TicTacToeSession, type User } from '../services/api'

type Cell = string | null

const WINNING_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
]

function getWinningCells(board: Cell[]): number[] {
  for (const [a, b, c] of WINNING_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return [a, b, c]
  }
  return []
}

// ── Setup screen ──────────────────────────────────────────────────────────────

interface SetupProps {
  onStart: (user: User | null) => void
}

function Setup({ onStart }: SetupProps) {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleStart() {
    if (!username.trim()) { onStart(null); return }
    setLoading(true)
    setError('')
    try {
      const user = await usersApi.create(username.trim(), email.trim() || `${username.trim()}@guest.local`)
      onStart(user)
    } catch {
      setError('Username already taken or invalid email.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="bg-gray-900 rounded-2xl p-8 w-full max-w-sm shadow-xl">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">Tic Tac Toe</h2>
        <p className="text-gray-400 text-sm mb-4 text-center">Enter your name to track your score, or play as guest.</p>
        <input
          className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 mb-3 outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Username (optional)"
          value={username}
          onChange={e => setUsername(e.target.value)}
        />
        <input
          className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 mb-4 outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Email (optional)"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
        <button
          onClick={handleStart}
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-2 rounded-lg transition-colors"
        >
          {loading ? 'Starting…' : 'Play'}
        </button>
        <button
          onClick={() => onStart(null)}
          className="w-full mt-2 text-gray-500 hover:text-gray-300 text-sm py-1 transition-colors"
        >
          Play as guest
        </button>
      </div>
    </div>
  )
}

// ── Board ─────────────────────────────────────────────────────────────────────

interface BoardProps {
  board: Cell[]
  winningCells: number[]
  onCellClick: (index: number) => void
  disabled: boolean
}

function Board({ board, winningCells, onCellClick, disabled }: BoardProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {board.map((cell, i) => {
        const isWinner = winningCells.includes(i)
        return (
          <button
            key={i}
            onClick={() => onCellClick(i)}
            disabled={disabled || cell !== null}
            className={[
              'h-24 w-24 rounded-xl text-4xl font-bold transition-all duration-150',
              isWinner
                ? 'bg-indigo-500 text-white scale-105'
                : cell
                ? 'bg-gray-700 text-white cursor-default'
                : 'bg-gray-800 hover:bg-gray-700 text-white cursor-pointer',
              disabled && !cell ? 'opacity-50' : '',
            ].join(' ')}
          >
            {cell}
          </button>
        )
      })}
    </div>
  )
}

// ── Main game ─────────────────────────────────────────────────────────────────

export default function TicTacToe() {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null | undefined>(undefined) // undefined = not chosen yet
  const [session, setSession] = useState<TicTacToeSession | null>(null)
  const [loading, setLoading] = useState(false)
  const [resultSaved, setResultSaved] = useState(false)
  const [apiError, setApiError] = useState('')

  const winningCells = session ? getWinningCells(session.board) : []
  const isOver = !!(session?.winner || session?.isDraw)

  const startGame = useCallback(async (selectedUser: User | null) => {
    setUser(selectedUser)
    setLoading(true)
    setApiError('')
    try {
      const s = await ticTacToeApi.createGame()
      setSession(s)
      setResultSaved(false)
    } catch {
      setApiError('Could not connect to server. Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleCellClick = useCallback(async (index: number) => {
    if (!session || isOver || loading) return
    setLoading(true)
    setApiError('')
    try {
      const updated = await ticTacToeApi.makeMove(session.id, index, session.currentPlayer)
      setSession(updated)

      // Auto-save when game ends
      if ((updated.winner || updated.isDraw) && user && !resultSaved) {
        const result = updated.winner ? 'win' : 'draw'
        await ticTacToeApi.saveResult(session.id, user.id, result, updated.board)
        setResultSaved(true)
      }
    } catch (e: unknown) {
      if (e instanceof Error) setApiError(e.message)
    } finally {
      setLoading(false)
    }
  }, [session, isOver, loading, user, resultSaved])

  const resetGame = useCallback(async () => {
    if (!session) return
    setLoading(true)
    setApiError('')
    try {
      const s = await ticTacToeApi.createGame()
      setSession(s)
      setResultSaved(false)
    } catch {
      setApiError('Could not start a new game.')
    } finally {
      setLoading(false)
    }
  }, [session])

  // Not chosen a user yet
  if (user === undefined) {
    return <Setup onStart={startGame} />
  }

  // Waiting for first session
  if (!session) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
        {apiError ? (
          <div className="text-center">
            <p className="text-red-400 mb-4">{apiError}</p>
            <button onClick={() => startGame(user)} className="bg-indigo-600 hover:bg-indigo-500 px-6 py-2 rounded-lg">
              Retry
            </button>
          </div>
        ) : (
          <p className="text-gray-400">Starting game…</p>
        )}
      </div>
    )
  }

  const statusText = session.winner
    ? `Player ${session.winner} wins!`
    : session.isDraw
    ? "It's a draw!"
    : `Player ${session.currentPlayer}'s turn`

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between w-full max-w-sm">
        <button onClick={() => navigate('/')} className="text-gray-400 hover:text-white transition-colors text-sm">
          &larr; Back
        </button>
        <h1 className="text-2xl font-bold text-white">Tic Tac Toe</h1>
        {user ? (
          <span className="text-indigo-400 text-sm">{user.username}</span>
        ) : (
          <span className="text-gray-500 text-sm">Guest</span>
        )}
      </div>

      {/* Status */}
      <div
        className={[
          'text-xl font-semibold px-6 py-2 rounded-full',
          session.winner ? 'bg-indigo-600 text-white' : session.isDraw ? 'bg-yellow-600 text-white' : 'bg-gray-800 text-gray-200',
        ].join(' ')}
      >
        {statusText}
      </div>

      {/* Board */}
      <Board
        board={session.board}
        winningCells={winningCells}
        onCellClick={handleCellClick}
        disabled={loading || isOver}
      />

      {/* Error */}
      {apiError && <p className="text-red-400 text-sm">{apiError}</p>}

      {/* Actions */}
      <div className="flex gap-4">
        {isOver && (
          <button
            onClick={resetGame}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold px-8 py-2 rounded-lg transition-colors"
          >
            Play Again
          </button>
        )}
        <button
          onClick={() => navigate('/')}
          className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold px-8 py-2 rounded-lg transition-colors"
        >
          Dashboard
        </button>
      </div>

      {resultSaved && (
        <p className="text-green-400 text-sm">Score saved!</p>
      )}
    </div>
  )
}
