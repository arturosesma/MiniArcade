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
        <h2 className="text-2xl font-bold text-white mb-2 text-center">Tic Tac Toe</h2>
        <p className="text-gray-400 text-sm mb-6 text-center">Enter both player names to start.</p>
        <label className="text-gray-400 text-xs mb-1 block">Player 1 (X)</label>
        <input
          className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 mb-4 outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Player 1 name"
          value={name1}
          onChange={e => setName1(e.target.value)}
        />
        <label className="text-gray-400 text-xs mb-1 block">Player 2 (O)</label>
        <input
          className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 mb-4 outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Player 2 name"
          value={name2}
          onChange={e => setName2(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleStart()}
        />
        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
        <button
          onClick={handleStart}
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-2 rounded-lg transition-colors"
        >
          {loading ? 'Setting up…' : 'Start Game'}
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

type Players = { p1: User; p2: User }

export default function TicTacToe() {
  const navigate = useNavigate()
  const [players, setPlayers] = useState<Players | undefined>(undefined)
  const [session, setSession] = useState<TicTacToeSession | null>(null)
  const [loading, setLoading] = useState(false)
  const [resultSaved, setResultSaved] = useState(false)
  const [apiError, setApiError] = useState('')

  const winningCells = session ? getWinningCells(session.board) : []
  const isOver = !!(session?.winner || session?.isDraw)

  const startGame = useCallback(async (p1: User, p2: User) => {
    setPlayers({ p1, p2 })
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
    if (!session || isOver || loading || !players) return
    setLoading(true)
    setApiError('')
    try {
      const updated = await ticTacToeApi.makeMove(session.id, index, session.currentPlayer)
      setSession(updated)

      if ((updated.winner || updated.isDraw) && !resultSaved) {
        const { p1, p2 } = players
        if (updated.winner === 'X') {
          await Promise.all([
            ticTacToeApi.saveResult(session.id, p1.id, 'win', updated.board),
            ticTacToeApi.saveResult(session.id, p2.id, 'loss', updated.board),
          ])
        } else if (updated.winner === 'O') {
          await Promise.all([
            ticTacToeApi.saveResult(session.id, p1.id, 'loss', updated.board),
            ticTacToeApi.saveResult(session.id, p2.id, 'win', updated.board),
          ])
        } else {
          await Promise.all([
            ticTacToeApi.saveResult(session.id, p1.id, 'draw', updated.board),
            ticTacToeApi.saveResult(session.id, p2.id, 'draw', updated.board),
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

  if (players === undefined) {
    return <Setup onStart={startGame} />
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
        {apiError ? (
          <div className="text-center">
            <p className="text-red-400 mb-4">{apiError}</p>
            <button onClick={() => startGame(players.p1, players.p2)} className="bg-indigo-600 hover:bg-indigo-500 px-6 py-2 rounded-lg">
              Retry
            </button>
          </div>
        ) : (
          <p className="text-gray-400">Starting game…</p>
        )}
      </div>
    )
  }

  const playerName = (marker: string) => marker === 'X' ? players.p1.username : players.p2.username

  const statusText = session.winner
    ? `${playerName(session.winner)} wins!`
    : session.isDraw
    ? "It's a draw!"
    : `${playerName(session.currentPlayer)}'s turn`

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between w-full max-w-sm">
        <button onClick={() => navigate('/')} className="text-gray-400 hover:text-white transition-colors text-sm">
          &larr; Back
        </button>
        <h1 className="text-2xl font-bold text-white">Tic Tac Toe</h1>
        <div className="text-right text-xs">
          <p className="text-indigo-400">{players.p1.username} <span className="text-gray-500">(X)</span></p>
          <p className="text-indigo-300">{players.p2.username} <span className="text-gray-500">(O)</span></p>
        </div>
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
        <p className="text-green-400 text-sm">Results saved!</p>
      )}
    </div>
  )
}
