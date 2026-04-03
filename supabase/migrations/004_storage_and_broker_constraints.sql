-- =========================================
-- STORAGE BUCKETS
-- Creates buckets if they don't exist yet.
-- ON CONFLICT DO NOTHING makes this idempotent.
-- =========================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'client-documents',
    'client-documents',
    false,
    52428800,
    ARRAY[
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/heic',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
  ),
  (
    'propostas-docs',
    'propostas-docs',
    false,
    52428800,
    ARRAY[
      'application/pdf',
      'image/jpeg',
      'image/png'
    ]
  ),
  (
    'office-assets',
    'office-assets',
    true,
    5242880,
    ARRAY[
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/svg+xml'
    ]
  )
ON CONFLICT (id) DO NOTHING;

-- =========================================
-- BROKER UNIQUE CONSTRAINT
-- A user can only belong to one office.
-- Enables ON CONFLICT DO NOTHING on user_id
-- during broker activation.
-- =========================================

ALTER TABLE brokers
  ADD CONSTRAINT brokers_user_id_unique UNIQUE (user_id);
