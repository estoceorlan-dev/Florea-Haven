ALTER TABLE users ADD COLUMN profile_image_url TEXT;
ALTER TABLE users ADD COLUMN profile_image_public_id TEXT;
ALTER TABLE products ADD COLUMN image_public_id TEXT;

-- Durable cleanup queue also tracks uploads interrupted before attachment.
CREATE TABLE image_cleanup (
    public_id TEXT PRIMARY KEY,
    not_before TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    attempts INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX image_cleanup_due_idx ON image_cleanup (not_before);
