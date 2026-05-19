import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Hangman from './Hangman'
import { hangmanApi } from '../services/api'
import type { HangmanGame } from '../services/api'

vi.mock('../services/api', () => ({
  hangmanApi: {
    createGame: vi.fn(),
    makeGuess: vi.fn(),
    saveResult: vi.fn(),
  },
  usersApi: { create: vi.fn(), getAll: vi.fn() },
}))

const newGame: HangmanGame = {
  id: 'hm-1',
  maskedWord: ['_', '_', '_', '_', '_'], // 5-letter word
  guessedLetters: [],
  wrongGuesses: [],
  wrongCount: 0,
  maxWrong: 6,
  status: 'playing',
}

function renderGame() {
  return render(
    <MemoryRouter>
      <Hangman />
    </MemoryRouter>,
  )
}

describe('Hangman', () => {
  beforeEach(() => {
    vi.mocked(hangmanApi.createGame).mockResolvedValue(newGame)
    vi.mocked(hangmanApi.makeGuess).mockResolvedValue(newGame)
  })

  afterEach(() => vi.clearAllMocks())

  it('shows the setup screen on first render', () => {
    renderGame()
    expect(screen.getByText('Hangman')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Username (optional)')).toBeInTheDocument()
    expect(screen.getByText('Play as guest')).toBeInTheDocument()
  })

  it('calls createGame when starting as guest', async () => {
    const user = userEvent.setup()
    renderGame()
    await user.click(screen.getByText('Play as guest'))
    await waitFor(() =>
      expect(hangmanApi.createGame).toHaveBeenCalledTimes(1),
    )
  })

  it('renders a 26-letter keyboard after the game loads', async () => {
    const user = userEvent.setup()
    renderGame()
    await user.click(screen.getByText('Play as guest'))
    await waitFor(() => {
      // All 26 alphabet buttons should be present
      expect(screen.getByRole('button', { name: 'a' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'z' })).toBeInTheDocument()
    })
    const letterButtons = screen
      .getAllByRole('button')
      .filter((b) => /^[a-z]$/.test(b.textContent ?? ''))
    expect(letterButtons).toHaveLength(26)
  })

  it('calls makeGuess when a keyboard letter is clicked', async () => {
    const user = userEvent.setup()
    renderGame()
    await user.click(screen.getByText('Play as guest'))
    await waitFor(() => screen.getByRole('button', { name: 'a' }))

    await user.click(screen.getByRole('button', { name: 'a' }))
    await waitFor(() =>
      expect(hangmanApi.makeGuess).toHaveBeenCalledWith('hm-1', 'a'),
    )
  })

  it('disables a letter button after it has been guessed', async () => {
    const user = userEvent.setup()
    renderGame()
    await user.click(screen.getByText('Play as guest'))

    vi.mocked(hangmanApi.makeGuess).mockResolvedValue({
      ...newGame,
      guessedLetters: ['a'],
      wrongGuesses: ['a'],
      wrongCount: 1,
    })

    await waitFor(() => screen.getByRole('button', { name: 'a' }))
    await user.click(screen.getByRole('button', { name: 'a' }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'a' })).toBeDisabled(),
    )
  })

  it('shows attempts-left counter during play', async () => {
    const user = userEvent.setup()
    renderGame()
    await user.click(screen.getByText('Play as guest'))
    await waitFor(() =>
      expect(screen.getByText('6 attempts left')).toBeInTheDocument(),
    )
  })

  it('shows win message when the game is won', async () => {
    const user = userEvent.setup()
    renderGame()
    await user.click(screen.getByText('Play as guest'))
    await waitFor(() => screen.getByRole('button', { name: 'a' }))

    vi.mocked(hangmanApi.makeGuess).mockResolvedValue({
      ...newGame,
      maskedWord: ['a', 'p', 'p', 'l', 'e'],
      guessedLetters: ['a', 'p', 'l', 'e'],
      status: 'won',
      word: 'apple',
    })

    await user.click(screen.getByRole('button', { name: 'a' }))
    await waitFor(() =>
      expect(screen.getByText(/You won/)).toBeInTheDocument(),
    )
  })

  it('shows loss message and reveals the word when the game is lost', async () => {
    const user = userEvent.setup()
    renderGame()
    await user.click(screen.getByText('Play as guest'))
    await waitFor(() => screen.getByRole('button', { name: 'z' }))

    vi.mocked(hangmanApi.makeGuess).mockResolvedValue({
      ...newGame,
      wrongGuesses: ['z', 'x', 'w', 'v', 'u', 't'],
      wrongCount: 6,
      status: 'lost',
      word: 'apple',
    })

    await user.click(screen.getByRole('button', { name: 'z' }))
    await waitFor(() =>
      expect(screen.getByText(/The word was/)).toBeInTheDocument(),
    )
  })

  it('shows the New Word button when the game is over', async () => {
    const user = userEvent.setup()
    renderGame()
    await user.click(screen.getByText('Play as guest'))
    await waitFor(() => screen.getByRole('button', { name: 'a' }))

    vi.mocked(hangmanApi.makeGuess).mockResolvedValue({
      ...newGame,
      status: 'won',
      word: 'apple',
    })

    await user.click(screen.getByRole('button', { name: 'a' }))
    await waitFor(() =>
      expect(screen.getByText('New Word')).toBeInTheDocument(),
    )
  })
})
