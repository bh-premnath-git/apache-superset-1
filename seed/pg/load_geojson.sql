-- SQL loader for India state GeoJSON
-- This uses PL/pgSQL to parse the GeoJSON file via pg_read_file

DO $$
DECLARE
    geojson_data JSONB;
    feature JSONB;
    state_name TEXT;
    state_count INT := 0;
BEGIN
    -- Read the GeoJSON file
    -- Note: This requires the file to be in Postgres data directory or accessible path
    -- Alternative: Use lo_import or external load
    
    -- For now, we'll create a temp table and use COPY for a Python-less approach
    RAISE NOTICE 'Please use Python loader with psycopg2, or insert manually';
END $$;

-- Alternative: Direct insert of sample states for testing
-- You can expand this with actual GeoJSON data

-- Check if table exists and has data
SELECT COUNT(*) INTO state_count FROM india_state_boundaries;
RAISE NOTICE 'Current state count: %', state_count;
