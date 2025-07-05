# Environment Setup Guide

## Step 1: Create Environment File

Create a `.env.local` file in your project root with the following content:

```env
# Database Configuration
# Option 1: Use your existing Neon database (recommended for sharing)
DATABASE_URL="postgresql://your_neon_username:your_neon_password@ep-old-hill-a8v3m4s9-pooler.eastus2.azure.neon.tech:5432/debate_arena?sslmode=require"

# Option 2: Use a new cloud database (if you want to create a fresh one)
# DATABASE_URL="postgresql://username:password@your-new-db-host:5432/debate_arena?sslmode=require"

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key_here
CLERK_SECRET_KEY=sk_test_your_clerk_secret_key_here

# OpenRouter API (for AI feedback and analysis)
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Next.js Configuration
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=http://localhost:3000
```

## Step 2: Database Setup Options

### Option A: Use Your Existing Neon Database (Recommended)

1. **Get your Neon database credentials:**
   - Go to your [Neon Dashboard](https://console.neon.tech/)
   - Find your project
   - Copy the connection string from the "Connection Details" section

2. **Update the DATABASE_URL in .env.local:**
   ```env
   DATABASE_URL="postgresql://your_actual_username:your_actual_password@ep-old-hill-a8v3m4s9-pooler.eastus2.azure.neon.tech:5432/debate_arena?sslmode=require"
   ```

3. **Run database migrations:**
   ```bash
   npx prisma migrate deploy
   ```

### Option B: Create a New Cloud Database

1. **Sign up for a free database service:**
   - [Neon](https://neon.tech/) (Recommended)
   - [Supabase](https://supabase.com/)
   - [Railway](https://railway.app/)

2. **Create a new database and get the connection string**

3. **Update the DATABASE_URL in .env.local**

4. **Run database migrations:**
   ```bash
   npx prisma migrate deploy
   ```

## Step 3: Clerk Authentication Setup

1. **Go to [Clerk Dashboard](https://dashboard.clerk.com/)**
2. **Create a new application or use existing one**
3. **Get your API keys:**
   - Go to "API Keys" section
   - Copy the "Publishable Key" and "Secret Key"
4. **Update your .env.local:**
   ```env
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_actual_key_here
   CLERK_SECRET_KEY=sk_test_actual_key_here
   ```

## Step 4: OpenRouter API Setup

1. **Sign up at [OpenRouter](https://openrouter.ai/)**
2. **Get your API key from the dashboard**
3. **Update your .env.local:**
   ```env
   OPENROUTER_API_KEY=your_actual_openrouter_key_here
   ```

## Step 5: Test the Setup

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Check for errors in the console**

3. **Visit http://localhost:3000**

## Troubleshooting Database Issues

### If you get "Can't reach database server" error:

1. **Check your DATABASE_URL format:**
   - Make sure it includes `?sslmode=require` at the end
   - Verify username and password are correct
   - Check that the host and port are correct

2. **Test database connection:**
   ```bash
   npx prisma db pull
   ```

3. **Reset database (if needed):**
   ```bash
   npx prisma migrate reset
   ```

4. **Check Neon dashboard:**
   - Ensure your database is active
   - Check if there are any connection limits
   - Verify your IP is not blocked

### Common Issues and Solutions:

1. **SSL Mode Required:**
   - Add `?sslmode=require` to your DATABASE_URL

2. **Wrong Credentials:**
   - Double-check username and password in Neon dashboard

3. **Database Not Created:**
   - Run `npx prisma migrate deploy` to create tables

4. **Connection Pool Issues:**
   - Add `?connection_limit=1` to your DATABASE_URL

## Quick Setup Commands

```bash
# Install dependencies
npm install

# Set up database
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Start development server
npm run dev
```

## Security Notes

- Never commit `.env.local` to version control
- Use environment variables for all sensitive data
- Regularly rotate your API keys
- Use HTTPS in production 