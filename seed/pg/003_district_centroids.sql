-- ============================================================================
-- District centroids for Bihar / Jharkhand / Madhya Pradesh
-- ----------------------------------------------------------------------------
-- Feeds the built-in Cartodiagram plugin (Superset 5.0+) which renders a
-- per-district pie sub-chart at each point. Centroids were computed from
-- the udit-001/india-maps-data state-level district GeoJSONs (Census 2011
-- boundaries; CC BY 2.5 IN) using shoelace area-weighted formula on the
-- largest polygon ring.
--
-- district_code matches household.hh_master."District" (int4) which
-- stores the Census 2011 district code (e.g. 203 = West Champaran).
-- ============================================================================

CREATE TABLE IF NOT EXISTS household.district_centroids (
    district_code integer PRIMARY KEY,
    state_label   text NOT NULL,
    district_name text NOT NULL,
    lon           double precision NOT NULL,
    lat           double precision NOT NULL
);

TRUNCATE TABLE household.district_centroids;

INSERT INTO household.district_centroids
    (district_code, state_label, district_name, lon, lat)
VALUES
    (203, 'Bihar', 'West Champaran', 84.337874, 27.080953),
    (204, 'Bihar', 'East Champaran', 84.921719, 26.617871),
    (205, 'Bihar', 'Sheohar', 85.30146, 26.497822),
    (206, 'Bihar', 'Sitamarhi', 85.552202, 26.584759),
    (207, 'Bihar', 'Madhubani', 86.221757, 26.402278),
    (208, 'Bihar', 'Supaul', 86.808065, 26.244519),
    (209, 'Bihar', 'Araria', 87.361748, 26.199073),
    (210, 'Bihar', 'Kishanganj', 87.939897, 26.298915),
    (211, 'Bihar', 'Purnia', 87.403956, 25.814965),
    (212, 'Bihar', 'Katihar', 87.640419, 25.550067),
    (213, 'Bihar', 'Madhepura', 86.897357, 25.821293),
    (214, 'Bihar', 'Saharsa', 86.590393, 25.813872),
    (215, 'Bihar', 'Darbhanga', 86.055548, 26.084381),
    (216, 'Bihar', 'Muzaffarpur', 85.329416, 26.151874),
    (217, 'Bihar', 'Gopalganj', 84.373913, 26.444389),
    (218, 'Bihar', 'Siwan', 84.386337, 26.162079),
    (219, 'Bihar', 'Saran', 84.826037, 25.903774),
    (220, 'Bihar', 'Vaishali', 85.367333, 25.767489),
    (221, 'Bihar', 'Samastipur', 85.865819, 25.773901),
    (222, 'Bihar', 'Begusarai', 86.12843, 25.49749),
    (223, 'Bihar', 'Khagaria', 86.60139, 25.510256),
    (224, 'Bihar', 'Bhagalpur', 87.083101, 25.269383),
    (225, 'Bihar', 'Banka', 86.837447, 24.854395),
    (226, 'Bihar', 'Munger', 86.524953, 25.209672),
    (227, 'Bihar', 'Lakhisarai', 86.137332, 25.161813),
    (228, 'Bihar', 'Sheikhpura', 85.838701, 25.126313),
    (229, 'Bihar', 'Nalanda', 85.448158, 25.218871),
    (230, 'Bihar', 'Patna', 85.228135, 25.454495),
    (231, 'Bihar', 'Bhojpur', 84.540186, 25.474585),
    (232, 'Bihar', 'Buxar', 84.093552, 25.487454),
    (233, 'Bihar', 'Kaimur', 83.605517, 24.992051),
    (234, 'Bihar', 'Rohtas', 84.026262, 24.979649),
    (235, 'Bihar', 'Aurangabad', 84.40913, 24.790441),
    (236, 'Bihar', 'Gaya', 84.934353, 24.696875),
    (237, 'Bihar', 'Nawada', 85.589383, 24.810431),
    (238, 'Bihar', 'Jamui', 86.292445, 24.784695),
    (239, 'Bihar', 'Jehanabad', 85.016179, 25.155229),
    (240, 'Bihar', 'Arwal', 84.676399, 25.162779),
    (346, 'Jharkhand', 'Garhwa', 83.698459, 24.102808),
    (347, 'Jharkhand', 'Chatra', 84.886906, 24.173522),
    (348, 'Jharkhand', 'Koderma', 85.665175, 24.498177),
    (349, 'Jharkhand', 'Giridih', 86.10992, 24.294267),
    (350, 'Jharkhand', 'Deoghar', 86.738704, 24.32872),
    (351, 'Jharkhand', 'Godda', 87.308893, 24.859416),
    (352, 'Jharkhand', 'Sahibganj', 87.676871, 25.009529),
    (353, 'Jharkhand', 'Pakur', 87.662742, 24.56362),
    (354, 'Jharkhand', 'Dhanbad', 86.471777, 23.827688),
    (355, 'Jharkhand', 'Bokaro', 85.997128, 23.694537),
    (356, 'Jharkhand', 'Lohardaga', 84.669668, 23.47543),
    (357, 'Jharkhand', 'East Singhbhum', 86.451048, 22.583601),
    (358, 'Jharkhand', 'Palamu', 84.166229, 24.203532),
    (359, 'Jharkhand', 'Latehar', 84.442822, 23.71901),
    (360, 'Jharkhand', 'Hazaribagh', 85.419135, 24.05563),
    (361, 'Jharkhand', 'Ramgarh', 85.562795, 23.634707),
    (362, 'Jharkhand', 'Dumka', 87.265771, 24.31976),
    (363, 'Jharkhand', 'Jamtara', 86.907473, 23.97606),
    (364, 'Jharkhand', 'Ranchi', 85.373967, 23.328866),
    (365, 'Jharkhand', 'Khunti', 85.261896, 22.993857),
    (366, 'Jharkhand', 'Gumla', 84.532623, 23.102455),
    (367, 'Jharkhand', 'Simdega', 84.56383, 22.581683),
    (368, 'Jharkhand', 'West Singhbhum', 85.518607, 22.421046),
    (369, 'Jharkhand', 'Saraikela-Kharsawan', 85.949497, 22.848415),
    (418, 'Madhya Pradesh', 'Sheopur', 77.007252, 25.754594),
    (419, 'Madhya Pradesh', 'Morena', 77.868297, 26.413095),
    (420, 'Madhya Pradesh', 'Bhind', 78.721292, 26.422319),
    (421, 'Madhya Pradesh', 'Gwalior', 78.146053, 26.039751),
    (422, 'Madhya Pradesh', 'Datia', 78.612138, 25.840095),
    (423, 'Madhya Pradesh', 'Shivpuri', 77.805448, 25.365146),
    (424, 'Madhya Pradesh', 'Tikamgarh', 79.014955, 24.882685),
    (425, 'Madhya Pradesh', 'Chhatarpur', 79.664586, 24.799203),
    (426, 'Madhya Pradesh', 'Panna', 80.188176, 24.416446),
    (427, 'Madhya Pradesh', 'Sagar', 78.759771, 23.849832),
    (428, 'Madhya Pradesh', 'Damoh', 79.526979, 23.811743),
    (429, 'Madhya Pradesh', 'Satna', 80.831313, 24.531099),
    (430, 'Madhya Pradesh', 'Rewa', 81.587107, 24.755776),
    (431, 'Madhya Pradesh', 'Umaria', 80.973965, 23.563009),
    (432, 'Madhya Pradesh', 'Neemuch', 75.141565, 24.591987),
    (433, 'Madhya Pradesh', 'Mandsaur', 75.404868, 24.204278),
    (434, 'Madhya Pradesh', 'Ratlam', 75.088886, 23.502397),
    (435, 'Madhya Pradesh', 'Ujjain', 75.668975, 23.330641),
    (436, 'Madhya Pradesh', 'Shajapur', 76.575047, 23.365705),
    (437, 'Madhya Pradesh', 'Dewas', 76.457278, 22.744212),
    (438, 'Madhya Pradesh', 'Dhar', 75.103569, 22.498409),
    (439, 'Madhya Pradesh', 'Indore', 75.782533, 22.713559),
    (440, 'Madhya Pradesh', 'Khargone', 75.771655, 21.918922),
    (441, 'Madhya Pradesh', 'Barwani', 75.021489, 21.788509),
    (442, 'Madhya Pradesh', 'Rajgarh', 76.732969, 23.860768),
    (443, 'Madhya Pradesh', 'Vidisha', 77.813101, 23.892489),
    (444, 'Madhya Pradesh', 'Bhopal', 77.390743, 23.47028),
    (445, 'Madhya Pradesh', 'Sehore', 77.127161, 22.987318),
    (446, 'Madhya Pradesh', 'Raisen', 78.118919, 23.219914),
    (447, 'Madhya Pradesh', 'Betul', 77.87172, 21.878798),
    (448, 'Madhya Pradesh', 'Harda', 77.123481, 22.232301),
    (449, 'Madhya Pradesh', 'Hoshangabad', 77.991296, 22.590947),
    (450, 'Madhya Pradesh', 'Katni', 80.403066, 23.752908),
    (451, 'Madhya Pradesh', 'Jabalpur', 79.975286, 23.233705),
    (452, 'Madhya Pradesh', 'Narsinghpur', 79.08834, 22.935995),
    (453, 'Madhya Pradesh', 'Dindori', 81.050851, 22.890052),
    (454, 'Madhya Pradesh', 'Mandla', 80.512771, 22.638607),
    (455, 'Madhya Pradesh', 'Chhindwara', 78.8542, 22.122923),
    (456, 'Madhya Pradesh', 'Seoni', 79.689226, 22.317078),
    (457, 'Madhya Pradesh', 'Balaghat', 80.358683, 21.880397),
    (458, 'Madhya Pradesh', 'Guna', 77.198444, 24.555477),
    (459, 'Madhya Pradesh', 'Ashoknagar', 77.87505, 24.609805),
    (460, 'Madhya Pradesh', 'Shahdol', 81.473613, 23.629487),
    (461, 'Madhya Pradesh', 'Anuppur', 81.682576, 23.056943),
    (462, 'Madhya Pradesh', 'Sidhi', 81.833997, 24.221164),
    (463, 'Madhya Pradesh', 'Singrauli', 82.418751, 24.214862),
    (464, 'Madhya Pradesh', 'Jhabua', 74.671704, 22.893472),
    (465, 'Madhya Pradesh', 'Alirajpur', 74.364419, 22.314903),
    (466, 'Madhya Pradesh', 'Khandwa', 76.567643, 21.934659),
    (467, 'Madhya Pradesh', 'Burhanpur', 76.36984, 21.369871),
    (724, 'Madhya Pradesh', 'Agar Malwa', 76.088244, 23.814699),
    (782, 'Madhya Pradesh', 'Niwari', 78.749078, 25.284492);

-- ── Long-form (state, district, segment) weighted count PLUS a GeoJSON Point
-- geometry column built from the centroid lookup. Shape matches
-- vw_state_district_segment but adds `geometry` for the Cartodiagram plugin,
-- which expects `{"type":"Point","coordinates":[lon,lat]}` as a text value
-- per row. Districts with no centroid (e.g. states outside Bihar/Jharkhand/MP)
-- are excluded via INNER JOIN so the Cartodiagram map only plots what we
-- have coordinates for.
--
-- NOTE: hh_master."District" is a 1-based per-state ordinal (1..N), while
-- district_centroids.district_code is the Census 2011 absolute code (e.g.
-- 203 = West Champaran in Bihar). We bridge the two by computing a
-- ROW_NUMBER() ordinal over centroids partitioned by state, ordered by
-- Census code (which matches the survey's district ordering).
CREATE OR REPLACE VIEW household.vw_state_district_segment_geo AS
WITH centroid_ord AS (
    SELECT
        state_label,
        district_name,
        lon,
        lat,
        ROW_NUMBER() OVER (
            PARTITION BY state_label ORDER BY district_code
        )::int AS ordinal
    FROM household.district_centroids
)
SELECT
    s.state_iso_code,
    s.state_label,
    s.district_code,
    c.district_name,
    s.segment,
    s.hh_weight,
    json_build_object(
        'type', 'Point',
        'coordinates', json_build_array(c.lon, c.lat)
    )::text AS geometry
FROM household.vw_state_district_segment s
JOIN centroid_ord c
  ON c.state_label = s.state_label
 AND c.ordinal     = s.district_code;
