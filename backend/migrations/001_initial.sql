-- ============================================================
-- TTD AI — Initial Database Schema
-- Run against PostgreSQL 15+ (Supabase or Azure DB)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── mailboxes ─────────────────────────────────────────────────
CREATE TABLE mailboxes (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email               TEXT UNIQUE NOT NULL,
    display_name        TEXT NOT NULL,
    short_name          TEXT NOT NULL,
    oauth_access_token  TEXT,
    oauth_refresh_token TEXT,
    token_expires_at    TIMESTAMPTZ,
    unread_count        INTEGER DEFAULT 0,
    last_synced_at      TIMESTAMPTZ,
    active              BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- seed the two owner mailboxes
INSERT INTO mailboxes (email, display_name, short_name) VALUES
    ('lior@lbatech.com',    'LBATech',  'lbatech'),
    ('liorba@mepsltn.com',  'Mepsltn',  'mepsltn');

-- ── companies ────────────────────────────────────────────────
CREATE TABLE companies (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT NOT NULL,
    domain      TEXT,
    logo_url    TEXT,
    notes       TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── contacts ─────────────────────────────────────────────────
CREATE TABLE contacts (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id  UUID REFERENCES companies(id) ON DELETE SET NULL,
    full_name   TEXT NOT NULL,
    email       TEXT,
    phone       TEXT,
    whatsapp    TEXT,
    role        TEXT,
    avatar_url  TEXT,
    initials    TEXT GENERATED ALWAYS AS (
        UPPER(LEFT(full_name, 1)) ||
        UPPER(LEFT(SPLIT_PART(full_name, ' ', 2), 1))
    ) STORED,
    notes       TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── tasks ─────────────────────────────────────────────────────
CREATE TABLE tasks (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    description  TEXT NOT NULL,
    due_date     DATE,
    start_date   DATE,
    priority     SMALLINT NOT NULL DEFAULT 3 CHECK (priority IN (1,2,3)),
    status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','in_progress','completed','archived')),
    source       TEXT DEFAULT 'web'
                 CHECK (source IN ('whatsapp_text','whatsapp_voice','web','outlook_flag','ai_agent')),
    sort_order   INTEGER DEFAULT 0,
    mailbox_id   UUID REFERENCES mailboxes(id) ON DELETE SET NULL,
    contact_id   UUID REFERENCES contacts(id) ON DELETE SET NULL,
    meeting_id   UUID,  -- FK added after meetings table
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    deleted_at   TIMESTAMPTZ
);

CREATE INDEX idx_tasks_status     ON tasks(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_priority   ON tasks(priority) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_due_date   ON tasks(due_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_mailbox    ON tasks(mailbox_id) WHERE deleted_at IS NULL;

-- ── meetings ─────────────────────────────────────────────────
CREATE TABLE meetings (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title            TEXT NOT NULL,
    start_time       TIMESTAMPTZ NOT NULL,
    end_time         TIMESTAMPTZ,
    location         TEXT,
    outlook_event_id TEXT,
    mailbox_id       UUID REFERENCES mailboxes(id) ON DELETE SET NULL,
    attendees        JSONB DEFAULT '[]',
    status           TEXT DEFAULT 'pending'
                     CHECK (status IN ('pending','sent','confirmed','cancelled')),
    task_id          UUID REFERENCES tasks(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- now add the FK from tasks to meetings
ALTER TABLE tasks ADD CONSTRAINT fk_tasks_meeting
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE SET NULL;

-- ── approval_queue ────────────────────────────────────────────
CREATE TABLE approval_queue (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposed_task    JSONB NOT NULL,
    confidence       FLOAT,
    wa_message_id    TEXT,
    status           TEXT DEFAULT 'proposed'
                     CHECK (status IN ('proposed','approved','edited','rejected','expired')),
    resolved_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    resolved_at      TIMESTAMPTZ
);

-- ── task_messages ─────────────────────────────────────────────
CREATE TABLE task_messages (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id     UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    wa_msg_id   TEXT,
    direction   TEXT CHECK (direction IN ('inbound','outbound')),
    body        TEXT NOT NULL,
    sent_at     TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_task_messages_task ON task_messages(task_id, sent_at DESC);

-- ── task_activity ─────────────────────────────────────────────
CREATE TABLE task_activity (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id    UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    action     TEXT NOT NULL,
    detail     JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_task_activity_task ON task_activity(task_id, created_at DESC);

-- ── scheduled_reports ─────────────────────────────────────────
CREATE TABLE scheduled_reports (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cron         TEXT DEFAULT '0 7 * * *',
    timezone     TEXT DEFAULT 'Asia/Jerusalem',
    wa_recipient TEXT NOT NULL,
    look_ahead   INTEGER DEFAULT 7,
    active       BOOLEAN DEFAULT TRUE
);

-- seed default report schedule
INSERT INTO scheduled_reports (wa_recipient) VALUES ('972501234567');

-- ── sap_snapshots ────────────────────────────────────────────
CREATE TABLE sap_snapshots (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_db     TEXT NOT NULL,
    snapshot_type  TEXT CHECK (snapshot_type IN ('daily','weekly')),
    data           JSONB NOT NULL DEFAULT '{}',
    synced_at      TIMESTAMPTZ DEFAULT NOW(),
    period_start   DATE,
    period_end     DATE
);

CREATE INDEX idx_sap_snapshots_type ON sap_snapshots(company_db, snapshot_type, synced_at DESC);

-- ── Seed companies (run separately if DB already migrated) ────
INSERT INTO companies (name, domain) VALUES
  ('MEP OSM Israel',  'meposlm.co.il'),
  ('MEP OSM Poland',  'meposlm.pl'),
  ('MEP OSM UAE',     'meposlm.ae'),
  ('LBATech',         'lbatech.com'),
  ('MedCode',         'medcode.co.il')
ON CONFLICT DO NOTHING;
