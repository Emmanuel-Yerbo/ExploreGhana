-- =============================================================================
-- EXPLOREGHANA: POSTGIS INITIALIZATION & SCHEMA DEFINITION
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. REGIONS TABLE
CREATE TABLE IF NOT EXISTS regions (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    capital VARCHAR(100) NOT NULL,
    area_sq_km NUMERIC(10, 2),
    population_est INTEGER,
    total_districts INTEGER,
    geom GEOMETRY(Polygon, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_regions_geom ON regions USING GIST (geom);

-- 2. ATTRACTIONS TABLE
CREATE TABLE IF NOT EXISTS attractions (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    local_name VARCHAR(255),
    category VARCHAR(100) NOT NULL,
    region VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    elevation_m INTEGER,
    description TEXT NOT NULL,
    entry_fee_local_adult NUMERIC(8, 2) DEFAULT 0.0,
    entry_fee_local_student NUMERIC(8, 2) DEFAULT 0.0,
    entry_fee_foreigner_adult NUMERIC(8, 2) DEFAULT 0.0,
    entry_fee_foreigner_student NUMERIC(8, 2) DEFAULT 0.0,
    opening_hours VARCHAR(100),
    contact_phone VARCHAR(50),
    best_time_to_visit VARCHAR(150),
    duration_hours NUMERIC(4, 2),
    guided_tours BOOLEAN DEFAULT TRUE,
    wheelchair_accessible BOOLEAN DEFAULT FALSE,
    image_url TEXT,
    road_surface VARCHAR(100),
    passable_rainy_season BOOLEAN DEFAULT TRUE,
    vehicle_recommended VARCHAR(100),
    geom GEOMETRY(Point, 4326) NOT NULL
);

-- PostGIS GiST Spatial Index on attraction points
CREATE INDEX IF NOT EXISTS idx_attractions_geom ON attractions USING GIST (geom);

-- Category and Region B-tree indexes for accelerated composite filtering
CREATE INDEX IF NOT EXISTS idx_attractions_category ON attractions (category);
CREATE INDEX IF NOT EXISTS idx_attractions_region ON attractions (region);

-- 3. EXAMPLE PROXIMITY QUERY FUNCTION IN POSTGIS
-- (Equivalent to /api/attractions/nearby)
-- SELECT id, name, category, 
--        ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint(-1.2417, 5.1053), 4326)::geography) / 1000.0 AS distance_km
-- FROM attractions
-- WHERE ST_DWithin(geom::geography, ST_SetSRID(ST_MakePoint(-1.2417, 5.1053), 4326)::geography, 30000)
-- ORDER BY distance_km ASC;
