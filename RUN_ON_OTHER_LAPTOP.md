# How to Run Live AI Debate Arena on Someone Else's Laptop

## 🚨 Quick Fix for Database Error

If you're getting the error: "Can't reach database server at ep-old-hill-a8v3m4s9-pooler.eastus2.azure.neon.tech:5432"

**The issue is:** The database credentials in your `.env.local` file are either incorrect or the database is not accessible.

## Step-by-Step Setup Guide

### 1. Prerequisites Installation

**On the target laptop, install:**
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Git](https://git-scm.com/)

**Verify installation:**
```bash
node --version
npm --version
git --version
```

### 2. Clone and Setup Project

```bash
# Clone your repository
git clone <your-repository-url>
cd live-ai-debate-arena

# Install dependencies
npm install
```

### 3. Database Setup (Choose One Option)

#### Option A: Use Your Existing Neon Database (Recommended)

1. **Get your Neon database credentials:**
   - Go to [Neon Console](https://console.neon.tech/)
   - Find your project
   - Click "Connection Details"
   - Copy the connection string

2. **Create `.env.local` file:**
   ```env
   DATABASE_URL="postgresql://your_actual_username:your_actual_password@ep-old-hill-a8v3m4s9-pooler.eastus2.azure.neon.tech:5432/debate_arena?sslmode=require"
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_key
   CLERK_SECRET_KEY=sk_test_your_clerk_secret
   OPENROUTER_API_KEY=your_openrouter_key
   NEXTAUTH_SECRET=your_nextauth_secret
   NEXTAUTH_URL=http://localhost:3000
   ```

#### Option B: Create New Cloud Database (Easier for Sharing)

1. **Sign up for free database:**
   - Go to [Neon](https://neon.tech/) (recommended)
   - Create free account
   - Create new project

2. **Get connection string from Neon dashboard**

3. **Create `.env.local` with new database URL**

### 4. Authentication Setup

1. **Go to [Clerk Dashboard](https://dashboard.clerk.com/)**
2. **Create new application or use existing**
3. **Get API keys from "API Keys" section**
4. **Update `.env.local` with your Clerk keys**

### 5. OpenRouter API Setup

1. **Sign up at [OpenRouter](https://openrouter.ai/)**
2. **Get API key from dashboard**
3. **Add to `.env.local`**

### 6. Database Migration

```bash
# Run database migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

### 7. Start the Application

```bash
# Development mode
npm run dev

# Or production mode
npm run build
npm start
```

**The app will be available at:** `http://localhost:3000`

## 🔧 Troubleshooting Common Issues

### Database Connection Error

**If you get "Can't reach database server":**

1. **Check your DATABASE_URL format:**
   ```env
   # Correct format:
   DATABASE_URL="postgresql://username:password@host:5432/database?sslmode=require"
   ```

2. **Test database connection:**
   ```bash
   npx prisma db pull
   ```

3. **Reset database (if needed):**
   ```bash
   npx prisma migrate reset
   ```

4. **Check Neon dashboard:**
   - Ensure database is active
   - Verify credentials are correct
   - Check connection limits

### Permission Errors (Windows)

```bash
# Run PowerShell as Administrator, or use:
npm run dev -- --turbo
```

### Port Already in Use

```bash
# Use different port:
npm run dev -- -p 3001
```

### Missing Dependencies

```bash
# Clear cache and reinstall:
rm -rf node_modules package-lock.json
npm install
```

## 📋 Quick Setup Scripts

### Windows (setup.bat)
```batch
@echo off
echo Installing dependencies...
npm install
echo Setting up database...
npx prisma migrate deploy
echo Starting server...
npm run dev
```

### Mac/Linux (setup.sh)
```bash
#!/bin/bash
echo "Installing dependencies..."
npm install
echo "Setting up database..."
npx prisma migrate deploy
echo "Starting server..."
npm run dev
```

## 🌐 Alternative: Deploy to Cloud (Easiest)

Instead of running locally, deploy to a cloud service:

### Vercel (Recommended)
1. Push code to GitHub
2. Connect to [Vercel](https://vercel.com/)
3. Add environment variables in Vercel dashboard
4. Deploy automatically

### Railway
1. Connect GitHub repo to [Railway](https://railway.app/)
2. Add environment variables
3. Deploy with one click

## 🔐 Security Checklist

- [ ] Never commit `.env.local` files
- [ ] Use strong database passwords
- [ ] Regularly update dependencies
- [ ] Use HTTPS in production
- [ ] Rotate API keys periodically

## 📞 Support

If you encounter issues:
1. Check console for error messages
2. Verify all environment variables are set
3. Ensure database is accessible
4. Check the troubleshooting section above

## 🎯 Quick Commands Summary

```bash
# Full setup sequence:
git clone <repo-url>
cd live-ai-debate-arena
npm install
# Create .env.local with your credentials
npx prisma migrate deploy
npx prisma generate
npm run dev
```

**Your app will be running at:** `http://localhost:3000` 