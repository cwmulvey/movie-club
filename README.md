# Movie Club 🎬

Business Logic Requirements
## User Tiers
- Base Users: Can only see top 10 and bottom 10 movies in their ranked list
- Premium Users: $7.99 one-time payment for unlimited access
- Referral System: Base users unlock 10 additional movies (positions 11-20, 21-30, 31-40) per referral, max 3 referrals

## Ranking System
- Movies are placed in three categories: "liked" (6.5-10), "ok" (3.5-6.4), "didn't like" (0-3.4)
- Rankings use binary comparison (halving algorithm) to find position
- Ratings are calculated based on position within category using interpolation formula
- Users can have ties (same rank for multiple movies)

## 🚀 Features

- **Movie Search**: Find movies by title, genre, or other criteria
- **Personal Lists**: Create and manage your own movie lists
- **Social Features**: Share lists and discover what others are watching
- **Leaderboard**: See trending movies and top-rated films
- **User Accounts**: Personalized experience with user profiles
- **Responsive Design**: Beautiful UI that works on all devices

## 🛠️ Tech Stack

- **Frontend**: React with TypeScript
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **Package Manager**: npm

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/movie-club.git
   cd movie-club
   ```

2. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:5173` to see the application

## 🏗️ Project Structure

```
Movie_Club/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   ├── stores/         # State management
│   │   ├── types/          # TypeScript type definitions
│   │   └── utils/          # Utility functions
│   ├── public/             # Static assets
│   └── package.json        # Frontend dependencies
└── README.md              # Project documentation
```

## 🎯 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🙏 Acknowledgments

- Built with React and TypeScript
- Styled with Tailwind CSS
- Icons and assets from various open-source libraries
- Movie Data sourced from The Movie Database

---

Made with ❤️ for movie lovers everywhere 