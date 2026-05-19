import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { hangmanApi, usersApi, type HangmanGame, type User } from '../services/api'

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('')

// ── SVG Drawing ───────────────────────────────────────────────────────────────

function HangmanSVG({ wrongCount }: { wrongCount: number }) {
  const stroke = { stroke: 'white', strokeWidth: 3, strokeLinecap: 'round' as const }
  const thin = { stroke: 'white', strokeWidth: 2.5, strokeLinecap: 'round' as const }
  return (
    <svg viewBox="0 0 200 250" className="w-44 h-44">
      {/* Gallows — always visible */}
      <line x1="10" y1="240" x2="190" y2="240" {...stroke} />
      <line x1="50" y1="240" x2="50" y2="15"  {...stroke} />
      <line x1="50" y1="15"  x2="140" y2="15"  {...stroke} />
      <line x1="140" y1="15" x2="140" y2="45"  {...stroke} />

      {/* 1 — Head */}
      {wrongCount >= 1 && <circle cx="140" cy="62" r="17" stroke="white" strokeWidth="2.5" fill="none" />}
      {/* 2 — Body */}
      {wrongCount >= 2 && <line x1="140" y1="79" x2="140" y2="145" {...thin} />}
      {/* 3 — Left arm */}
      {wrongCount >= 3 && <line x1="140" y1="98" x2="112" y2="126" {...thin} />}
      {/* 4 — Right arm */}
      {wrongCount >= 4 && <line x1="140" y1="98" x2="168" y2="126" {...thin} />}
      {/* 5 — Left leg */}
      {wrongCount >= 5 && <line x1="140" y1="145" x2="112" y2="185" {...thin} />}
      {/* 6 — Right leg */}
      {wrongCount >= 6 && <line x1="140" y1="145" x2="168" y2="185" {...thin} />}
    </svg>
  )
}

// ── Word display ──────────────────────────────────────────────────────────────

function WordDisplay({ maskedWord, revealed }: { maskedWord: string[]; revealed?: string }) {
  const letters = revealed ? revealed.split('') : maskedWord
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {letters.map((char, i) => (
        <div key={i} className="flex flex-col items-center w-7">
          <span
            className={[
              'text-2xl font-bold uppercase',
              revealed && maskedWord[i] === '_' ? 'text-red-400' : 'text-white',
            ].join(' ')}
          >
            {char === '_' ? ' ' : char}
          </span>
          <div className="h-0.5 w-full bg-gray-500 mt-1" />
        </div>
      ))}
    </div>
  )
}

// ── Keyboard ──────────────────────────────────────────────────────────────────

interface KeyboardProps {
  guessedLetters: string[]
  wrongGuesses: string[]
  onGuess: (letter: string) => void
  disabled: boolean
}

function Keyboard({ guessedLetters, wrongGuesses, onGuess, disabled }: KeyboardProps) {
  return (
    <div className="flex flex-wrap gap-1.5 justify-center max-w-xs">
      {ALPHABET.map(letter => {
        const isGuessed = guessedLetters.includes(letter)
        const isWrong = wrongGuesses.includes(letter)
        const isCorrect = isGuessed && !isWrong
        return (
          <button
            key={letter}
            onClick={() => onGuess(letter)}
            disabled={disabled || isGuessed}
            className={[
              'w-9 h-9 rounded-lg text-sm font-bold uppercase transition-all',
              isWrong
                ? 'bg-red-900 text-red-400 cursor-default'
                : isCorrect
                ? 'bg-green-800 text-green-300 cursor-default'
                : disabled
                ? 'bg-gray-800 text-gray-500 cursor-default'
                : 'bg-gray-700 hover:bg-gray-600 text-white cursor-pointer',
            ].join(' ')}
          >
            {letter}
          </button>
        )
      })}
    </div>
  )
}

// ── Setup screen ──────────────────────────────────────────────────────────────

interface SetupProps {
  onStart: (user: User) => void
}

function Setup({ onStart }: SetupProps) {
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleStart() {
    const name = username.trim()
    if (!name) { setError('Please enter your name.'); return }
    setLoading(true)
    setError('')
    try {
      const user = await usersApi.getOrCreate(name)
      onStart(user)
    } catch {
      setError('Could not set up player. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="bg-gray-900 rounded-2xl p-8 w-full max-w-sm shadow-xl">
        <h2 className="text-2xl font-bold text-white mb-2 text-center">Hangman</h2>
        <p className="text-gray-400 text-sm mb-6 text-center">Guess the word before the man is hanged.</p>
        <input
          className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 mb-4 outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="Your name"
          value={username}
          onChange={e => setUsername(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleStart()}
        />
        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
        <button
          onClick={handleStart}
          disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-2 rounded-lg transition-colors"
        >
          {loading ? 'Setting up…' : 'Play'}
        </button>
      </div>
    </div>
  )
}

// ── Main game ─────────────────────────────────────────────────────────────────

export default function Hangman() {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | undefined>(undefined)
  const [game, setGame] = useState<HangmanGame | null>(null)
  const [loading, setLoading] = useState(false)
  const [resultSaved, setResultSaved] = useState(false)
  const [apiError, setApiError] = useState('')

  const isOver = game?.status !== 'playing'

  const startGame = useCallback(async (selectedUser: User) => {
    setUser(selectedUser)
    setLoading(true)
    setApiError('')
    try {
      const g = await hangmanApi.createGame()
      setGame(g)
      setResultSaved(false)
    } catch {
      setApiError('Could not connect to server. Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleGuess = useCallback(async (letter: string) => {
    if (!game || isOver || loading || !user) return
    setLoading(true)
    setApiError('')
    try {
      const updated = await hangmanApi.makeGuess(game.id, letter)
      setGame(updated)

      if (updated.status !== 'playing' && !resultSaved) {
        const result = updated.status === 'won' ? 'win' : 'loss'
        await hangmanApi.saveResult(game.id, user.id, result, updated.maskedWord)
        setResultSaved(true)
      }
    } catch (e: unknown) {
      if (e instanceof Error) setApiError(e.message)
    } finally {
      setLoading(false)
    }
  }, [game, isOver, loading, user, resultSaved])

  // Keyboard input support
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (/^[a-zA-Z]$/.test(e.key)) handleGuess(e.key.toLowerCase())
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleGuess])

  const resetGame = useCallback(async () => {
    setLoading(true)
    setApiError('')
    try {
      const g = await hangmanApi.createGame()
      setGame(g)
      setResultSaved(false)
    } catch {
      setApiError('Could not start a new game.')
    } finally {
      setLoading(false)
    }
  }, [])

  if (user === undefined) return <Setup onStart={startGame} />

  if (!game) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
        {apiError ? (
          <div className="text-center">
            <p className="text-red-400 mb-4">{apiError}</p>
            <button onClick={() => user && startGame(user)} className="bg-emerald-600 hover:bg-emerald-500 px-6 py-2 rounded-lg">
              Retry
            </button>
          </div>
        ) : (
          <p className="text-gray-400">Starting game…</p>
        )}
      </div>
    )
  }

  const triesLeft = game.maxWrong - game.wrongCount

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between w-full max-w-md">
        <button onClick={() => navigate('/')} className="text-gray-400 hover:text-white transition-colors text-sm">
          &larr; Back
        </button>
        <h1 className="text-2xl font-bold text-white">Hangman</h1>
        <span className="text-emerald-400 text-sm">{user?.username}</span>
      </div>

      {/* Drawing + attempts */}
      <div className="flex flex-col items-center gap-1">
        <HangmanSVG wrongCount={game.wrongCount} />
        <p className={['text-sm font-medium', triesLeft <= 2 ? 'text-red-400' : 'text-gray-400'].join(' ')}>
          {game.status === 'playing'
            ? `${triesLeft} attempt${triesLeft !== 1 ? 's' : ''} left`
            : game.status === 'won'
            ? '🎉 You won!'
            : `💀 You lost! The word was:`}
        </p>
      </div>

      {/* Word */}
      <WordDisplay
        maskedWord={game.maskedWord}
        revealed={game.status === 'lost' ? game.word : undefined}
      />

      {/* Wrong guesses */}
      {game.wrongGuesses.length > 0 && (
        <p className="text-red-400 text-sm tracking-widest uppercase">
          Wrong: {game.wrongGuesses.join('  ')}
        </p>
      )}

      {/* Keyboard */}
      <Keyboard
        guessedLetters={game.guessedLetters}
        wrongGuesses={game.wrongGuesses}
        onGuess={handleGuess}
        disabled={loading || isOver}
      />

      {apiError && <p className="text-red-400 text-sm">{apiError}</p>}

      {/* Actions */}
      <div className="flex gap-4">
        {isOver && (
          <button
            onClick={resetGame}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold px-8 py-2 rounded-lg transition-colors"
          >
            New Word
          </button>
        )}
        <button
          onClick={() => navigate('/')}
          className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold px-8 py-2 rounded-lg transition-colors"
        >
          Dashboard
        </button>
      </div>

      {resultSaved && <p className="text-green-400 text-sm">Score saved!</p>}
    </div>
  )
}
