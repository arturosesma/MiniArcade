import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import TicTacToe from './pages/TicTacToe'
import ConnectFour from './pages/ConnectFour'
import Hangman from './pages/Hangman'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/tic-tac-toe" element={<TicTacToe />} />
        <Route path="/connect-four" element={<ConnectFour />} />
        <Route path="/hangman" element={<Hangman />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
