import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Navigation() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  
  const navItems = [
    { path: '/', label: 'Lists' },
    { path: '/social', label: 'Social' },
    { path: '/search', label: 'Search' },
    { path: '/leaderboard', label: 'Leaderboard' },
    { path: '/account', label: 'Account' },
  ]

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="bg-gray-800 text-white p-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <h1 className="text-xl font-bold mr-8">🎬 Movie Club</h1>
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`px-3 py-2 rounded-md ${
                location.pathname === item.path
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center space-x-4">
          {user && (
            <Link
              to="/profile"
              className="text-sm text-gray-300 hover:text-white transition-colors"
            >
              {user.profile?.firstName && user.profile?.lastName 
                ? `${user.profile.firstName} ${user.profile.lastName}`
                : user.email
              }
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 rounded-md transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  )
}