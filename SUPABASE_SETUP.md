# Supabase Database Setup for Nian Storage

This guide will help you set up the Supabase database tables for your Nian Storage application.

## 🚀 Quick Start

### 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in the project details and create it
5. Wait for the project to be ready

### 2. Get Your Credentials

Once your project is ready:
1. Go to **Settings** → **API**
2. Copy your **Project URL** (looks like: `https://xxxxx.supabase.co`)
3. Copy your **anon/public key**
4. Create a `.env` file in the `backend` folder:

```bash
cd backend
copy .env.example .env
```

5. Edit your `.env` file and add your Supabase credentials:

```env
PORT=5000
NODE_ENV=development

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
```

### 3. Create Database Tables

Go to your Supabase project dashboard → **SQL Editor** → Click **New Query**

Run these SQL commands one by one:

#### Table 1: Users Profile Table

```sql
-- Create users table (extends Supabase Auth)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  storage_used BIGINT DEFAULT 0,
  storage_total BIGINT DEFAULT 10737418240,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- Create policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Create policy: Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);
```

#### Table 2: Files Table

```sql
-- Create files table
CREATE TABLE public.files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('image', 'video', 'doc')),
  size TEXT NOT NULL,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  url TEXT,
  color TEXT DEFAULT '#7BA05B',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can view their own files
CREATE POLICY "Users can view own files"
  ON public.files FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy: Users can insert their own files
CREATE POLICY "Users can insert own files"
  ON public.files FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can update their own files
CREATE POLICY "Users can update own files"
  ON public.files FOR UPDATE
  USING (auth.uid() = user_id);

-- Create policy: Users can delete their own files
CREATE POLICY "Users can delete own files"
  ON public.files FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_files_user_id ON public.files(user_id);
CREATE INDEX idx_files_type ON public.files(type);
CREATE INDEX idx_files_created_at ON public.files(created_at DESC);
```

#### Optional: Create Updated_at Trigger

```sql
-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for users table
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for files table
CREATE TRIGGER update_files_updated_at
  BEFORE UPDATE ON public.files
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 4. Enable Email Authentication

1. Go to **Authentication** → **Providers**
2. Make sure **Email** is enabled
3. Configure email settings (or use the default for development)

### 5. (Optional) Add Sample Data

If you want to add sample files for testing:

```sql
-- Insert sample user (only works if you've registered via the app)
-- Get your user ID from Authentication → Users tab

-- Then insert sample files (replace YOUR_USER_ID)
INSERT INTO public.files (user_id, name, type, size, size_bytes, color) VALUES
  ('YOUR_USER_ID', 'Vacation 2025.jpg', 'image', '3.2 MB', 3355443, '#7BA05B'),
  ('YOUR_USER_ID', 'Project Report.pdf', 'doc', '1.1 MB', 1153434, '#5B8C7A'),
  ('YOUR_USER_ID', 'Birthday Video.mp4', 'video', '48 MB', 50331648, '#A0845C'),
  ('YOUR_USER_ID', 'Profile Photo.png', 'image', '2.4 MB', 2516582, '#6B9E6B'),
  ('YOUR_USER_ID', 'Notes.txt', 'doc', '12 KB', 12288, '#7A8C5B'),
  ('YOUR_USER_ID', 'Family Trip.mp4', 'video', '120 MB', 125829120, '#8C7A5B');
```

## 📋 Database Schema Overview

### Users Table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key, references auth.users |
| email | TEXT | User's email address |
| name | TEXT | User's display name |
| storage_used | BIGINT | Current storage used in bytes |
| storage_total | BIGINT | Total storage limit in bytes (default: 10GB) |
| created_at | TIMESTAMP | Account creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

### Files Table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key, auto-generated |
| user_id | UUID | Foreign key to users table |
| name | TEXT | File name |
| type | TEXT | File type: 'image', 'video', or 'doc' |
| size | TEXT | Human-readable size (e.g., "3.2 MB") |
| size_bytes | BIGINT | Size in bytes for calculations |
| url | TEXT | URL to file in Supabase Storage (optional) |
| color | TEXT | Color for UI display |
| created_at | TIMESTAMP | Upload timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

## 🔒 Security (Row Level Security)

All tables use Row Level Security (RLS) to ensure:
- Users can only see their own data
- Users can only modify their own data
- No user can access another user's files or profile

## ✅ Verify Setup

After creating the tables, verify them:

1. Go to **Table Editor** in Supabase dashboard
2. You should see `users` and `files` tables
3. Try registering a new user in your app
4. Check the **Authentication** → **Users** tab to see the new user
5. Check the **users** table to see the profile data

## 🚨 Troubleshooting

**Problem: "relation public.users does not exist"**
- Solution: Make sure you ran the SQL commands in the SQL Editor

**Problem: "new row violates row-level security policy"**
- Solution: Make sure RLS policies are created correctly

**Problem: Can't insert user profile**
- Solution: The user must be authenticated first via Supabase Auth

## 📚 Next Steps

1. Install Supabase package: `cd backend && npm install`
2. Restart your backend server
3. Test registration and login in your app
4. Files will now be stored in the database!

For file storage (actual file uploads), you can later integrate Supabase Storage:
- Go to **Storage** in Supabase dashboard
- Create a bucket called `files`
- Update the upload endpoint to store actual files

---

**Need help?** Check the [Supabase Documentation](https://supabase.com/docs)
