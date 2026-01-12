# Rasaswadaya Backend API

A RESTful API server for the Rasaswadaya Sri Lankan Cultural Arts Platform.

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: Supabase PostgreSQL
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- A Supabase project

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Update the `.env` file with your Supabase credentials

5. Start the development server:
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:3001`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires auth)
- `PUT /api/auth/profile` - Update profile (requires auth)
- `PUT /api/auth/password` - Change password (requires auth)

### Events
- `GET /api/events` - Get all events (with filters)
- `GET /api/events/featured` - Get featured events
- `GET /api/events/upcoming` - Get upcoming events
- `GET /api/events/:id` - Get event by ID
- `POST /api/events` - Create event (organizer/admin)
- `PUT /api/events/:id` - Update event (organizer/admin)
- `DELETE /api/events/:id` - Delete event (organizer/admin)
- `POST /api/events/:id/interest` - Express interest (auth)
- `DELETE /api/events/:id/interest` - Remove interest (auth)

### Artists
- `GET /api/artists` - Get all artists
- `GET /api/artists/:id` - Get artist by ID
- `POST /api/artists` - Create artist profile (auth)
- `PUT /api/artists/:id` - Update artist profile (auth)
- `DELETE /api/artists/:id` - Delete artist (admin)
- `POST /api/artists/:id/follow` - Follow artist (auth)
- `DELETE /api/artists/:id/follow` - Unfollow artist (auth)

### Academies
- `GET /api/academies` - Get all academies
- `GET /api/academies/:id` - Get academy by ID
- `POST /api/academies` - Create academy (admin)
- `PUT /api/academies/:id` - Update academy (admin)
- `DELETE /api/academies/:id` - Delete academy (admin)
- `GET /api/academies/:id/courses` - Get academy courses
- `POST /api/academies/:id/enquiries` - Send enquiry (auth)

### Products & Stores
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create product (store owner)
- `PUT /api/products/:id` - Update product (store owner)
- `DELETE /api/products/:id` - Delete product (store owner)
- `GET /api/stores` - Get all stores
- `GET /api/stores/:id` - Get store by ID
- `POST /api/stores` - Create store (auth)

### Cart & Orders
- `GET /api/cart` - Get cart (auth)
- `POST /api/cart` - Add to cart (auth)
- `PUT /api/cart/:productId` - Update cart item (auth)
- `DELETE /api/cart/:productId` - Remove from cart (auth)
- `DELETE /api/cart` - Clear cart (auth)
- `GET /api/orders` - Get user orders (auth)
- `GET /api/orders/:id` - Get order by ID (auth)
- `POST /api/orders` - Create order (auth)
- `PUT /api/orders/:id/cancel` - Cancel order (auth)

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://...

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Server
PORT=3001
NODE_ENV=development

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# Frontend
FRONTEND_URL=http://localhost:3000
```

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run db:push` - Push Prisma schema to database
- `npm run db:generate` - Generate Prisma client
- `npm run db:studio` - Open Prisma Studio

## Project Structure

```
backend/
├── src/
│   ├── controllers/     # Request handlers
│   ├── routes/          # API route definitions
│   ├── middleware/      # Express middleware
│   ├── lib/             # Utilities & database client
│   └── index.ts         # App entry point
├── prisma/
│   └── schema.prisma    # Database schema
├── .env                 # Environment variables
├── package.json
└── tsconfig.json
```

## License

MIT
