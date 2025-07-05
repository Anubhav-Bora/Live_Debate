# Live AI Debate Arena - Setup Instructions

## Prerequisites

Before running the application, ensure the following software is installed on the target laptop:

### 1. Node.js (v18 or higher)
- Download from: https://nodejs.org/
- Verify installation: `node --version` and `npm --version`

### 2. Git
- Download from: https://git-scm.com/
- Verify installation: `git --version`

### 3. PostgreSQL Database
- Download from: https://www.postgresql.org/download/
- Or use a cloud database service like:
  - [Supabase](https://supabase.com/) (Free tier available)
  - [Neon](https://neon.tech/) (Free tier available)
  - [Railway](https://railway.app/) (Free tier available)

## Setup Steps

### 1. Clone the Repository
```bash
git clone <your-repository-url>
cd live-ai-debate-arena
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration

Create a `.env.local` file in the root directory with the following variables:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/debate_arena"
# Or use your cloud database URL

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key
CLERK_SECRET_KEY=sk_test_your_clerk_secret_key

# OpenRouter API (for AI feedback)
OPENROUTER_API_KEY=your_openrouter_api_key

# Next.js
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000

# Socket.IO (if using external server)
# SOCKET_URL=your_socket_server_url
```

### 4. Database Setup

#### Option A: Local PostgreSQL
1. Create a new database:
```sql
CREATE DATABASE debate_arena;
```

2. Run Prisma migrations:
```bash
npx prisma migrate dev
```

#### Option B: Cloud Database (Recommended)
1. Sign up for a free database service (Supabase, Neon, etc.)
2. Get your database connection URL
3. Update the `DATABASE_URL` in `.env.local`
4. Run migrations:
```bash
npx prisma migrate deploy
```

### 5. Clerk Authentication Setup
1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Create a new application
3. Copy your publishable and secret keys
4. Update the Clerk environment variables

### 6. OpenRouter API Setup
1. Sign up at [OpenRouter](https://openrouter.ai/)
2. Get your API key
3. Add it to the environment variables

### 7. Build and Run

#### Development Mode
```bash
npm run dev
```

#### Production Mode
```bash
npm run build
npm start
```

The application will be available at `http://localhost:3000`

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Verify your `DATABASE_URL` is correct
   - Ensure the database server is running
   - Check firewall settings

2. **Clerk Authentication Issues**
   - Verify your Clerk keys are correct
   - Check that your domain is whitelisted in Clerk dashboard

3. **Port Already in Use**
   - Change the port: `npm run dev -- -p 3001`
   - Or kill the process using port 3000

4. **Permission Errors (Windows)**
   - Run PowerShell as Administrator
   - Or use WSL (Windows Subsystem for Linux)

### Windows-Specific Notes

If you encounter permission errors with the `.next` directory:
```bash
# Run as Administrator or use:
npm run dev -- --turbo
```

## Quick Start Script

Create a `setup.bat` (Windows) or `setup.sh` (Mac/Linux) file:

**Windows (setup.bat):**
```batch
@echo off
echo Installing dependencies...
npm install
echo Setting up database...
npx prisma migrate deploy
echo Starting development server...
npm run dev
```

**Mac/Linux (setup.sh):**
```bash
#!/bin/bash
echo "Installing dependencies..."
npm install
echo "Setting up database..."
npx prisma migrate deploy
echo "Starting development server..."
npm run dev
```

## Deployment Options

### Vercel (Recommended)
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically

### Railway
1. Connect your GitHub repository
2. Add environment variables
3. Deploy with one click

### Netlify
1. Connect your repository
2. Set build command: `npm run build`
3. Set publish directory: `.next`
4. Add environment variables

## Security Notes

- Never commit `.env.local` files to version control
- Use strong, unique passwords for databases
- Regularly update dependencies
- Use HTTPS in production

## Support

If you encounter issues:
1. Check the console for error messages
2. Verify all environment variables are set
3. Ensure all prerequisites are installed
4. Check the troubleshooting section above 