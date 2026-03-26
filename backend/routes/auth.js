import express from 'express';
import { supabase, supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validate input
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Create user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    // Upsert user profile (in case of retry or race condition)
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .upsert(
        {
          id: authData.user.id,
          email,
          name,
          storage_used: 0,
          storage_total: 10737418240, // 10 GB in bytes
        },
        { 
          onConflict: 'id',
          ignoreDuplicates: false 
        }
      )
      .select()
      .single();

    if (userError) {
      return res.status(400).json({ error: userError.message });
    }

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
      },
      session: authData.session,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Sign in with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get user profile
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (userError) {
      return res.status(400).json({ error: userError.message });
    }

    res.json({
      message: 'Login successful',
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        storage_used: userData.storage_used,
        storage_total: userData.storage_total,
      },
      session: authData.session,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get user profile (use admin to bypass RLS since we already verified token)
    let { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    // If user doesn't exist, create their record (handles edge cases)
    if (userError && userError.code === 'PGRST116') {
      console.log('User record not found, creating one...');
      const { data: newUserData, error: createError } = await supabaseAdmin
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name || user.email?.split('@')[0],
          storage_used: 0,
          storage_total: 10737418240, // 10 GB
        })
        .select()
        .single();

      if (createError) {
        console.error('Failed to create user record:', createError);
        return res.status(400).json({ error: 'Failed to initialize user account' });
      }
      userData = newUserData;
    } else if (userError) {
      console.error('User lookup error:', userError);
      return res.status(400).json({ error: userError.message });
    }

    res.json({
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        storage_used: userData.storage_used,
        storage_total: userData.storage_total,
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: error.message });
  }
});

// OAuth Callback - Exchange code for session (MUST come before /oauth/:provider)
router.post('/oauth/callback', async (req, res) => {
  try {
    const { access_token, refresh_token } = req.body;

    if (!access_token) {
      return res.status(400).json({ error: 'Access token required' });
    }

    // Get user from access token
    const { data: { user }, error: userError } = await supabase.auth.getUser(access_token);

    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Upsert user profile (insert if not exists, or return existing)
    const { data: userData, error: upsertError } = await supabaseAdmin
      .from('users')
      .upsert(
        {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name || user.email?.split('@')[0],
          storage_used: 0,
          storage_total: 10737418240, // 10 GB
        },
        { 
          onConflict: 'id',
          ignoreDuplicates: false 
        }
      )
      .select()
      .single();

    if (upsertError) {
      console.error('User upsert error:', upsertError);
      return res.status(400).json({ error: upsertError.message });
    }

    res.json({
      message: 'OAuth login successful',
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        storage_used: userData.storage_used,
        storage_total: userData.storage_total,
      },
      session: {
        access_token,
        refresh_token,
      }
    });
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).json({ error: error.message });
  }
});

// OAuth Login (Google, GitHub)
router.post('/oauth/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    
    console.log('OAuth request received for provider:', provider);
    
    if (!['google', 'github'].includes(provider)) {
      console.log('Invalid provider. Allowed: google, github');
      return res.status(400).json({ error: 'Invalid OAuth provider' });
    }

    console.log('Initiating Supabase OAuth for:', provider);
    
    // Determine redirect URL based on environment
    // IMPORTANT: This URL MUST be configured in Supabase Dashboard > Authentication > Providers
    let redirectUrl;
    
    if (process.env.NODE_ENV === 'production') {
      redirectUrl = 'https://nian-storage.vercel.app';
    } else {
      // For development: use localhost with port
      redirectUrl = 'http://localhost:3000';
    }
    
    console.log(`[OAuth] Environment: ${process.env.NODE_ENV || 'not set'}`);
    console.log(`[OAuth] Redirect URL: ${redirectUrl}`);
    console.log(`[OAuth] Provider: ${provider}`);
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider,
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: false,
      }
    });

    if (error) {
      console.error('Supabase OAuth error:', error);
      return res.status(400).json({ error: error.message });
    }

    console.log('OAuth URL generated:', data.url);
    res.json({ url: data.url });
  } catch (error) {
    console.error('OAuth error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Logout
router.post('/logout', async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
