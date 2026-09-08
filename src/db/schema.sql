-- Students Renewed Hope Project — database schema
-- Matches the v1.0 product architecture doc's data model, with password
-- hashes added for real authentication (not specified in the doc, since
-- that predates deciding on JWT auth).

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------- states ----------
CREATE TABLE IF NOT EXISTS states (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  code VARCHAR(5) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending')),
  coordinator_id INTEGER, -- FK to admins, added after admins table exists
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A state can have more than one active community link (e.g. two WhatsApp
-- groups when the first fills up) — modeled as its own table rather than
-- a single column on states.
CREATE TABLE IF NOT EXISTS state_community_links (
  id SERIAL PRIMARY KEY,
  state_id INTEGER NOT NULL REFERENCES states(id) ON DELETE CASCADE,
  label VARCHAR(50) NOT NULL,       -- e.g. "Group 1"
  note VARCHAR(50),                 -- e.g. "Nearly full", "Open"
  url TEXT NOT NULL,
  member_count INTEGER,             -- manually updated by a coordinator/admin
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- institutions ----------
CREATE TABLE IF NOT EXISTS institutions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  state_id INTEGER NOT NULL REFERENCES states(id),
  type VARCHAR(50), -- e.g. 'university', 'polytechnic', 'college'
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE institutions
  DROP CONSTRAINT IF EXISTS uq_institutions_name_state,
  ADD CONSTRAINT uq_institutions_name_state UNIQUE (name, state_id);

-- ---------- students ----------
CREATE TABLE IF NOT EXISTS students (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  phone VARCHAR(20),
  state_id INTEGER NOT NULL REFERENCES states(id),
  institution_id INTEGER REFERENCES institutions(id),
  institution_name_freetext VARCHAR(200), -- fallback if institution isn't in our list yet
  level VARCHAR(30),
  ward VARCHAR(100),
  lga VARCHAR(100),
  profile_photo_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_students_state ON students(state_id);
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);

-- ---------- cards ----------
CREATE TABLE IF NOT EXISTS cards (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  template_id VARCHAR(50) DEFAULT 'default',
  ward VARCHAR(100),
  lga VARCHAR(100),
  image_url TEXT, -- set once the rendered PNG is uploaded to Cloud Storage
  share_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cards_student ON cards(student_id);

-- ---------- news ----------
CREATE TABLE IF NOT EXISTS news (
  id SERIAL PRIMARY KEY,
  title VARCHAR(300) NOT NULL,
  slug VARCHAR(300) NOT NULL UNIQUE,
  excerpt TEXT,
  body TEXT,
  category VARCHAR(30) NOT NULL DEFAULT 'community' CHECK (category IN ('community', 'product', 'policy')),
  cover_image TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  author_id INTEGER, -- FK to admins, added after admins table exists
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_news_status ON news(status, published_at DESC);

-- ---------- admins ----------
CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(30) NOT NULL CHECK (role IN ('super_admin', 'national_admin', 'state_coordinator', 'content_staff')),
  state_id INTEGER REFERENCES states(id), -- null for national-level roles
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE states
  DROP CONSTRAINT IF EXISTS fk_states_coordinator,
  ADD CONSTRAINT fk_states_coordinator FOREIGN KEY (coordinator_id) REFERENCES admins(id);

ALTER TABLE news
  DROP CONSTRAINT IF EXISTS fk_news_author,
  ADD CONSTRAINT fk_news_author FOREIGN KEY (author_id) REFERENCES admins(id);

-- ---------- activity_events ----------
-- Deliberately generic (event_type + metadata) rather than one table per
-- event, per the v1.0 doc: "This gives us flexibility later."
CREATE TABLE IF NOT EXISTS activity_events (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE SET NULL,
  event_type VARCHAR(50) NOT NULL, -- student_registered, card_generated, card_shared, community_clicked, news_viewed
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_type ON activity_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_student ON activity_events(student_id);

-- ---------- contact messages ----------
-- Captures contact-form submissions in the CRM in addition to (or instead
-- of) the mailto fallback the frontend uses today.
CREATE TABLE IF NOT EXISTS contact_messages (
  id SERIAL PRIMARY KEY,
  reason VARCHAR(100),
  name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL,
  state_id INTEGER REFERENCES states(id),
  message TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
