-- MAD DEV - User Audit Logging, Data Isolation & Privacy Migration Schema

-- 1. Create Users Master Table
CREATE TABLE IF NOT EXISTS maddev_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  github_username VARCHAR(100),
  leetcode_handle VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Auth Audit Logs (Track Login / Logout Events)
CREATE TABLE IF NOT EXISTS maddev_auth_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES maddev_users(id) ON DELETE CASCADE,
  user_email VARCHAR(255) NOT NULL,
  event_type VARCHAR(50) NOT NULL, -- 'LOGIN', 'LOGOUT', 'SWITCH_PROFILE'
  ip_address VARCHAR(45) DEFAULT '127.0.0.1',
  user_agent TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create User GitHub & LeetCode Synced Data Table
CREATE TABLE IF NOT EXISTS maddev_user_profiles_data (
  user_id UUID PRIMARY KEY REFERENCES maddev_users(id) ON DELETE CASCADE,
  github_username VARCHAR(100),
  github_avatar VARCHAR(255),
  github_repos_count INT DEFAULT 0,
  github_stars_count INT DEFAULT 0,
  leetcode_handle VARCHAR(100),
  leetcode_solved_total INT DEFAULT 0,
  leetcode_ranking INT DEFAULT 0,
  last_synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_maddev_audit_user_id ON maddev_auth_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_maddev_audit_event_type ON maddev_auth_audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_maddev_audit_timestamp ON maddev_auth_audit_logs(timestamp DESC);

-- 5. Row Level Security (RLS) Policies for Privacy
ALTER TABLE maddev_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE maddev_auth_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE maddev_user_profiles_data ENABLE ROW LEVEL SECURITY;

-- Allow users to view & update only their own profile data
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own profile') THEN
    CREATE POLICY "Users can view own profile" ON maddev_users FOR SELECT USING (auth.uid() = id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own synced profile data') THEN
    CREATE POLICY "Users can view own synced profile data" ON maddev_user_profiles_data FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own audit logs') THEN
    CREATE POLICY "Users can insert own audit logs" ON maddev_auth_audit_logs FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
  END IF;
END $$;
