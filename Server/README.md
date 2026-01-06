# Invoice App Backend Server

This is the Express.js backend server for the Invoice App v2.0.

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm or yarn

### Installation
All dependencies are already installed in the root `package.json`.

### Environment Variables
Copy `.env.example` to `.env` and update the values:
```bash
cp env.example .env
```

Key environment variables:
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (development/production)
- `DATABASE_URL` - Database connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `ALLOWED_ORIGINS` - CORS allowed origins

## 📁 Project Structure

```
server/
├── index.ts           # Main server file
├── routes/            # API routes
├── controllers/       # Route controllers
├── middleware/        # Custom middleware
├── models/            # Data models
└── README.md          # This file
```

## 🛠️ Development

### Run the server
```bash
# Run both frontend and backend
npm run dev

# Run only the backend
npm run dev:server

# Run only the frontend
npm run dev:client
```

### Build for production
```bash
# Build the server
npm run build:server

# Start production server
npm start
```

## 📝 API Endpoints

### Health Check
- **GET** `/api/health` - Check server status

### Example Routes
- **GET** `/api/example` - Get all examples
- **POST** `/api/example` - Create an example
- **GET** `/api/example/:id` - Get example by ID
- **PUT** `/api/example/:id` - Update example by ID
- **DELETE** `/api/example/:id` - Delete example by ID

## 🔧 Adding New Routes

1. Create a new route file in `server/routes/`:
```typescript
// server/routes/myroute.routes.ts
import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  res.json({ message: 'My route' });
});

export default router;
```

2. Register the route in `server/index.ts`:
```typescript
import myRoutes from './routes/myroute.routes';
app.use('/api/myroute', myRoutes);
```

## 📦 Installed Packages

- **express** - Web framework
- **cors** - CORS middleware
- **helmet** - Security headers
- **morgan** - HTTP request logger
- **compression** - Response compression
- **dotenv** - Environment variables
- **express-validator** - Request validation

### Development Dependencies
- **nodemon** - Auto-restart on file changes
- **ts-node** - TypeScript execution
- **@types/express** - Express TypeScript types
- **@types/cors** - CORS TypeScript types
- **@types/morgan** - Morgan TypeScript types
- **@types/compression** - Compression TypeScript types

## 🔐 Security

- Helmet.js is configured for security headers
- CORS is configured with allowed origins
- Environment variables for sensitive data
- Input validation with express-validator

## 📚 Next Steps

1. Set up your database connection
2. Create authentication middleware
3. Add data models
4. Implement business logic in controllers
5. Add input validation
6. Set up error logging
7. Configure for deployment

## 🐛 Debugging

The server logs are visible in the terminal when running `npm run dev`. Check:
- Port conflicts (default: 5000)
- Database connection issues
- CORS configuration
- Environment variables

## 📄 License

Same as the main Invoice App v2.0 project.

