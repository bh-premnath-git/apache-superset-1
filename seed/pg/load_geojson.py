#!/usr/bin/env python3
"""Load India state GeoJSON into Postgres for deck.gl choropleth."""

import json
import os
import psycopg2

GEOJSON_PATH = os.path.join(os.path.dirname(__file__), "india_states.geojson")

def load_geojson():
    # Read GeoJSON
    with open(GEOJSON_PATH) as f:
        data = json.load(f)
    
    # Aggregate districts to states
    state_features = {}
    for feature in data["features"]:
        state_name = feature["properties"]["st_nm"]
        if state_name not in state_features:
            state_features[state_name] = {
                "type": "Feature",
                "properties": {"state": state_name},
                "geometry": feature["geometry"]
            }
    
    # Connect and insert
    conn = psycopg2.connect(
        host=os.environ.get("ANALYTICS_DB_HOST", "analytics-db"),
        port=os.environ.get("ANALYTICS_DB_PORT", "5432"),
        database=os.environ.get("ANALYTICS_DB_NAME", "analytics"),
        user=os.environ.get("ANALYTICS_DB_USER", "sample_user"),
        password=os.environ.get("ANALYTICS_DB_PASS", "sample_pass")
    )
    
    with conn.cursor() as cur:
        for state_name, feature in state_features.items():
            cur.execute(
                """
                INSERT INTO india_state_boundaries (state_name, geojson)
                VALUES (%s, %s)
                ON CONFLICT (state_name) DO UPDATE SET geojson = EXCLUDED.geojson
                """,
                (state_name, json.dumps(feature))
            )
    
    conn.commit()
    conn.close()
    print(f"[geojson] Loaded {len(state_features)} state boundaries")

if __name__ == "__main__":
    load_geojson()
