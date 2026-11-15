# Friends & Memories Backend

Express.js backend API for the Friends & Memories booking system.

## Features

- Branch management
- Service pricing
- Cake and decoration options
- Booking management
- Admin authentication
- Payment processing
- Supabase Postgres integration for multi-branch support

## Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase Postgres project

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file with required variables:
```bash
cp .env.example .env
```

3. Update `.env` with your configuration:
```
PORT=5000
NODE_ENV=development
JWT_SECRET=your_secret_key
ADMIN_PASSWORD=admin123
WHATSAPP_GATEWAY_URL=https://your-gateway-host.com
WHATSAPP_API_TOKEN=your_api_token_here
WHATSAPP_SESSION=default
WHATSAPP_SESSION_PASSWORD=your_session_password_here
ADMIN_PHONE_1=branch_1_admin_whatsapp_number
ADMIN_PHONE_2=branch_2_admin_whatsapp_number
# Copy this URI from Supabase Dashboard → Connect → Transaction pooler.
# It uses port 6543 and postgres.[PROJECT-REF] as the username.
# Used by the live API and Drizzle commands.
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@[POOLER-HOST]:6543/postgres
```

### Running Locally

```bash
npm start
```

Server will run on `http://localhost:5000`

## API Endpoints

### Branches
- `GET /api/branches` - Get all branches
- `GET /api/branches/:id` - Get branch by ID
- `POST /api/branches` - Create new branch (admin)

### Services
- `GET /api/services` - Get all services

### Pricing
- `GET /api/pricing` - Get all pricing
- `GET /api/pricing/:service/:duration` - Get specific pricing
- `PUT /api/pricing` - Update pricing (admin)

### Cakes
- `GET /api/cakes` - Get all cakes
- `POST /api/cakes` - Create cake (admin)
- `PUT /api/cakes/:id` - Update cake (admin)
- `DELETE /api/cakes/:id` - Delete cake (admin)

### Decorations
- `GET /api/decorations` - Get all decorations
- `POST /api/decorations` - Create decoration (admin)
- `PUT /api/decorations/:id` - Update decoration (admin)
- `DELETE /api/decorations/:id` - Delete decoration (admin)

### Occasions
- `GET /api/occasions` - Get all occasions

### Bookings
- `POST /api/bookings` - Create booking
- `GET /api/bookings/:id` - Get booking by ID
- `GET /api/bookings` - Get all bookings (admin)
- `PUT /api/bookings/:id` - Update booking (admin)
- `DELETE /api/bookings/:id` - Cancel booking (admin)

### Availability
- `GET /api/availability/:branchId/:date/:service` - Get available time slots

### Payments
- `POST /api/payments/mock` - Process mock payment
- `POST /api/payments/process` - Process payment

### Admin
- `POST /api/admin/login` - Admin login
- `POST /api/admin/logout` - Admin logout
- `GET /api/admin/dashboard/stats` - Get dashboard statistics (admin)

## Deployment

### Heroku

1. Create a Heroku app:
```bash
heroku create your-app-name
```

2. Set environment variables:
```bash
heroku config:set JWT_SECRET=your_secret_key
heroku config:set ADMIN_PASSWORD=your_password
heroku config:set DATABASE_URL=your_supabase_transaction_pooler_uri
```

3. Deploy:
```bash
git push heroku main
```

### Railway

1. Connect your GitHub repository to Railway
2. Set environment variables in Railway dashboard
3. Deploy automatically on push

### Render

1. Create new Web Service on Render
2. Connect GitHub repository
3. Set environment variables
4. Deploy

## Environment Variables

- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (development/production)
- `JWT_SECRET` - Secret key for JWT tokens
- `ADMIN_PASSWORD` - Admin login password
- `DATABASE_URL` - Supabase Postgres transaction-pooler connection string
- `WHATSAPP_GATEWAY_URL` - WhatsApp API Gateway base URL (required)
- `WHATSAPP_API_TOKEN` - Bearer token for gateway authentication (required)
- `WHATSAPP_SESSION` - Gateway session name used for QR pairing (optional, default: "default")
- `WHATSAPP_SESSION_PASSWORD` - Password to protect new session creation (optional)
- `ADMIN_PHONE_1` - Branch 1 admin WhatsApp number used for booking notifications
- `ADMIN_PHONE_2` - Branch 2 admin WhatsApp number used for booking notifications

## Database

Supabase Postgres is the backend's sole persistent database. A valid
`DATABASE_URL` is required at startup.

### Supabase Postgres

The Postgres schema is in `src/db/schema.js`. Generate a migration after
changing the schema:

```bash
npm run db:generate
npm run db:migrate
```

The API reads and writes these tables directly. Use the transaction-pooler URI
with port 6543; the backend disables prepared statements for compatibility.

## License

MIT
