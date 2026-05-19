import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { connectFourApi, usersApi, type ConnectFourSession, type User } from '../services/api'

const ROWS = 6
const COLS = 7

// ── Setup screen ──────────────────────────────────────────────────────────────

interface SetupProps {
  onStart: (player1: User, player2: User) => void
}

function Setup({ onStart }: SetupProps) {
  const [name1, setName1] = useState('')
  const [name2, setName2] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleStart() {
    const n1 = name1.trim()
    const n2 = name2.trim()
    if (!n1 || !n2) { setError('Both player names are required.'); return }
    if (n1 === n2) { setError('Player names must be different.'); return }
    setLoading(true)
    setError('')
    try {
      const [p1, p2] = await Promise.all([usersApi.getOrCreate(n1), usersApi.getOrCreate(n2)])
      onStart(p1, p2)
    } catch {
      setError('Could not set up players. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="bg-gray-900 rounded-2xl p-8 w-full max-w-sm shadow-xl">
        <h2 className="text-2xl font-bold text-white mb-2 text-center">Connect Four</h2>
        <p className="text-gray-400 text-sm mb-6 text-center">Enter both player names to start.</p>
        <label className="text-gray-400 text-xs mb-1 block">Player 1 (Red)</label>
        <input
          className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 mb-4 outline-none focus:ring-2 focus:ring-red-500"
          placeholder="Player 1 name"
          value={name1}
          onChange={e => setName1(e.target.value)}
        />
        <label className="text-gray-400 text-xs mb-1 block">Player 2 (Yellow)</label>
        <input
          className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 mb-4 outline-none focus:ring-2 focus:ring-yellow-500"
          placeholder="Player 2 name"
          value={name2}
          onChange={e => setName2(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleStart()}
        />
        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
        <button
          onClick={handleStart}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-2 rounded-lg transition-colors"
        >
          {loading ? 'Setting up…' : 'Start Game'}
        </button>
      </div>
    </div>
  )
}

// ── Board ─────────────────────────────────────────────────────────────────────

interface BoardProps {
  board: (string | null)[]
  winningCells: number[]
  onColClick: (col: number) => void
  disabled: boolean
  currentPlayer: 'R' | 'Y'
}

function Board({ board, winningCells, onColClick, disabled, currentPlayer }: BoardProps) {
  const [hoveredCol, setHoveredCol] = useState<number | null>(null)

  return (
    <div className="bg-blue-700 p-3 rounded-2xl shadow-2xl">
      {/* Column hover indicators */}
      <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
        {Array.from({ length: COLS }, (_, col) => (
          <div key={col} className="flex justify-center h-5">
            {hoveredCol === col && !disabled && (
              <div
                className="w-4 h-4 rounded-full transition-all"
                style={{ backgroundColor: currentPlayer === 'R' ? '#ef4444' : '#facc15' }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
        {Array.from({ length: ROWS }, (_, row) =>
          Array.from({ length: COLS }, (_, col) => {
            const i = row * COLS + col
            const cell = board[i]
            const isWinning = winningCells.includes(i)

            return (
              <button
                key={i}
                onClick={() => !disabled && onColClick(col)}
                onMouseEnter={() => setHoveredCol(col)}
                onMouseLeave={() => setHoveredCol(null)}
                disabled={disabled}
                className={[
                  'w-11 h-11 rounded-full transition-all duration-150',
                  isWinning ? 'ring-4 ring-white scale-110' : '',
                  !cell && !disabled ? 'cursor-pointer' : 'cursor-default',
                ].join(' ')}
                style={{
                  backgroundColor: isWinning
                    ? cell === 'R' ? '#f87171' : '#fde047'
                    : cell === 'R'
                    ? '#ef4444'
                    : cell === 'Y'
                    ? '#facc15'
                    : '#1e3a8a',
                }}
              />
            )
          })
        ).flat()}
      </div>
    </div>
  )
}

// ── Main game ─────────────────────────────────────────────────────────────────

type Players = { p1: User; p2: User }

export default function ConnectFour() {
  const navigate = useNavigate()
  const [players, setPlayers] = useState<Players | undefined>(undefined)
  const [session, setSession] = useState<ConnectFourSession | null>(null)
  const [loading, setLoading] = useState(false)
  const [resultSaved, setResultSaved] = useState(false)
  const [apiError, setApiError] = useState('')

  const isOver = !!(session?.winner || session?.isDraw)

  const startGame = useCallback(async (p1: User, p2: User) => {
    setPlayers({ p1, p2 })
    setLoading(true)
    setApiError('')
    try {
      const s = await connectFourApi.createGame()
      setSession(s)
      setResultSaved(false)
    } catch {
      setApiError('Could not connect to server. Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleColClick = useCallback(async (col: number) => {
    if (!session || isOver || loading || !players) return
    setLoading(true)
    setApiError('')
    try {
      const updated = await connectFourApi.dropPiece(session.id, col, session.currentPlayer)
      setSession(updated)

      if ((updated.winner || updated.isDraw) && !resultSaved) {
        const { p1, p2 } = players
        if (updated.winner === 'R') {
          await Promise.all([
            connectFourApi.saveResult(session.id, p1.id, 'win', updated.board),
            connectFourApi.saveResult(session.id, p2.id, 'loss', updated.board),
          ])
        } else if (updated.winner === 'Y') {
          await Promise.all([
            connectFourApi.saveResult(session.id, p1.id, 'loss', updated.board),
            connectFourApi.saveResult(session.id, p2.id, 'win', updated.board),
          ])
        } else {
          await Promise.all([
            connectFourApi.saveResult(session.id, p1.id, 'draw', updated.board),
            connectFourApi.saveResult(session.id, p2.id, 'draw', updated.board),
          ])
        }
        setResultSaved(true)
      }
    } catch (e: unknown) {
      if (e instanceof Error) setApiError(e.message)
    } finally {
      setLoading(false)
    }
  }, [session, isOver, loading, players, resultSaved])

  const resetGame = useCallback(async () => {
    setLoading(true)
    setApiError('')
    try {
      const s = await connectFourApi.createGame()
      setSession(s)
      setResultSaved(false)
    } catch {
      setApiError('Could not start a new game.')
    } finally {
      setLoading(false)
    }
  }, [])

  if (players === undefined) return <Setup onStart={startGame} />

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
        {apiError ? (
          <div className="text-center">
            <p className="text-red-400 mb-4">{apiError}</p>
            <button onClick={() => startGame(players.p1, players.p2)} className="bg-blue-600 hover:bg-blue-500 px-6 py-2 rounded-lg">
              Retry
            </button>
          </div>
        ) : (
          <p className="text-gray-400">Starting game…</p>
        )}
      </div>
    )
  }

  const playerName = (marker: string) => marker === 'R' ? players.p1.username : players.p2.username
  const playerColor = (marker: string) => marker === 'R' ? 'Red' : 'Yellow'

  const statusText = session.winner
    ? `${playerName(session.winner)} (${playerColor(session.winner)}) wins!`
    : session.isDraw
    ? "It's a draw!"
    : `${playerName(session.currentPlayer)}'s turn`

  const statusColor = session.winner === 'R'
    ? 'bg-red-600 text-white'
    : session.winner === 'Y'
    ? 'bg-yellow-500 text-gray-900'
    : session.isDraw
    ? 'bg-gray-600 text-white'
    : session.currentPlayer === 'R'
    ? 'bg-red-900 text-red-200'
    : 'bg-yellow-900 text-yellow-200'

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between w-full max-w-lg">
        <button onClick={() => navigate('/')} className="text-gray-400 hover:text-white transition-colors text-sm">
          &larr; Back
        </button>
        <h1 className="text-2xl font-bold text-white">Connect Four</h1>
        <div className="text-right text-xs">
          <p className="text-red-400">{players.p1.username} <span className="text-gray-500">(Red)</span></p>
          <p className="text-yellow-400">{players.p2.username} <span className="text-gray-500">(Yellow)</span></p>
        </div>
      </div>

      {/* Status */}
      <div className={`text-lg font-semibold px-6 py-2 rounded-full ${statusColor}`}>
        {statusText}
      </div>

      {/* Board */}
      <Board
        board={session.board}
        winningCells={session.winningCells}
        onColClick={handleColClick}
        disabled={loading || isOver}
        currentPlayer={session.currentPlayer}
      />

      {apiError && <p className="text-red-400 text-sm">{apiError}</p>}

      {/* Actions */}
      <div className="flex gap-4">
        {isOver && (
          <button
            onClick={resetGame}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold px-8 py-2 rounded-lg transition-colors"
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

      {resultSaved && <p className="text-green-400 text-sm">Results saved!</p>}
    </div>
  )
}
