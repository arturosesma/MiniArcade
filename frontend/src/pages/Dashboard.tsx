import { Link } from 'react-router-dom'

interface GameCard {
  title: string
  description: string
  route: string
  icon: string
}

const games: GameCard[] = [
  {
    title: 'Tic Tac Toe',
    description: 'Classic two-player game. Be the first to align three marks in a row, column, or diagonal.',
    route: '/tic-tac-toe',
    icon: '⭕',
  },
  {
    title: 'Connect 4',
    description: 'Drop your discs and connect four in a row before your opponent does.',
    route: '/connect-four',
    icon: '🔴',
  },
]

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-5">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            🎮 Minigames Dashboard
          </h1>
          <p className="text-gray-400 text-sm mt-1">Choose a game to play</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <h2 className="text-lg font-semibold text-gray-300 mb-6 uppercase tracking-widest text-sm">
          Available Games
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {games.map((game) => (
            <div
              key={game.route}
              className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col gap-4 hover:border-gray-600 transition-colors"
            >
              <div className="text-4xl">{game.icon}</div>
              <div>
                <h3 className="text-xl font-bold text-white">{game.title}</h3>
                <p className="text-gray-400 text-sm mt-1">{game.description}</p>
              </div>
              <Link
                to={game.route}
                className="mt-auto inline-block text-center bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Play
              </Link>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
