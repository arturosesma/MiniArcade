import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import TicTacToe from './TicTacToe'
import { ticTacToeApi } from '../services/api'
import type { TicTacToeSession } from '../services/api'

vi.mock('../services/api', () => ({
  ticTacToeApi: {
    createGame: vi.fn(),
    makeMove: vi.fn(),
    saveResult: vi.fn(),
  },
  usersApi: { create: vi.fn(), getAll: vi.fn() },
}))

const emptySession: TicTacToeSession = {
  id: 'game-1',
  board: Array(9).fill(null),
  currentPlayer: 'X',
  winner: null,
  isDraw: false,
}

function renderGame() {
  return render(
    <MemoryRouter>
      <TicTacToe />
    </MemoryRouter>,
  )
}

const getBoardCells = () =>
  screen.getAllByRole('button').filter((b) => (b.textContent ?? '').trim() === '')

describe('TicTacToe', () => {
  beforeEach(() => {
    vi.mocked(ticTacToeApi.createGame).mockResolvedValue(emptySession)
    vi.mocked(ticTacToeApi.makeMove).mockResolvedValue(emptySession)
  })

  afterEach(() => vi.clearAllMocks())

  it('shows the setup screen on first render', () => {
    renderGame()
    expect(screen.getByText('Tic Tac Toe')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Username (optional)')).toBeInTheDocument()
    expect(screen.getByText('Play as guest')).toBeInTheDocument()
  })

  it('calls createGame when starting as guest', async () => {
    const user = userEvent.setup()
    renderGame()
    await user.click(screen.getByText('Play as guest'))
    await waitFor(() =>
      expect(ticTacToeApi.createGame).toHaveBeenCalledTimes(1),
    )
  })

  it('renders 9 board cells after the game session loads', async () => {
    const user = userEvent.setup()
    renderGame()
    await user.click(screen.getByText('Play as guest'))
    await waitFor(() => expect(getBoardCells()).toHaveLength(9))
  })

  it('shows the current player status text', async () => {
    const user = userEvent.setup()
    renderGame()
    await user.click(screen.getByText('Play as guest'))
    await waitFor(() =>
      expect(screen.getByText("Player X's turn")).toBeInTheDocument(),
    )
  })

  it('calls makeMove with the correct position when a cell is clicked', async () => {
    const user = userEvent.setup()
    renderGame()
    await user.click(screen.getByText('Play as guest'))
    await waitFor(() => expect(getBoardCells()).toHaveLength(9))

    await user.click(getBoardCells()[0])
    await waitFor(() =>
      expect(ticTacToeApi.makeMove).toHaveBeenCalledWith('game-1', 0, 'X'),
    )
  })

  it('shows winner status when the game is won', async () => {
    const user = userEvent.setup()
    renderGame()
    await user.click(screen.getByText('Play as guest'))
    await waitFor(() => expect(getBoardCells()).toHaveLength(9))

    vi.mocked(ticTacToeApi.makeMove).mockResolvedValue({
      ...emptySession,
      board: ['X', 'X', 'X', null, null, null, null, null, null],
      winner: 'X',
    })

    await user.click(getBoardCells()[0])
    await waitFor(() =>
      expect(screen.getByText('Player X wins!')).toBeInTheDocument(),
    )
  })

  it('shows draw status when the board is full with no winner', async () => {
    const user = userEvent.setup()
    renderGame()
    await user.click(screen.getByText('Play as guest'))
    await waitFor(() => expect(getBoardCells()).toHaveLength(9))

    vi.mocked(ticTacToeApi.makeMove).mockResolvedValue({
      ...emptySession,
      board: ['X', 'O', 'X', 'O', 'O', 'X', 'X', 'X', 'O'],
      isDraw: true,
    })

    await user.click(getBoardCells()[0])
    await waitFor(() =>
      expect(screen.getByText("It's a draw!")).toBeInTheDocument(),
    )
  })

  it('shows the Play Again button when the game is over', async () => {
    const user = userEvent.setup()
    renderGame()
    await user.click(screen.getByText('Play as guest'))
    await waitFor(() => expect(getBoardCells()).toHaveLength(9))

    vi.mocked(ticTacToeApi.makeMove).mockResolvedValue({
      ...emptySession,
      winner: 'X',
    })

    await user.click(getBoardCells()[0])
    await waitFor(() =>
      expect(screen.getByText('Play Again')).toBeInTheDocument(),
    )
  })
})
