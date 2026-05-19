import { Link } from 'react-router-dom'

export default function ConnectFour() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-6">
      <div className="text-6xl">🔴</div>
      <h1 className="text-4xl font-bold">Connect 4</h1>
      <p className="text-gray-400 text-lg">Game coming soon...</p>
      <Link
        to="/"
        className="bg-gray-800 hover:bg-gray-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
      >
        ← Back to Dashboard
      </Link>
    </div>
  )
}
