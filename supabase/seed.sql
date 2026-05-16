-- Seed test users (all passwords: Test@1234)
-- Run this in Supabase SQL Editor AFTER schema.sql

DO $$
DECLARE
  u1 UUID := gen_random_uuid();
  u2 UUID := gen_random_uuid();
  u3 UUID := gen_random_uuid();
  u4 UUID := gen_random_uuid();
  u5 UUID := gen_random_uuid();
  u6 UUID := gen_random_uuid();
BEGIN

  -- Auth users
  INSERT INTO auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES
    ('00000000-0000-0000-0000-000000000000', u1, 'authenticated', 'authenticated',
     'alice@test.com', crypt('Test@1234', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', u2, 'authenticated', 'authenticated',
     'bob@test.com', crypt('Test@1234', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', u3, 'authenticated', 'authenticated',
     'carol@test.com', crypt('Test@1234', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', u4, 'authenticated', 'authenticated',
     'david@test.com', crypt('Test@1234', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', u5, 'authenticated', 'authenticated',
     'emma@test.com', crypt('Test@1234', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', u6, 'authenticated', 'authenticated',
     'james@test.com', crypt('Test@1234', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');

  -- Auth identities
  INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES
    (u1::text, u1, jsonb_build_object('sub', u1::text, 'email', 'alice@test.com'),  'email', now(), now(), now()),
    (u2::text, u2, jsonb_build_object('sub', u2::text, 'email', 'bob@test.com'),    'email', now(), now(), now()),
    (u3::text, u3, jsonb_build_object('sub', u3::text, 'email', 'carol@test.com'),  'email', now(), now(), now()),
    (u4::text, u4, jsonb_build_object('sub', u4::text, 'email', 'david@test.com'),  'email', now(), now(), now()),
    (u5::text, u5, jsonb_build_object('sub', u5::text, 'email', 'emma@test.com'),   'email', now(), now(), now()),
    (u6::text, u6, jsonb_build_object('sub', u6::text, 'email', 'james@test.com'),  'email', now(), now(), now());

  -- Profiles
  INSERT INTO profiles (id, name, age, bio, gender, interested_in, avatar_url)
  VALUES
    (u1, 'Alice', 24,
     'Coffee addict ☕ | Hiking lover 🏔️ | Looking for my adventure partner',
     'woman', 'men',
     'https://api.dicebear.com/7.x/adventurer/svg?seed=Alice&backgroundColor=f43f5e'),
    (u2, 'Bob', 27,
     'Musician 🎸 | Dog dad 🐕 | Let''s grab pizza and talk about life',
     'man', 'women',
     'https://api.dicebear.com/7.x/adventurer/svg?seed=Bob&backgroundColor=6366f1'),
    (u3, 'Carol', 22,
     'Artist 🎨 | Bookworm 📚 | Spontaneous road trips are my thing',
     'woman', 'everyone',
     'https://api.dicebear.com/7.x/adventurer/svg?seed=Carol&backgroundColor=ec4899'),
    (u4, 'David', 29,
     'Software engineer 💻 | Gym rat 💪 | Weekend chef 🍳',
     'man', 'women',
     'https://api.dicebear.com/7.x/adventurer/svg?seed=David&backgroundColor=10b981'),
    (u5, 'Emma', 25,
     'Yoga instructor 🧘 | Beach person 🌊 | Big on deep conversations',
     'woman', 'men',
     'https://api.dicebear.com/7.x/adventurer/svg?seed=Emma&backgroundColor=f59e0b'),
    (u6, 'James', 31,
     'Traveller ✈️ | Film buff 🎬 | Always down for a good debate',
     'man', 'everyone',
     'https://api.dicebear.com/7.x/adventurer/svg?seed=James&backgroundColor=8b5cf6');

END $$;
