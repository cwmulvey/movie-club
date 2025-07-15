import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Navigation from './components/Navigation'
import Lists from './pages/Lists'
import Social from './pages/Social'
import Search from './pages/Search'
import Leaderboard from './pages/Leaderboard'
import Account from './pages/Account'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main>
          <Routes>
            <Route path="/" element={<Lists />} />
            <Route path="/social" element={<Social />} />
            <Route path="/search" element={<Search />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/account" element={<Account />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App