# Movie Club Backend

A fully-configured Node.js/Express backend API with TypeScript, MongoDB, and Redis integration. Features comprehensive authentication types, security middleware, error handling, and testing setup.

## Prerequisites

- Node.js (v18+)
- npm
- MongoDB Atlas account (✅ **Already configured**)
- Redis server (✅ **Production server configured, local development ready**)

## Installation & Current Status

✅ **Already Complete** - The backend is fully set up and configured.

### What's Already Done:
- ✅ **Dependencies installed** (authentication, security, Redis, testing)
- ✅ **TypeScript configuration** with comprehensive type definitions
- ✅ **MongoDB connection** working with Atlas cloud database
- ✅ **Redis integration** (optional, works with/without Redis URL)
- ✅ **Security middleware** (Helmet, CORS, compression, rate limiting ready)
- ✅ **Error handling** with professional error middleware
- ✅ **Testing framework** (Jest + Supertest configured)
- ✅ **Health check endpoint** monitoring both databases
- ✅ **Environment configuration** centralized and typed

### To Get Started:
1. **Development**: `npm run dev` (MongoDB + local Redis)
2. **Testing**: `npm test`  
3. **Build**: `npm run build`

## Environment Variables

✅ **Current Configuration** (already set up in `.env`):

```env
# Application Configuration
NODE_ENV=development
PORT=5000

# TMDB API (✅ Working)
TMDB_API_KEY=27189f90fa2868f25bcc259b13c17571

# MongoDB Atlas (✅ Connected)
MONGODB_URI=mongodb+srv://movieclub-admin:...@movieclub.vssciqs.mongodb.net/...

# Redis Local Development (✅ Working)
REDIS_URL=redis://localhost:6379
```

### Optional JWT Configuration (for future authentication):
```env
# JWT Configuration (add when implementing auth)
JWT_ACCESS_SECRET=your_jwt_access_secret_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_here
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
```

## Database Configuration

### MongoDB Atlas ✅ **CONFIGURED & WORKING**
- **Status**: Connected to cloud database
- **Cluster**: movieclub.vssciqs.mongodb.net
- **User**: movieclub-admin (configured)
- **Test**: Access `/api/health` - database shows "healthy"

### Redis Configuration ✅ **READY FOR BOTH ENVIRONMENTS**

#### Development (Local) ✅ **ACTIVE**
- **Status**: Running locally via Homebrew
- **URL**: `redis://localhost:6379`
- **Management**: 
  - Start: `brew services start redis`
  - Stop: `brew services stop redis`
  - Test: `redis-cli ping` → PONG

#### Production Server ✅ **CONFIGURED**
- **Server**: Ubuntu Digital Ocean droplet (`138.197.67.51`)
- **Password**: `MovieClub2024Redis!`
- **Status**: Installed, configured, and running
- **Security**: localhost-only binding (127.0.0.1)
- **Service**: Auto-starts on boot via systemd

**Production Test:**
```bash
ssh root@138.197.67.51
redis-cli -a MovieClub2024Redis! ping  # Returns: PONG
```

## Development

### Running the Server ✅ **READY**

```bash
npm run dev
```

**Expected Output:**
```
Redis connected successfully
MongoDB Connected  
Server running on port 5000
```

**Server URLs:**
- API: `http://localhost:5000`
- Health Check: `http://localhost:5000/api/health`
- TMDB Test: `http://localhost:5000/api/test/tmdb/batman`

### Available Scripts ✅ **CONFIGURED**

- `npm run dev` - Start development server (TypeScript + hot reload)
- `npm run build` - Build TypeScript to JavaScript  
- `npm start` - Start production server from built files
- `npm test` - Run Jest test suite
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate test coverage report

## API Endpoints

### Currently Available ✅
- **Health Check**: `GET /api/health` - System status (MongoDB + Redis)
- **TMDB Integration**: `GET /api/test/tmdb/:query` - Movie search via TMDB API
- **Root**: `GET /` - API welcome message

### Ready to Implement 🚀
The backend is fully prepared with TypeScript types and middleware for:
- **Authentication** - JWT tokens, user registration/login
- **User Management** - User profiles, roles, security features  
- **Movie Features** - Ratings, reviews, watchlists, favorites
- **Rate Limiting** - Redis-backed API protection
- **Error Handling** - Comprehensive error responses

## Production Deployment

### Digital Ocean App Platform

The application is configured for deployment on Digital Ocean App Platform:

1. **Server**: Ubuntu droplet at `138.197.67.51`
2. **MongoDB**: Atlas cloud database
3. **Redis**: Local Redis server on the droplet
4. **Environment**: Production environment variables set in App Platform

### Database Connections

- **MongoDB**: Connected via Atlas cloud service
- **Redis**: Connected to local Redis instance on the same server

## Troubleshooting

### MongoDB Connection Issues
- Verify `MONGODB_URI` is correctly formatted
- Check MongoDB Atlas IP whitelist
- Ensure database user has proper permissions
- Verify cluster is running

### Redis Connection Issues
- Check if Redis service is running: `systemctl status redis-server`
- Verify authentication: `redis-cli -a MovieClub2024Redis! ping`
- Check Redis logs: `journalctl -u redis-server`

### Server Won't Start
- Check all environment variables are set
- Verify Node.js version compatibility
- Check for port conflicts
- Review server logs for specific error messages

## Tech Stack ✅ **FULLY CONFIGURED**

### Core
- **Runtime**: Node.js v18+
- **Framework**: Express.js v5
- **Language**: TypeScript (with comprehensive types)
- **Testing**: Jest + Supertest

### Databases  
- **Primary**: MongoDB Atlas (cloud)
- **Cache**: Redis (local dev + production server)

### Security & Middleware
- **Security**: Helmet (CSP, HSTS, etc.)
- **CORS**: Configured for frontend integration
- **Rate Limiting**: express-rate-limit + rate-limit-redis (ready)
- **Authentication**: bcryptjs + jsonwebtoken (ready)
- **Validation**: Joi (ready)

### External Services
- **Movie Data**: TMDB API (The Movie Database) 
- **Deployment**: Digital Ocean App Platform (configured)

### File Structure
```
src/
├── config/           # Database and app configuration
├── middleware/       # Error handling, auth (ready)
├── types/           # TypeScript definitions
├── utils/           # Custom error classes
├── __tests__/       # Jest test files
└── services/        # TMDB and other external services
```

## Contact

For deployment access or server management, connect to:
```bash
ssh root@138.197.67.51
```