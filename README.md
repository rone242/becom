# Organic Harvest - Ecommerce Platform

This is a modern monorepo ecommerce platform built with Next.js, NestJS, Prisma, Neon DB, and Cloudinary.

## Prerequisites

- Node.js (v18.0.0 or higher)
- npm (v10 or higher)
- A Neon Database (Serverless PostgreSQL)
- A Cloudinary account (for image hosting)
- Redis (optional for local caching; Docker setup included)

## Local Setup Instructions

Follow these steps to run the project on your local machine:

### 1. Install Dependencies

First, install all the required dependencies across the monorepo:

```bash
cd e:\dev\proj\becom
npm install
```

### 2. Set Up Environment Variables

You need to configure the environment variables for both the backend (API) and frontend (Web).

#### Backend (`apps/api/.env`)
Create a `.env` file in `apps/api/` based on the `.env.example`:

```env
# Database (Get this from your Neon console)
DATABASE_URL="postgresql://<user>:<password>@<ep-xxx>.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://<user>:<password>@<ep-xxx>.neon.tech/neondb?sslmode=require"

# Security
JWT_SECRET="your-super-secret-jwt-key"

# Cloudinary (Get this from your Cloudinary dashboard)
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# Server
PORT=4000
FRONTEND_URL="http://localhost:3000"

# Redis
REDIS_URL="redis://localhost:6379"
```

To run Redis locally with Docker:

```bash
docker compose up -d redis
```

#### Frontend (`apps/web/.env.local`)
Create a `.env.local` file in `apps/web/`:

```env
NEXT_PUBLIC_API_URL="http://localhost:4000/api"
NEXT_PUBLIC_WHATSAPP_NUMBER="8801712345678"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret-key"
```

### 3. Database Setup

Once your `DATABASE_URL` is set in `apps/api/.env`, run the following commands from the root directory to initialize the database:

```bash
# Generate Prisma Client
npm run db:generate

# Push schema to database
npm run db:push

# Seed the database with initial data (Admin user, categories, products)
cd packages/database
npm run db:seed
cd ../..
```

### 4. Start the Development Servers

You can start both the Next.js frontend and NestJS backend simultaneously using Turborepo from the root directory:

```bash
npm run dev
```

This will start:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000/api
- **Swagger Docs**: http://localhost:4000/api/docs

### 5. Admin Login

After seeding the database, you can log in as an admin:
- **Phone**: `01700000000`
- **Password**: `Admin@1234`



comands
docker compose down
docker compose up --build

sudo sysctl vm.overcommit_memory=1

docker compose logs -f api