# Recipe Generator Backend

AI-powered recipe generation backend built with NestJS, Prisma, and OpenAI.

## Features

- 🔐 JWT Authentication with cookie-based sessions
- 🥬 Pantry management with image recognition
- 🤖 AI-powered recipe generation using OpenAI GPT-4
- 🖼️ AI image generation for recipes
- 📊 Real-time job progress tracking
- 🗄️ PostgreSQL database with Prisma ORM
- 🚀 Queue system with BullMQ and Redis
- 📚 API documentation with Swagger

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL
- Redis
- OpenAI API key (optional, will use mock data without it)

### Installation

```bash
# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your database and API keys

# Setup database
npx prisma generate
npx prisma db push
npm run seed

# Start the server
npm run start:dev
```

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/recipe_generator"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"

# OpenAI (optional)
OPENAI_API_KEY="your-openai-api-key"

# App Config
NODE_ENV="development"
PORT=3001
FRONTEND_URL="http://localhost:3000"
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Pantry Management
- `GET /api/pantry` - Get user's pantry items
- `POST /api/pantry` - Add pantry item
- `PATCH /api/pantry/:id` - Update pantry item
- `DELETE /api/pantry/:id` - Remove pantry item
- `POST /api/pantry/upload-image` - Upload image for ingredient recognition

### Recipe Generation
- `POST /api/recipes/generate` - Generate new recipe
- `GET /api/recipes/requests` - Get user's recipe requests
- `GET /api/recipes/requests/:id` - Get specific recipe request
- `GET /api/recipes/:id` - Get recipe by ID
- `GET /api/recipes/slug/:slug` - Get recipe by slug
- `GET /api/recipes/stream/:jobId` - Stream recipe generation progress (SSE)

### User Management
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `PUT /api/users/preferences` - Update user preferences

## API Documentation

When running in development mode, visit `http://localhost:3001/api/docs` for interactive API documentation.

## Architecture

```
src/
├── auth/           # Authentication module
├── users/          # User management
├── pantry/         # Pantry management
├── recipes/        # Recipe generation and management
├── queue/          # Background job processing
└── prisma/         # Database client and migrations
```

## Recipe Generation Flow

1. User submits recipe request with ingredients and preferences
2. Request is queued for background processing
3. AI generates recipe using OpenAI GPT-4
4. Optional: AI generates food image using DALL-E
5. Recipe is saved to database
6. User receives real-time progress updates via SSE

## Development

```bash
# Run in development mode
npm run start:dev

# Run tests
npm run test

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# View database
npm run prisma:studio

# Seed database with sample data
npm run seed
```

## Production Deployment

1. Set up PostgreSQL and Redis instances
2. Configure environment variables
3. Run database migrations: `npx prisma migrate deploy`
4. Build the application: `npm run build`
5. Start the server: `npm run start:prod`

## License

MIT