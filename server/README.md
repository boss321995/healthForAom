# Health Management API - Production Ready 🏥

## Quick Deploy to Render

### 1. Environment Variables Required:
```
NODE_ENV=production
PORT=10000
JWT_SECRET=your-jwt-secret-here
DB_HOST=your-database-host
DB_USER=your-database-user
DB_PASSWORD=your-database-password
DB_NAME=health_management
DB_SSL=true
RENDER_SERVICE_URL=https://your-service-name.onrender.com
```

### 2. Build Command:
```bash
npm install
```

### 3. Start Command:
```bash
npm start
```

## Features for Production

### ✅ Sleep Mode Protection
- Auto keep-alive system (pings self every 10 minutes)
- Health check endpoints: `/api/health`, `/api/ping`, `/api/status`
- Wake-up detection and handling

### ✅ Database Resilience
- Connection pool with automatic reconnection
- Query retry logic for connection failures
- Graceful error handling

### ✅ Performance Optimizations
- Connection pooling for better performance
- Timeout handling (30 seconds)
- Memory usage monitoring

### ✅ Production Security
- Environment-based configuration
- SSL database connections
- Graceful shutdown handling

## API Endpoints

### Health & Status
- `GET /api/health` - Full health check with database test
- `GET /api/ping` - Simple keep-alive endpoint
- `GET /api/status` - Server information and uptime

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Health Data
- `GET /api/health-metrics` - Get user health metrics
- `POST /api/health-metrics` - Save health metrics
- `GET /api/health-behavior` - Get lifestyle data
- `POST /api/health-behavior` - Save lifestyle data

### Analytics
- `GET /api/analytics` - AI-powered health analysis
- `GET /api/trends` - Health trend analysis

## Sleep Mode Handling

When deployed on Render Free Tier:
1. Server sleeps after 15 minutes of inactivity
2. Wake-up takes 20-60 seconds
3. Keep-alive system pings every 10 minutes
4. Frontend shows connection status
5. Auto wake-up when user accesses

## Frontend Integration

Use the provided `ApiManager.js`:

```javascript
import apiManager, { ConnectionIndicator, ServerWakeUp } from './utils/ApiManager';

// Example usage
const data = await apiManager.get('/user/profile');

// Show connection status
<ConnectionIndicator />

// Handle server wake-up
<ServerWakeUp onWakeUp={() => window.location.reload()} />
```

## Database Schema

Required tables:
- `users` - User accounts
- `user_profiles` - User profile information  
- `health_metrics` - Health measurements
- `health_behavior` - Lifestyle data

See migration scripts in `/migrations` folder.

## Monitoring

- Health checks available at `/api/health`
- Logs viewable in Render dashboard
- Connection status tracked automatically
- Performance metrics in health endpoint

## Support

For issues related to:
- Sleep mode: Check keep-alive logs
- Database: Verify connection strings
- API errors: Check /api/health endpoint
- Frontend: Use connection indicator

---

**Ready for production deployment! 🚀**
