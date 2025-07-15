import { Link, useLocation } from 'react-router-dom'

export default function Navigation() {
  const location = useLocation()
  
  const navItems = [
    { path: '/', label: 'Lists' },
    { path: '/social', label: 'Social' },
    { path: '/search', label: 'Search' },
    { path: '/leaderboard', label: 'Leaderboard' },
    { path: '/account', label: 'Account' },
  ]

  return (
    <nav className="bg-gray-800 text-white p-4">
      <div className="max-w-7xl mx-auto flex space-x-6">
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
    </nav>
  )
}