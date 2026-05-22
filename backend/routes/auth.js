import express from 'express';
import { supabase, supabaseAdmin } from '../config/supabase.js';
import { setUserContext } from '../config/sentry.js';
import { Resend } from 'resend';

const router = express.Router();
let resend = null;

// Initialize Resend only if API key is available
try {
  if (process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
    console.log('✅ Resend email service initialized successfully');
  } else {
    console.warn('⚠️ RESEND_API_KEY not found in environment');
  }
} catch (error) {
  console.error('⚠️ Failed to initialize Resend:', error.message);
}

// Helper function to send approval email
async function sendApprovalEmail(email, name) {
  if (!resend) {
    console.warn('Resend not initialized, skipping email');
    return;
  }

  try {
    const response = await resend.emails.send({
      from: 'noreply@nian-storage.com',
      to: email,
      subject: '✅ Your Nian Storage account has been approved!',
      html: `
        <div style="font-family: 'Syne', sans-serif; background: #F5F7F2; padding: 32px 24px;">
          <div style="max-width: 500px; margin: 0 auto; background: white; padding: 32px; border-radius: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 24px;">
              <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
              <h2 style="margin: 0; color: #2E3D22; font-size: 24px; font-weight: 700;">Welcome to Nian Storage!</h2>
            </div>
            <p style="color: #6B7D5A; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
              Hi ${name || email},
            </p>
            <p style="color: #6B7D5A; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
              Great news! Your account has been approved by our admin team. You can now log in to Nian Storage and start managing your files.
            </p>
            <a href="${process.env.FRONTEND_URL || 'https://nian-storage.vercel.app'}" style="display: inline-block; background: #7BA05B; color: white; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin-bottom: 24px;">
              Go to Nian Storage
            </a>
            <p style="color: #8BA370; font-size: 12px; margin-top: 24px; border-top: 1px solid #E8EDE0; padding-top: 16px;">
              This is an automated email. Please do not reply.
            </p>
          </div>
        </div>
      `
    });

    // Check for Resend API errors in response
    if (response && response.error) {
      console.error('❌ Resend API error (approval):', response.error);
      return;
    }

    console.log('✅ Approval email sent:', response?.id);
  } catch (error) {
    console.error('❌ Email send error (approval):', error.message);
  }
}

// Helper function to send rejection email
async function sendRejectionEmail(email, name) {
  if (!resend) {
    console.warn('Resend not initialized, skipping email');
    return;
  }

  try {
    const response = await resend.emails.send({
      from: 'noreply@nian-storage.com',
      to: email,
      subject: '❌ Your Nian Storage signup was not approved',
      html: `
        <div style="font-family: 'Syne', sans-serif; background: #F5F7F2; padding: 32px 24px;">
          <div style="max-width: 500px; margin: 0 auto; background: white; padding: 32px; border-radius: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 24px;">
              <div style="font-size: 48px; margin-bottom: 16px;">ℹ️</div>
              <h2 style="margin: 0; color: #2E3D22; font-size: 24px; font-weight: 700;">Signup Status Update</h2>
            </div>
            <p style="color: #6B7D5A; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
              Hi ${name || email},
            </p>
            <p style="color: #6B7D5A; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
              Thank you for your interest in Nian Storage. Unfortunately, our admin team was unable to approve your signup at this time.
            </p>
            <p style="color: #8BA370; font-size: 12px; margin-top: 24px; border-top: 1px solid #E8EDE0; padding-top: 16px;">
              If you have any questions, please feel free to reach out to our support team.
            </p>
          </div>
        </div>
      `
    });

    // Check for Resend API errors in response
    if (response && response.error) {
      console.error('❌ Resend API error (rejection):', response.error);
      return;
    }

    console.log('✅ Rejection email sent:', response?.id);
  } catch (error) {
    console.error('❌ Email send error (rejection):', error.message);
  }
}

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

    // ✅ NEW: Trigger Discord webhook notification on signup
    if (process.env.DISCORD_WEBHOOK_URL) {
      try {
        await fetch(process.env.DISCORD_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: `🔔 **New user signup!**\nEmail: ${email}\nName: ${name}\nUser ID: ${userData.id}\n\n**Action needed**: Approve in dashboard or Supabase console`,
            embeds: [{
              color: 7874819, // Green
              fields: [
                { name: 'Email', value: email, inline: true },
                { name: 'Name', value: name, inline: true },
                { name: 'User ID', value: userData.id, inline: false },
                { name: 'Dashboard Link', value: `[Supabase Console](https://app.supabase.com/)`, inline: false }
              ]
            }]
          })
        });
        console.log('✅ Discord webhook sent for new user signup');
      } catch (err) {
        console.error('Discord webhook error:', err);
        // Don't fail registration if webhook fails
      }
    }

    // Set user context for error tracking
    setUserContext({
      id: userData.id,
      email: userData.email,
      username: userData.name,
    });

    res.status(201).json({
      message: 'User registered successfully. Please check your email to confirm your account.',
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
      },
      session: authData.session || null,
      requiresEmailConfirmation: !authData.session,
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

    // ✅ NEW: Check if user is approved
    if (!userData.approved) {
      return res.status(403).json({ 
        error: 'Your account is pending approval',
        status: 'pending_approval',
        message: 'An admin will review your account shortly. You\'ll receive an email once approved.'
      });
    }

    // Set user context for error tracking
    setUserContext({
      id: userData.id,
      email: userData.email,
      username: userData.name,
    });

    res.json({
      message: 'Login successful',
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
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
          role: 'pending',
          approved: false,
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

    // ✅ NEW: Check approval status
    if (!userData.approved) {
      return res.status(403).json({
        error: 'Account pending approval',
        status: 'pending_approval',
        user: {
          id: userData.id,
          email: userData.email,
          name: userData.name,
        }
      });
    }

    // Set user context for error tracking
    setUserContext({
      id: userData.id,
      email: userData.email,
      username: userData.name,
    });

    res.json({
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        storage_used: userData.storage_used,
        storage_total: userData.storage_total,
        oauth_provider: userData.oauth_provider,
        oauth_avatar_url: userData.oauth_metadata?.avatar_url,
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
          oauth_provider: user.app_metadata?.provider || 'unknown',
          oauth_metadata: {
            avatar_url: user.user_metadata?.avatar_url,
            provider: user.app_metadata?.provider,
          },
          last_login_at: new Date().toISOString(),
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

    // Set user context for error tracking
    setUserContext({
      id: userData.id,
      email: userData.email,
      username: userData.name,
    });

    res.json({
      message: 'OAuth login successful',
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        storage_used: userData.storage_used,
        storage_total: userData.storage_total,
        oauth_provider: userData.oauth_provider,
        oauth_avatar_url: userData.oauth_metadata?.avatar_url,
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
    
    // ✅ NEW: Check if we should force account selection
    const forceAccountSelection = req.headers['x-force-account-selection'] === 'true';
    console.log(`[OAuth] Force account selection: ${forceAccountSelection}`);

    // Build OAuth options
    const oauthOptions = {
      redirectTo: redirectUrl,
      skipBrowserRedirect: false,
    };

    // ✅ NEW: Add prompt for account selection if needed
    // After 2 auto-logins, show account picker UI
    if (forceAccountSelection && provider === 'google') {
      oauthOptions.queryParams = {
        prompt: 'select_account', // Forces Google to show account picker
      };
      console.log('[OAuth] Added prompt=select_account to show account picker');
    }
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider,
      options: oauthOptions
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

// =====================================================
// ✅ ADMIN MIDDLEWARE & ENDPOINTS (NEW - Permission System)
// =====================================================

// Admin middleware to check if user is admin
const adminOnly = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.user = { id: user.id };
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all pending users (admin only)
router.get('/admin/pending', adminOnly, async (req, res) => {
  try {
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('id, email, name, created_at, role, approved')
      .eq('approved', false)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all users (admin only)
router.get('/admin/users', adminOnly, async (req, res) => {
  try {
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('id, email, name, role, approved, created_at, updated_at, last_login_at, storage_used, storage_total')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DEBUG: Test endpoint to check rejection without auth (REMOVE LATER)
router.patch('/admin/users/:userId/test-reject', async (req, res) => {
  try {
    console.log(`\n🔴 TEST REJECT ENDPOINT CALLED`);
    const { userId } = req.params;
    const { approved, role } = req.body;

    console.log(`📝 Test: Processing rejection for user ${userId}`);
    console.log(`   approved=${approved}, role=${role}`);
    console.log(`   typeof approved = ${typeof approved}`);

    // Exactly the same logic as the real endpoint
    const updateData = { 
      approved: false, 
      role: role || 'pending',
      rejected: true,
      rejected_at: new Date().toISOString()
    };

    console.log(`📊 Update data:`, updateData);

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('❌ Database update error:', error);
      console.error('   Error message:', error.message);
      console.error('   Error code:', error.code);
      console.error('   Full error:', JSON.stringify(error));
      return res.status(400).json({ error: error.message, code: error.code });
    }

    console.log(`✅ User updated successfully:`, user);
    res.json({ message: 'Test rejection successful', user });
  } catch (error) {
    console.error('❌ Test rejection error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Approve/reject user (admin only)
router.patch('/admin/users/:userId', adminOnly, async (req, res) => {
  try {
    const { userId } = req.params;
    const { approved, role } = req.body;

    console.log(`📝 Processing admin action for user ${userId}: approved=${approved}, role=${role}`);

    if (typeof approved !== 'boolean') {
      console.error('❌ Invalid approved value:', approved);
      return res.status(400).json({ error: 'approved must be boolean' });
    }

    // If rejecting (approved = false), mark as rejected
    const updateData = { 
      approved, 
      role: role || (approved ? 'user' : 'pending')
    };

    if (!approved) {
      updateData.rejected = true;
      updateData.rejected_at = new Date().toISOString();
    }

    console.log(`📊 Update data:`, updateData);

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('❌ Database update error:', error);
      return res.status(400).json({ error: error.message });
    }

    console.log(`✅ User updated:`, user);

    // Send email notification
    try {
      if (approved) {
        await sendApprovalEmail(user.email, user.name);
      } else {
        await sendRejectionEmail(user.email, user.name);
      }
      console.log(`✅ Email sent for user ${user.email} (${approved ? 'approved' : 'rejected'})`);
    } catch (emailError) {
      console.error('❌ Email error:', emailError);
      // Don't fail the request if email fails, but log it
    }

    // Send Discord notification
    if (process.env.DISCORD_WEBHOOK_URL) {
      try {
        await fetch(process.env.DISCORD_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            embeds: [{
              color: approved ? 0x7BA05B : 0xFF6B6B, // Green for approval, Red for rejection
              title: approved ? '✅ User Approved' : '❌ User Rejected',
              fields: [
                { name: 'Email', value: user.email, inline: true },
                { name: 'Name', value: user.name, inline: true },
                { name: 'Action', value: approved ? 'Admin approved signup' : 'Admin rejected signup', inline: false },
                { name: 'Timestamp', value: new Date().toISOString(), inline: true }
              ]
            }]
          })
        });
      } catch (webhookError) {
        console.warn('Discord notification failed:', webhookError);
      }
    }

    console.log(`✅ User ${user.email} ${approved ? 'approved' : 'rejected'}`);

    res.json({ 
      message: `User ${approved ? 'approved' : 'rejected'}`,
      user 
    });
  } catch (error) {
    console.error('❌ Admin action error:', error);
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
