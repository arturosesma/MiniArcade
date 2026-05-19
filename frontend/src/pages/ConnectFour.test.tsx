import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import ConnectFour from './ConnectFour'
import { connectFourApi } from '../services/api'
import type { ConnectFourSession } from '../services/api'

vi.mock('../services/api', () => ({
  connectFourApi: {
    createGame: vi.fn(),
    dropPiece: vi.fn(),
    saveResult: vi.fn(),
  },
  usersApi: { create: vi.fn(), getAll: vi.fn() },
}))

const BOARD_SIZE = 6 * 7 // 42 cells

const emptySession: ConnectFourSession = {
  id: 'cf-1',
  board: Array(BOARD_SIZE).fill(null),
  currentPlayer: 'R',
  winner: null,
  winningCells: [],
  isDraw: false,
}

function renderGame() {
  return render(
    <MemoryRouter>
      <ConnectFour />
    </MemoryRouter>,
  )
}

const getBoardCells = () =>
  screen.getAllByRole('button').filter((b) => (b.textContent ?? '').trim() === '')

describe('ConnectFour', () => {
  beforeEach(() => {
    vi.mocked(connectFourApi.createGame).mockResolvedValue(emptySession)
    vi.mocked(connectFourApi.dropPiece).mockResolvedValue(emptySession)
  })

  afterEach(() => vi.clearAllMocks())

  it('shows the setup screen on first render', () => {
    renderGame()
    expect(screen.getByText('Connect Four')).toBeInTheDocument()
    expect(screen.getByText('Play as guest')).toBeInTheDocument()
  })

  it('calls createGame when starting as guest', async () => {
    const user = userEvent.setup()
    renderGame()
    await user.click(screen.getByText('Play as guest'))
    await waitFor(() =>
      expect(connectFourApi.createGame).toHaveBeenCalledTimes(1),
    )
  })

  it('renders 42 board cells after the session loads', async () => {
    const user = userEvent.setup()
    renderGame()
    await user.click(screen.getByText('Play as guest'))
    await waitFor(() => expect(getBoardCells()).toHaveLength(BOARD_SIZE))
  })

  it('shows the current player status text', async () => {
    const user = userEvent.setup()
    renderGame()
    await user.click(screen.getByText('Play as guest'))
    await waitFor(() =>
      expect(screen.getByText("Red's turn")).toBeInTheDocument(),
    )
  })

  it('calls dropPiece with the correct column when a cell is clicked', async () => {
    const user = userEvent.setup()
    renderGame()
    await user.click(screen.getByText('Play as guest'))
    await waitFor(() => expect(getBoardCells()).toHaveLength(BOARD_SIZE))

    // First cell is row=0, col=0 — clicking it drops into column 0
    await user.click(getBoardCells()[0])
    await waitFor(() =>
      expect(connectFourApi.dropPiece).toHaveBeenCalledWith('cf-1', 0, 'R'),
    )
  })

  it('shows winner status when the game is won', async () => {
    const user = userEvent.setup()
    renderGame()
    await user.click(screen.getByText('Play as guest'))
    await waitFor(() => expect(getBoardCells()).toHaveLength(BOARD_SIZE))

    vi.mocked(connectFourApi.dropPiece).mockResolvedValue({
      ...emptySession,
      winner: 'R',
      winningCells: [35, 36, 37, 38],
    })

    await user.click(getBoardCells()[0])
    await waitFor(() =>
      expect(screen.getByText('Red wins!')).toBeInTheDocument(),
    )
  })

  it('shows draw status when the board is full', async () => {
    const user = userEvent.setup()
    renderGame()
    await user.click(screen.getByText('Play as guest'))
    await waitFor(() => expect(getBoardCells()).toHaveLength(BOARD_SIZE))

    vi.mocked(connectFourApi.dropPiece).mockResolvedValue({
      ...emptySession,
      board: Array(BOARD_SIZE).fill('R'),
      isDraw: true,
    })

    await user.click(getBoardCells()[0])
    await waitFor(() =>
      expect(screen.getByText("It's a draw!")).toBeInTheDocument(),
    )
  })

  it('shows Play Again button when game is over', async () => {
    const user = userEvent.setup()
    renderGame()
    await user.click(screen.getByText('Play as guest'))
    await waitFor(() => expect(getBoardCells()).toHaveLength(BOARD_SIZE))

    vi.mocked(connectFourApi.dropPiece).mockResolvedValue({
      ...emptySession,
      winner: 'Y',
    })

    await user.click(getBoardCells()[0])
    await waitFor(() =>
      expect(screen.getByText('Play Again')).toBeInTheDocument(),
    )
  })
})
