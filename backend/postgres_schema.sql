-- Hosted bootstrap. Local SQLite records are deliberately not imported.
-- Run as the project administrator; the application never owns these tables.
CREATE SCHEMA IF NOT EXISTS fitnessos;
REVOKE ALL ON SCHEMA fitnessos FROM PUBLIC, anon, authenticated;
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'fitnessos_app') THEN
    CREATE ROLE fitnessos_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
END $$;
CREATE COLLATION IF NOT EXISTS fitnessos.nocase (provider = icu, locale = 'und-u-ks-level2', deterministic = false);

CREATE TABLE fitnessos.journal (
  user_id uuid NOT NULL DEFAULT nullif(current_setting('fitnessos.user_id', true), '')::uuid,
  id text NOT NULL, kind text NOT NULL CHECK(kind IN ('water','sleep','steps','checkin','food','workout')),
  data text NOT NULL, created_at text NOT NULL,
  sort_id bigint GENERATED ALWAYS AS IDENTITY,
  PRIMARY KEY(user_id,id)
);
CREATE TABLE fitnessos.sets (
  user_id uuid NOT NULL DEFAULT nullif(current_setting('fitnessos.user_id', true), '')::uuid,
  id bigint GENERATED ALWAYS AS IDENTITY,
  activity_date text NOT NULL, exercise text COLLATE fitnessos.nocase NOT NULL,
  reps integer NOT NULL, load text, unit text NOT NULL, load_type text NOT NULL,
  created_at text NOT NULL, session_id text, session_exercise integer,
  PRIMARY KEY(user_id,id),
  FOREIGN KEY(user_id,session_id) REFERENCES fitnessos.journal(user_id,id) DEFERRABLE INITIALLY DEFERRED
);
CREATE TABLE fitnessos.favorites (
  user_id uuid NOT NULL DEFAULT nullif(current_setting('fitnessos.user_id', true), '')::uuid,
  exercise text COLLATE fitnessos.nocase NOT NULL, PRIMARY KEY(user_id,exercise)
);
CREATE TABLE fitnessos.set_requests (
  user_id uuid NOT NULL DEFAULT nullif(current_setting('fitnessos.user_id', true), '')::uuid,
  request_id text NOT NULL, payload text NOT NULL, result text NOT NULL, PRIMARY KEY(user_id,request_id)
);
CREATE TABLE fitnessos.profile (
  user_id uuid NOT NULL DEFAULT nullif(current_setting('fitnessos.user_id', true), '')::uuid,
  id integer NOT NULL CHECK(id=1), height_cm text, age_years integer, formula_variant text,
  PRIMARY KEY(user_id,id)
);
CREATE TABLE fitnessos.body_entries (
  user_id uuid NOT NULL DEFAULT nullif(current_setting('fitnessos.user_id', true), '')::uuid,
  id bigint GENERATED ALWAYS AS IDENTITY, activity_date text NOT NULL, weight text,
  weight_unit text NOT NULL, body_fat_pct text, waist text, chest text, hips text,
  arm text, thigh text, measure_unit text NOT NULL, created_at text NOT NULL,
  PRIMARY KEY(user_id,id)
);
CREATE TABLE fitnessos.calorie_entries (
  user_id uuid NOT NULL DEFAULT nullif(current_setting('fitnessos.user_id', true), '')::uuid,
  id bigint GENERATED ALWAYS AS IDENTITY, activity_date text NOT NULL, label text NOT NULL,
  kcal integer NOT NULL, created_at text NOT NULL, nutrition text, meal_time text,
  PRIMARY KEY(user_id,id)
);
CREATE TABLE fitnessos.custom_exercises (
  user_id uuid NOT NULL DEFAULT nullif(current_setting('fitnessos.user_id', true), '')::uuid,
  name text COLLATE fitnessos.nocase NOT NULL, PRIMARY KEY(user_id,name)
);
CREATE TABLE fitnessos.workouts (
  user_id uuid NOT NULL DEFAULT nullif(current_setting('fitnessos.user_id', true), '')::uuid,
  id bigint GENERATED ALWAYS AS IDENTITY, name text COLLATE fitnessos.nocase NOT NULL,
  PRIMARY KEY(user_id,id), UNIQUE(user_id,name)
);
CREATE TABLE fitnessos.plan_days (
  user_id uuid NOT NULL DEFAULT nullif(current_setting('fitnessos.user_id', true), '')::uuid,
  id bigint GENERATED ALWAYS AS IDENTITY, workout_id bigint NOT NULL,
  name text COLLATE fitnessos.nocase NOT NULL, PRIMARY KEY(user_id,id), UNIQUE(user_id,workout_id,name),
  FOREIGN KEY(user_id,workout_id) REFERENCES fitnessos.workouts(user_id,id)
);
CREATE TABLE fitnessos.day_exercises (
  user_id uuid NOT NULL DEFAULT nullif(current_setting('fitnessos.user_id', true), '')::uuid,
  id bigint GENERATED ALWAYS AS IDENTITY, day_id bigint NOT NULL,
  exercise text COLLATE fitnessos.nocase NOT NULL, position integer NOT NULL, PRIMARY KEY(user_id,id),
  FOREIGN KEY(user_id,day_id) REFERENCES fitnessos.plan_days(user_id,id)
);
CREATE TABLE fitnessos.workspace (
  user_id uuid NOT NULL DEFAULT nullif(current_setting('fitnessos.user_id', true), '')::uuid,
  id integer NOT NULL CHECK(id=1), data text NOT NULL, PRIMARY KEY(user_id,id)
);
CREATE TABLE fitnessos.workspace_meta (
  user_id uuid NOT NULL DEFAULT nullif(current_setting('fitnessos.user_id', true), '')::uuid,
  id integer NOT NULL CHECK(id=1), revision bigint NOT NULL, PRIMARY KEY(user_id,id)
);

DO $$ DECLARE tab record; BEGIN
  FOR tab IN SELECT tablename FROM pg_tables WHERE schemaname='fitnessos' LOOP
    EXECUTE format('ALTER TABLE fitnessos.%I ENABLE ROW LEVEL SECURITY', tab.tablename);
    EXECUTE format('ALTER TABLE fitnessos.%I FORCE ROW LEVEL SECURITY', tab.tablename);
    EXECUTE format('CREATE POLICY own_records ON fitnessos.%I TO fitnessos_app
      USING (user_id = nullif(current_setting(''fitnessos.user_id'', true), '''')::uuid)
      WITH CHECK (user_id = nullif(current_setting(''fitnessos.user_id'', true), '''')::uuid)', tab.tablename);
  END LOOP;
END $$;
GRANT USAGE ON SCHEMA fitnessos TO fitnessos_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA fitnessos TO fitnessos_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA fitnessos TO fitnessos_app;
REVOKE ALL ON ALL TABLES IN SCHEMA fitnessos FROM PUBLIC, anon, authenticated;
CREATE INDEX sets_date ON fitnessos.sets(user_id,activity_date,id);
CREATE INDEX body_date ON fitnessos.body_entries(user_id,activity_date,id);
CREATE INDEX calories_date ON fitnessos.calorie_entries(user_id,activity_date,id);
CREATE INDEX journal_kind ON fitnessos.journal(user_id,kind,sort_id);
CREATE INDEX sets_session ON fitnessos.sets(user_id,session_id);
CREATE INDEX day_parent ON fitnessos.day_exercises(user_id,day_id);
