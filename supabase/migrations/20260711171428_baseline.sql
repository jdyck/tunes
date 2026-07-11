
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

COMMENT ON SCHEMA "public" IS 'standard public schema';

CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;

ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";

CREATE TABLE IF NOT EXISTS "public"."artists" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text",
    "notes" "text",
    "user_id" "uuid"
);

ALTER TABLE "public"."artists" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."people" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL
);

ALTER TABLE "public"."people" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."recording_artists" (
    "recording_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "artist_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid"
);

ALTER TABLE "public"."recording_artists" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."recordings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tune_id" "uuid" DEFAULT "gen_random_uuid"(),
    "name" "text",
    "notes" "text",
    "url" "text",
    "rating" smallint,
    "sortOrder" smallint,
    "user_id" "uuid",
    "kind" "text",
    "artist" "text",
    "year" "text",
    "album" "text",
    "duration" "text",
    "key" "text",
    "tempo" "text",
    "tags" "text"[]
);

ALTER TABLE "public"."recordings" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."song_writers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tune_id" "uuid" NOT NULL,
    "person_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "sort_order" smallint DEFAULT 0 NOT NULL,
    CONSTRAINT "song_writers_role_check" CHECK (("role" = ANY (ARRAY['composer'::"text", 'lyricist'::"text", 'writer'::"text"])))
);

ALTER TABLE "public"."song_writers" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."tunes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text",
    "year" smallint,
    "notes" "text",
    "user_id" "uuid",
    "wikipedia_extract" "text",
    "wikipedia_url" "text",
    "musicbrainz_work_id" "uuid"
);

ALTER TABLE "public"."tunes" OWNER TO "postgres";

ALTER TABLE ONLY "public"."artists"
    ADD CONSTRAINT "artists_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."people"
    ADD CONSTRAINT "people_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."recording_artists"
    ADD CONSTRAINT "recording_artists_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."recordings"
    ADD CONSTRAINT "recordings_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."song_writers"
    ADD CONSTRAINT "song_writers_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."tunes"
    ADD CONSTRAINT "tunes_id_key" UNIQUE ("id");

ALTER TABLE ONLY "public"."tunes"
    ADD CONSTRAINT "tunes_pkey" PRIMARY KEY ("id");

CREATE INDEX "song_writers_person_id_idx" ON "public"."song_writers" USING "btree" ("person_id");

CREATE INDEX "song_writers_tune_id_idx" ON "public"."song_writers" USING "btree" ("tune_id");

ALTER TABLE ONLY "public"."song_writers"
    ADD CONSTRAINT "song_writers_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."song_writers"
    ADD CONSTRAINT "song_writers_tune_id_fkey" FOREIGN KEY ("tune_id") REFERENCES "public"."tunes"("id") ON DELETE CASCADE;

CREATE POLICY "Enable insert for authenticated users only" ON "public"."artists" FOR INSERT TO "authenticated" WITH CHECK (true);

CREATE POLICY "Enable insert for authenticated users only" ON "public"."recordings" FOR INSERT TO "authenticated" WITH CHECK (true);

CREATE POLICY "Enable insert for authenticated users only" ON "public"."tunes" FOR INSERT TO "authenticated" WITH CHECK (true);

CREATE POLICY "Enable users to delete their own data" ON "public"."tunes" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));

CREATE POLICY "Enable users to select,insert,update,delete their own data" ON "public"."recordings" TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));

CREATE POLICY "Enable users to update their own data" ON "public"."tunes" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));

CREATE POLICY "Enable users to view their own data only" ON "public"."artists" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));

CREATE POLICY "Enable users to view their own data only" ON "public"."recordings" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));

CREATE POLICY "Enable users to view their own data only" ON "public"."tunes" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));

ALTER TABLE "public"."artists" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "delete song_writers" ON "public"."song_writers" FOR DELETE TO "authenticated" USING (true);

CREATE POLICY "insert people" ON "public"."people" FOR INSERT TO "authenticated" WITH CHECK (true);

CREATE POLICY "insert song_writers" ON "public"."song_writers" FOR INSERT TO "authenticated" WITH CHECK (true);

ALTER TABLE "public"."people" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read people" ON "public"."people" FOR SELECT TO "authenticated" USING (true);

CREATE POLICY "read song_writers" ON "public"."song_writers" FOR SELECT TO "authenticated" USING (true);

ALTER TABLE "public"."recording_artists" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."recordings" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."song_writers" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."tunes" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "update song_writers" ON "public"."song_writers" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);

ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";

GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

GRANT ALL ON TABLE "public"."artists" TO "anon";
GRANT ALL ON TABLE "public"."artists" TO "authenticated";
GRANT ALL ON TABLE "public"."artists" TO "service_role";

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."people" TO "anon";
GRANT ALL ON TABLE "public"."people" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."people" TO "service_role";

GRANT ALL ON TABLE "public"."recording_artists" TO "anon";
GRANT ALL ON TABLE "public"."recording_artists" TO "authenticated";
GRANT ALL ON TABLE "public"."recording_artists" TO "service_role";

GRANT ALL ON TABLE "public"."recordings" TO "anon";
GRANT ALL ON TABLE "public"."recordings" TO "authenticated";
GRANT ALL ON TABLE "public"."recordings" TO "service_role";

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."song_writers" TO "anon";
GRANT ALL ON TABLE "public"."song_writers" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."song_writers" TO "service_role";

GRANT ALL ON TABLE "public"."tunes" TO "anon";
GRANT ALL ON TABLE "public"."tunes" TO "authenticated";
GRANT ALL ON TABLE "public"."tunes" TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "service_role";

