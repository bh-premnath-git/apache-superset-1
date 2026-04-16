-- Household master dataset (analytics-db)
-- Source CSV is sibling `HH.master.csv` in this directory. Docker mounts
-- ./seed/pg into /docker-entrypoint-initdb.d, so both this script and the
-- CSV are available server-side when Postgres runs the init scripts.
--
-- This loader keeps the raw source columns exactly as named in the CSV,
-- including case-sensitive headers and headers containing spaces, so the
-- imported table mirrors the external extract faithfully.

CREATE TABLE IF NOT EXISTS hh_master (
    "Survey_Name" TEXT,
    "Year" TEXT,
    "FSU_Serial_No" TEXT,
    "Sector" TEXT,
    "State" TEXT,
    "NSS_Region" TEXT,
    "District" TEXT,
    "Stratum" TEXT,
    "Sub_stratum" TEXT,
    "Panel" TEXT,
    "Sub_sample" TEXT,
    "FOD_Sub_Region" TEXT,
    "Sample_SU_No" TEXT,
    "Sample_Sub_Division_No" TEXT,
    "Second_Stage_Stratum_No" TEXT,
    "Sample_Household_No" TEXT,
    "Questionnaire_No" TEXT,
    "Level" TEXT,
    "Survey_Code" TEXT,
    "Reason_for_Substitution_Code" TEXT,
    "Multiplier" TEXT,
    "Sector_label" TEXT,
    "State_label" TEXT,
    "Survey_Code_label" TEXT,
    "Reason_for_Substitution_Code_label" TEXT,
    "HHID" TEXT,
    "wt" TEXT,
    "wt_norm" TEXT,
    "hh_size" TEXT,
    "n_children_u5" TEXT,
    "n_children_u15" TEXT,
    "n_elderly" TEXT,
    "any_child" TEXT,
    "any_elderly" TEXT,
    "prop_female" TEXT,
    "any_female" TEXT,
    "head_age" TEXT,
    "head_gender" TEXT,
    "head_marital" TEXT,
    "head_edu_level" TEXT,
    "head_years_edu" TEXT,
    "head_internet30" TEXT,
    "mean_years_edu" TEXT,
    "max_years_edu" TEXT,
    "any_edu" TEXT,
    "any_secondary" TEXT,
    "any_higher" TEXT,
    "any_internet" TEXT,
    "prop_internet_users" TEXT,
    "mean_meals_per_day" TEXT,
    "any_meal_from_school" TEXT,
    "any_meal_from_employer" TEXT,
    "any_paid_meals" TEXT,
    "any_live_away" TEXT,
    "any_migration_work" TEXT,
    "HH_Size_FDQ" TEXT,
    "Engaged_in_Economic_Activity_Las" TEXT,
    "NCO_2015_Code" TEXT,
    "NIC_2008_Code" TEXT,
    "Max_Income_Activity" TEXT,
    "Self_Employment_Source_Sector" TEXT,
    "Regular_Wage_Source_Sector" TEXT,
    "Casual_Labour_Source_Sector" TEXT,
    "Household_Type" TEXT,
    "Religion_of_HH_Head" TEXT,
    "Social_Group_of_HH_Head" TEXT,
    "Land_Ownership" TEXT,
    "Type_of_Land_Owned" TEXT,
    "Total_Area_Land_Owned_Acres" TEXT,
    "Dwelling_Unit_Exists" TEXT,
    "Type_of_Dwelling_Unit" TEXT,
    "Energy_Source_Cooking" TEXT,
    "Energy_Source_Lighting" TEXT,
    "Ration_Card_Type" TEXT,
    "Rent_Rate_Available_Rural" TEXT,
    "Benefitted_From_PMGKY" TEXT,
    "Engaged_in_Economic_Activity_Las_label" TEXT,
    "Max_Income_Activity_label" TEXT,
    "Self_Employment_Source_Sector_label" TEXT,
    "Regular_Wage_Source_Sector_label" TEXT,
    "Casual_Labour_Source_Sector_label" TEXT,
    "Religion_of_HH_Head_label" TEXT,
    "Social_Group_of_HH_Head_label" TEXT,
    "Land_Ownership_label" TEXT,
    "Type_of_Land_Owned_label" TEXT,
    "Dwelling_Unit_Exists_label" TEXT,
    "Type_of_Dwelling_Unit_label" TEXT,
    "Energy_Source_Cooking_label" TEXT,
    "Energy_Source_Lighting_label" TEXT,
    "Ration_Card_Type_label" TEXT,
    "Rent_Rate_Available_Rural_label" TEXT,
    "Benefitted_From_PMGKY_label" TEXT,
    "Ration_Any_Item_Last_30_Days" TEXT,
    "Ration_Rice" TEXT,
    "Ration_Wheat" TEXT,
    "Ration_Coarse_Grain" TEXT,
    "Ration_Sugar" TEXT,
    "Ration_Pulses" TEXT,
    "Ration_Edible_Oil" TEXT,
    "Ration_Other_Food_Items" TEXT,
    "Online_Groceries" TEXT,
    "Online_Milk" TEXT,
    "Online_Vegetables" TEXT,
    "Online_Fresh_Fruits" TEXT,
    "Online_Dry_Fruits" TEXT,
    "Online_Egg_Fish_Meat" TEXT,
    "Online_Served_Processed_Food" TEXT,
    "Online_Packed_Processed_Food" TEXT,
    "Online_Other_Food_Items" TEXT,
    "Ceremony_Performed_Last_30_Days" TEXT,
    "Meals_Served_to_Non_HH_Members" TEXT,
    "Ration_Any_Item_Last_30_Days_label" TEXT,
    "Ceremony_Performed_Last_30_Days_label" TEXT,
    "beverages_qty_total" TEXT,
    "cereal_qty_total" TEXT,
    "dairy_qty_total" TEXT,
    "edible oil_qty_total" TEXT,
    "pulses_qty_total" TEXT,
    "spices_qty_total" TEXT,
    "suger_salt_qty_total" TEXT,
    "vegetables_qty_total" TEXT,
    "egg_fish_meat_qty_total" TEXT,
    "fresh fruits_qty_total" TEXT,
    "dry fruits_qty_total" TEXT,
    "cereal substitute_qty_total" TEXT,
    "beverages_val_total" TEXT,
    "cereal_val_total" TEXT,
    "dairy_val_total" TEXT,
    "edible oil_val_total" TEXT,
    "pulses_val_total" TEXT,
    "spices_val_total" TEXT,
    "suger_salt_val_total" TEXT,
    "vegetables_val_total" TEXT,
    "egg_fish_meat_val_total" TEXT,
    "fresh fruits_val_total" TEXT,
    "dry fruits_val_total" TEXT,
    "cereal substitute_val_total" TEXT,
    "beverages_qty_out" TEXT,
    "cereal_qty_out" TEXT,
    "dairy_qty_out" TEXT,
    "edible oil_qty_out" TEXT,
    "pulses_qty_out" TEXT,
    "spices_qty_out" TEXT,
    "suger_salt_qty_out" TEXT,
    "vegetables_qty_out" TEXT,
    "egg_fish_meat_qty_out" TEXT,
    "fresh fruits_qty_out" TEXT,
    "dry fruits_qty_out" TEXT,
    "cereal substitute_qty_out" TEXT,
    "beverages_val_out" TEXT,
    "cereal_val_out" TEXT,
    "dairy_val_out" TEXT,
    "edible oil_val_out" TEXT,
    "pulses_val_out" TEXT,
    "spices_val_out" TEXT,
    "suger_salt_val_out" TEXT,
    "vegetables_val_out" TEXT,
    "egg_fish_meat_val_out" TEXT,
    "fresh fruits_val_out" TEXT,
    "dry fruits_val_out" TEXT,
    "cereal substitute_val_out" TEXT,
    "packaged processed food_val_total" TEXT,
    "served processed food_val_total" TEXT,
    "Kerosene_ration_card" TEXT,
    "LPG_subsidy_received" TEXT,
    "LPG_subsidized_cylinders" TEXT,
    "Free_electricity" TEXT,
    "Any_member_attended_school" TEXT,
    "Num_govt_school_attended" TEXT,
    "Num_private_school_attended" TEXT,
    "Free_textbooks_received" TEXT,
    "Total_textbooks" TEXT,
    "Free_stationery_received" TEXT,
    "Total_stationery" TEXT,
    "Free_school_bag_received" TEXT,
    "Total_school_bags" TEXT,
    "Free_other_items_received" TEXT,
    "Total_other_items" TEXT,
    "Fee_waiver_received" TEXT,
    "Num_fee_waiver_received" TEXT,
    "Ayushman_beneficiary" TEXT,
    "Num_ayushman_beneficiaries" TEXT,
    "Hospitalization_case" TEXT,
    "Medical_benefit_received" TEXT,
    "Num_medical_beneficiaries" TEXT,
    "Medical_benefit_amount" TEXT,
    "Online_purchase_fuel_light" TEXT,
    "Online_purchase_toilet_articles" TEXT,
    "Online_purchase_education" TEXT,
    "Online_purchase_medicine" TEXT,
    "Online_purchase_services" TEXT,
    "Kerosene_ration_card_label" TEXT,
    "LPG_subsidy_received_label" TEXT,
    "Free_electricity_label" TEXT,
    "Any_member_attended_school_label" TEXT,
    "Fee_waiver_received_label" TEXT,
    "Hospitalization_case_label" TEXT,
    "Medical_benefit_received_label" TEXT,
    "electricity_val_total" TEXT,
    "firewood_val_total" TEXT,
    "other fuel_val_total" TEXT,
    "subtotal fuel and light_val_total" TEXT,
    "LPG_val_total" TEXT,
    "kerosene_other_val_total" TEXT,
    "kerosene_PDS_val_total" TEXT,
    "conveyance_val_total" TEXT,
    "edu expense_val_total" TEXT,
    "house_garage rent_val_total" TEXT,
    "medical nonhospitalized_val_total" TEXT,
    "other HH consumables_val_total" TEXT,
    "other consumer services_val_total" TEXT,
    "toilet articles_val_total" TEXT,
    "medical hospitalized_val_total" TEXT,
    "entertainment_val_total" TEXT,
    "other consumer taxes_cesses_val_total" TEXT,
    "subtotal rent_val_total" TEXT,
    "internet_val_total" TEXT,
    "taxi_val_total" TEXT,
    "airfare_val_total" TEXT,
    "tobacco_val_total" TEXT,
    "intoxicants_val_total" TEXT,
    "pan_val_total" TEXT,
    "questionnaire_No" TEXT,
    "Online_Clothing" TEXT,
    "Online_Footwear" TEXT,
    "Online_Furniture" TEXT,
    "Online_Mobile" TEXT,
    "Online_PersonalGoods" TEXT,
    "Online_RecreationGoods" TEXT,
    "Online_HouseholdAppliances" TEXT,
    "Online_Crockery" TEXT,
    "Online_SportsGoods" TEXT,
    "Online_MedicalEquipment" TEXT,
    "Online_Bedding" TEXT,
    "Free_Laptop" TEXT,
    "Num_Free_Laptop" TEXT,
    "Free_Tablet" TEXT,
    "Num_Free_Tablet" TEXT,
    "Free_Mobile" TEXT,
    "Num_Free_Mobile" TEXT,
    "Free_Bicycle" TEXT,
    "Num_Free_Bicycle" TEXT,
    "Free_Scooter" TEXT,
    "Num_Free_Scooter" TEXT,
    "Free_Clothing" TEXT,
    "Num_Free_Clothing" TEXT,
    "Free_Footwear" TEXT,
    "Num_Free_Footwear" TEXT,
    "Free_Other" TEXT,
    "Num_Free_Other" TEXT,
    "Possess_Television" TEXT,
    "Possess_Radio" TEXT,
    "Possess_Laptop" TEXT,
    "Possess_Mobile" TEXT,
    "Possess_Bicycle" TEXT,
    "Possess_Scooter" TEXT,
    "Possess_Car" TEXT,
    "Possess_Truck" TEXT,
    "Possess_AnimalCart" TEXT,
    "Possess_Refrigerator" TEXT,
    "Possess_WashingMachine" TEXT,
    "Possess_AirCooler" TEXT,
    "TV_Facility_Type" TEXT,
    "TV_Facility_Type_label" TEXT,
    "clothing_val_total" TEXT,
    "footwear_val_total" TEXT,
    "bedding_val_total" TEXT,
    "HH appliances_val_total" TEXT,
    "building_land_durable_val_total" TEXT,
    "crockery_utensil_val_total" TEXT,
    "furniture_fixture_val_total" TEXT,
    "jewelry_ornaments_val_total" TEXT,
    "personal good_val_total" TEXT,
    "transport equipment_val_total" TEXT,
    "recreation_val_total" TEXT,
    "medical equipment_val_total" TEXT
);

TRUNCATE TABLE hh_master;

COPY hh_master (
    "Survey_Name",
    "Year",
    "FSU_Serial_No",
    "Sector",
    "State",
    "NSS_Region",
    "District",
    "Stratum",
    "Sub_stratum",
    "Panel",
    "Sub_sample",
    "FOD_Sub_Region",
    "Sample_SU_No",
    "Sample_Sub_Division_No",
    "Second_Stage_Stratum_No",
    "Sample_Household_No",
    "Questionnaire_No",
    "Level",
    "Survey_Code",
    "Reason_for_Substitution_Code",
    "Multiplier",
    "Sector_label",
    "State_label",
    "Survey_Code_label",
    "Reason_for_Substitution_Code_label",
    "HHID",
    "wt",
    "wt_norm",
    "hh_size",
    "n_children_u5",
    "n_children_u15",
    "n_elderly",
    "any_child",
    "any_elderly",
    "prop_female",
    "any_female",
    "head_age",
    "head_gender",
    "head_marital",
    "head_edu_level",
    "head_years_edu",
    "head_internet30",
    "mean_years_edu",
    "max_years_edu",
    "any_edu",
    "any_secondary",
    "any_higher",
    "any_internet",
    "prop_internet_users",
    "mean_meals_per_day",
    "any_meal_from_school",
    "any_meal_from_employer",
    "any_paid_meals",
    "any_live_away",
    "any_migration_work",
    "HH_Size_FDQ",
    "Engaged_in_Economic_Activity_Las",
    "NCO_2015_Code",
    "NIC_2008_Code",
    "Max_Income_Activity",
    "Self_Employment_Source_Sector",
    "Regular_Wage_Source_Sector",
    "Casual_Labour_Source_Sector",
    "Household_Type",
    "Religion_of_HH_Head",
    "Social_Group_of_HH_Head",
    "Land_Ownership",
    "Type_of_Land_Owned",
    "Total_Area_Land_Owned_Acres",
    "Dwelling_Unit_Exists",
    "Type_of_Dwelling_Unit",
    "Energy_Source_Cooking",
    "Energy_Source_Lighting",
    "Ration_Card_Type",
    "Rent_Rate_Available_Rural",
    "Benefitted_From_PMGKY",
    "Engaged_in_Economic_Activity_Las_label",
    "Max_Income_Activity_label",
    "Self_Employment_Source_Sector_label",
    "Regular_Wage_Source_Sector_label",
    "Casual_Labour_Source_Sector_label",
    "Religion_of_HH_Head_label",
    "Social_Group_of_HH_Head_label",
    "Land_Ownership_label",
    "Type_of_Land_Owned_label",
    "Dwelling_Unit_Exists_label",
    "Type_of_Dwelling_Unit_label",
    "Energy_Source_Cooking_label",
    "Energy_Source_Lighting_label",
    "Ration_Card_Type_label",
    "Rent_Rate_Available_Rural_label",
    "Benefitted_From_PMGKY_label",
    "Ration_Any_Item_Last_30_Days",
    "Ration_Rice",
    "Ration_Wheat",
    "Ration_Coarse_Grain",
    "Ration_Sugar",
    "Ration_Pulses",
    "Ration_Edible_Oil",
    "Ration_Other_Food_Items",
    "Online_Groceries",
    "Online_Milk",
    "Online_Vegetables",
    "Online_Fresh_Fruits",
    "Online_Dry_Fruits",
    "Online_Egg_Fish_Meat",
    "Online_Served_Processed_Food",
    "Online_Packed_Processed_Food",
    "Online_Other_Food_Items",
    "Ceremony_Performed_Last_30_Days",
    "Meals_Served_to_Non_HH_Members",
    "Ration_Any_Item_Last_30_Days_label",
    "Ceremony_Performed_Last_30_Days_label",
    "beverages_qty_total",
    "cereal_qty_total",
    "dairy_qty_total",
    "edible oil_qty_total",
    "pulses_qty_total",
    "spices_qty_total",
    "suger_salt_qty_total",
    "vegetables_qty_total",
    "egg_fish_meat_qty_total",
    "fresh fruits_qty_total",
    "dry fruits_qty_total",
    "cereal substitute_qty_total",
    "beverages_val_total",
    "cereal_val_total",
    "dairy_val_total",
    "edible oil_val_total",
    "pulses_val_total",
    "spices_val_total",
    "suger_salt_val_total",
    "vegetables_val_total",
    "egg_fish_meat_val_total",
    "fresh fruits_val_total",
    "dry fruits_val_total",
    "cereal substitute_val_total",
    "beverages_qty_out",
    "cereal_qty_out",
    "dairy_qty_out",
    "edible oil_qty_out",
    "pulses_qty_out",
    "spices_qty_out",
    "suger_salt_qty_out",
    "vegetables_qty_out",
    "egg_fish_meat_qty_out",
    "fresh fruits_qty_out",
    "dry fruits_qty_out",
    "cereal substitute_qty_out",
    "beverages_val_out",
    "cereal_val_out",
    "dairy_val_out",
    "edible oil_val_out",
    "pulses_val_out",
    "spices_val_out",
    "suger_salt_val_out",
    "vegetables_val_out",
    "egg_fish_meat_val_out",
    "fresh fruits_val_out",
    "dry fruits_val_out",
    "cereal substitute_val_out",
    "packaged processed food_val_total",
    "served processed food_val_total",
    "Kerosene_ration_card",
    "LPG_subsidy_received",
    "LPG_subsidized_cylinders",
    "Free_electricity",
    "Any_member_attended_school",
    "Num_govt_school_attended",
    "Num_private_school_attended",
    "Free_textbooks_received",
    "Total_textbooks",
    "Free_stationery_received",
    "Total_stationery",
    "Free_school_bag_received",
    "Total_school_bags",
    "Free_other_items_received",
    "Total_other_items",
    "Fee_waiver_received",
    "Num_fee_waiver_received",
    "Ayushman_beneficiary",
    "Num_ayushman_beneficiaries",
    "Hospitalization_case",
    "Medical_benefit_received",
    "Num_medical_beneficiaries",
    "Medical_benefit_amount",
    "Online_purchase_fuel_light",
    "Online_purchase_toilet_articles",
    "Online_purchase_education",
    "Online_purchase_medicine",
    "Online_purchase_services",
    "Kerosene_ration_card_label",
    "LPG_subsidy_received_label",
    "Free_electricity_label",
    "Any_member_attended_school_label",
    "Fee_waiver_received_label",
    "Hospitalization_case_label",
    "Medical_benefit_received_label",
    "electricity_val_total",
    "firewood_val_total",
    "other fuel_val_total",
    "subtotal fuel and light_val_total",
    "LPG_val_total",
    "kerosene_other_val_total",
    "kerosene_PDS_val_total",
    "conveyance_val_total",
    "edu expense_val_total",
    "house_garage rent_val_total",
    "medical nonhospitalized_val_total",
    "other HH consumables_val_total",
    "other consumer services_val_total",
    "toilet articles_val_total",
    "medical hospitalized_val_total",
    "entertainment_val_total",
    "other consumer taxes_cesses_val_total",
    "subtotal rent_val_total",
    "internet_val_total",
    "taxi_val_total",
    "airfare_val_total",
    "tobacco_val_total",
    "intoxicants_val_total",
    "pan_val_total",
    "questionnaire_No",
    "Online_Clothing",
    "Online_Footwear",
    "Online_Furniture",
    "Online_Mobile",
    "Online_PersonalGoods",
    "Online_RecreationGoods",
    "Online_HouseholdAppliances",
    "Online_Crockery",
    "Online_SportsGoods",
    "Online_MedicalEquipment",
    "Online_Bedding",
    "Free_Laptop",
    "Num_Free_Laptop",
    "Free_Tablet",
    "Num_Free_Tablet",
    "Free_Mobile",
    "Num_Free_Mobile",
    "Free_Bicycle",
    "Num_Free_Bicycle",
    "Free_Scooter",
    "Num_Free_Scooter",
    "Free_Clothing",
    "Num_Free_Clothing",
    "Free_Footwear",
    "Num_Free_Footwear",
    "Free_Other",
    "Num_Free_Other",
    "Possess_Television",
    "Possess_Radio",
    "Possess_Laptop",
    "Possess_Mobile",
    "Possess_Bicycle",
    "Possess_Scooter",
    "Possess_Car",
    "Possess_Truck",
    "Possess_AnimalCart",
    "Possess_Refrigerator",
    "Possess_WashingMachine",
    "Possess_AirCooler",
    "TV_Facility_Type",
    "TV_Facility_Type_label",
    "clothing_val_total",
    "footwear_val_total",
    "bedding_val_total",
    "HH appliances_val_total",
    "building_land_durable_val_total",
    "crockery_utensil_val_total",
    "furniture_fixture_val_total",
    "jewelry_ornaments_val_total",
    "personal good_val_total",
    "transport equipment_val_total",
    "recreation_val_total",
    "medical equipment_val_total"
)
FROM '/docker-entrypoint-initdb.d/HH.master.csv'
WITH (FORMAT csv, HEADER true, NULL 'NA');

CREATE INDEX IF NOT EXISTS idx_hh_master_hhid ON hh_master ("HHID");
CREATE INDEX IF NOT EXISTS idx_hh_master_state_label ON hh_master ("State_label");
CREATE INDEX IF NOT EXISTS idx_hh_master_sector_label ON hh_master ("Sector_label");
CREATE INDEX IF NOT EXISTS idx_hh_master_questionnaire_no ON hh_master ("Questionnaire_No");

CREATE OR REPLACE VIEW vw_state_summary AS
SELECT
    "State_label" AS state,
    -- ISO 3166-2 code, matches the ISO property in Superset's bundled India
    -- country_map GeoJSON. Keep this in sync with
    -- superset-frontend/plugins/legacy-plugin-chart-country-map/src/countries/india.geojson
    CASE UPPER(TRIM("State_label"))
        WHEN 'ANDAMAN AND NICOBAR ISLANDS'         THEN 'IN-AN'
        WHEN 'ANDAMAN & NICOBAR ISLANDS'           THEN 'IN-AN'
        WHEN 'ANDAMAN AND NICOBAR'                 THEN 'IN-AN'
        WHEN 'ANDHRA PRADESH'                      THEN 'IN-AP'
        WHEN 'ARUNACHAL PRADESH'                   THEN 'IN-AR'
        WHEN 'ASSAM'                               THEN 'IN-AS'
        WHEN 'BIHAR'                               THEN 'IN-BR'
        WHEN 'CHANDIGARH'                          THEN 'IN-CH'
        WHEN 'CHHATTISGARH'                        THEN 'IN-CT'
        WHEN 'CHATTISGARH'                         THEN 'IN-CT'
        WHEN 'DADRA AND NAGAR HAVELI AND DAMAN AND DIU' THEN 'IN-DH'
        WHEN 'DADRA AND NAGAR HAVELI'              THEN 'IN-DH'
        WHEN 'DAMAN AND DIU'                       THEN 'IN-DH'
        WHEN 'DELHI'                               THEN 'IN-DL'
        WHEN 'NCT OF DELHI'                        THEN 'IN-DL'
        WHEN 'GOA'                                 THEN 'IN-GA'
        WHEN 'GUJARAT'                             THEN 'IN-GJ'
        WHEN 'HARYANA'                             THEN 'IN-HR'
        WHEN 'HIMACHAL PRADESH'                    THEN 'IN-HP'
        WHEN 'JAMMU AND KASHMIR'                   THEN 'IN-JK'
        WHEN 'JAMMU & KASHMIR'                     THEN 'IN-JK'
        WHEN 'JHARKHAND'                           THEN 'IN-JH'
        WHEN 'KARNATAKA'                           THEN 'IN-KA'
        WHEN 'KERALA'                              THEN 'IN-KL'
        WHEN 'LADAKH'                              THEN 'IN-LA'
        WHEN 'LAKSHADWEEP'                         THEN 'IN-LD'
        WHEN 'MADHYA PRADESH'                      THEN 'IN-MP'
        WHEN 'MAHARASHTRA'                         THEN 'IN-MH'
        WHEN 'MANIPUR'                             THEN 'IN-MN'
        WHEN 'MEGHALAYA'                           THEN 'IN-ML'
        WHEN 'MIZORAM'                             THEN 'IN-MZ'
        WHEN 'NAGALAND'                            THEN 'IN-NL'
        WHEN 'ODISHA'                              THEN 'IN-OR'
        WHEN 'ORISSA'                              THEN 'IN-OR'
        WHEN 'PUDUCHERRY'                          THEN 'IN-PY'
        WHEN 'PONDICHERRY'                         THEN 'IN-PY'
        WHEN 'PUNJAB'                              THEN 'IN-PB'
        WHEN 'RAJASTHAN'                           THEN 'IN-RJ'
        WHEN 'SIKKIM'                              THEN 'IN-SK'
        WHEN 'TAMIL NADU'                          THEN 'IN-TN'
        WHEN 'TELANGANA'                           THEN 'IN-TG'
        WHEN 'TRIPURA'                             THEN 'IN-TR'
        WHEN 'UTTAR PRADESH'                       THEN 'IN-UP'
        WHEN 'UTTARAKHAND'                         THEN 'IN-UT'
        WHEN 'UTTARANCHAL'                         THEN 'IN-UT'
        WHEN 'WEST BENGAL'                         THEN 'IN-WB'
    END AS iso_code,
    COUNT("HHID") AS hh_count,
    AVG(NULLIF(regexp_replace("hh_size", '[^0-9.\-]+', '', 'g'), '')::NUMERIC) AS avg_hh_size,
    AVG(NULLIF(regexp_replace("mean_years_edu", '[^0-9.\-]+', '', 'g'), '')::NUMERIC) AS avg_edu_years,
    AVG(NULLIF(regexp_replace("any_internet", '[^0-9.\-]+', '', 'g'), '')::NUMERIC) AS internet_rate,
    AVG(NULLIF(regexp_replace("Ayushman_beneficiary", '[^0-9.\-]+', '', 'g'), '')::NUMERIC) AS ayushman_rate,
    AVG(NULLIF(regexp_replace("LPG_subsidy_received", '[^0-9.\-]+', '', 'g'), '')::NUMERIC) AS lpg_subsidy_rate,
    AVG(NULLIF(regexp_replace("Ration_Any_Item_Last_30_Days", '[^0-9.\-]+', '', 'g'), '')::NUMERIC) AS ration_coverage,
    AVG(NULLIF(regexp_replace("cereal_val_total", '[^0-9.\-]+', '', 'g'), '')::NUMERIC) AS avg_cereal_spend,
    AVG(NULLIF(regexp_replace("electricity_val_total", '[^0-9.\-]+', '', 'g'), '')::NUMERIC) AS avg_electricity_spend,
    AVG(NULLIF(regexp_replace("Possess_Mobile", '[^0-9.\-]+', '', 'g'), '')::NUMERIC) AS mobile_ownership_rate,
    AVG(NULLIF(regexp_replace("Possess_Car", '[^0-9.\-]+', '', 'g'), '')::NUMERIC) AS car_ownership_rate,
    AVG(NULLIF(regexp_replace("Online_Groceries", '[^0-9.\-]+', '', 'g'), '')::NUMERIC) AS online_grocery_rate
FROM hh_master
GROUP BY "State_label";

CREATE OR REPLACE VIEW vw_food_spend_long AS
SELECT "HHID" AS hhid, "State_label" AS state, "Sector_label" AS sector_label, 'Cereal' AS category,
       NULLIF(regexp_replace("cereal_val_total", '[^0-9.\-]+', '', 'g'), '')::NUMERIC AS spend
FROM hh_master
WHERE NULLIF(regexp_replace("cereal_val_total", '[^0-9.\-]+', '', 'g'), '') IS NOT NULL
UNION ALL
SELECT "HHID", "State_label", "Sector_label", 'Dairy',
       NULLIF(regexp_replace("dairy_val_total", '[^0-9.\-]+', '', 'g'), '')::NUMERIC
FROM hh_master
WHERE NULLIF(regexp_replace("dairy_val_total", '[^0-9.\-]+', '', 'g'), '') IS NOT NULL
UNION ALL
SELECT "HHID", "State_label", "Sector_label", 'Vegetables',
       NULLIF(regexp_replace("vegetables_val_total", '[^0-9.\-]+', '', 'g'), '')::NUMERIC
FROM hh_master
WHERE NULLIF(regexp_replace("vegetables_val_total", '[^0-9.\-]+', '', 'g'), '') IS NOT NULL
UNION ALL
SELECT "HHID", "State_label", "Sector_label", 'Egg/Fish/Meat',
       NULLIF(regexp_replace("egg_fish_meat_val_total", '[^0-9.\-]+', '', 'g'), '')::NUMERIC
FROM hh_master
WHERE NULLIF(regexp_replace("egg_fish_meat_val_total", '[^0-9.\-]+', '', 'g'), '') IS NOT NULL
UNION ALL
SELECT "HHID", "State_label", "Sector_label", 'Pulses',
       NULLIF(regexp_replace("pulses_val_total", '[^0-9.\-]+', '', 'g'), '')::NUMERIC
FROM hh_master
WHERE NULLIF(regexp_replace("pulses_val_total", '[^0-9.\-]+', '', 'g'), '') IS NOT NULL
UNION ALL
SELECT "HHID", "State_label", "Sector_label", 'Beverages',
       NULLIF(regexp_replace("beverages_val_total", '[^0-9.\-]+', '', 'g'), '')::NUMERIC
FROM hh_master
WHERE NULLIF(regexp_replace("beverages_val_total", '[^0-9.\-]+', '', 'g'), '') IS NOT NULL
UNION ALL
SELECT "HHID", "State_label", "Sector_label", 'Fresh Fruits',
       NULLIF(regexp_replace("fresh fruits_val_total", '[^0-9.\-]+', '', 'g'), '')::NUMERIC
FROM hh_master
WHERE NULLIF(regexp_replace("fresh fruits_val_total", '[^0-9.\-]+', '', 'g'), '') IS NOT NULL
UNION ALL
SELECT "HHID", "State_label", "Sector_label", 'Dry Fruits',
       NULLIF(regexp_replace("dry fruits_val_total", '[^0-9.\-]+', '', 'g'), '')::NUMERIC
FROM hh_master
WHERE NULLIF(regexp_replace("dry fruits_val_total", '[^0-9.\-]+', '', 'g'), '') IS NOT NULL;

CREATE OR REPLACE VIEW vw_asset_possession_long AS
SELECT "HHID" AS hhid, "State_label" AS state, "Sector_label" AS sector_label, "Social_Group_of_HH_Head_label" AS social_group,
       'Television' AS asset, NULLIF(regexp_replace("Possess_Television", '[^0-9.\-]+', '', 'g'), '')::NUMERIC AS owned
FROM hh_master
WHERE NULLIF(regexp_replace("Possess_Television", '[^0-9.\-]+', '', 'g'), '') IS NOT NULL
UNION ALL
SELECT "HHID", "State_label", "Sector_label", "Social_Group_of_HH_Head_label",
       'Mobile', NULLIF(regexp_replace("Possess_Mobile", '[^0-9.\-]+', '', 'g'), '')::NUMERIC
FROM hh_master
WHERE NULLIF(regexp_replace("Possess_Mobile", '[^0-9.\-]+', '', 'g'), '') IS NOT NULL
UNION ALL
SELECT "HHID", "State_label", "Sector_label", "Social_Group_of_HH_Head_label",
       'Refrigerator', NULLIF(regexp_replace("Possess_Refrigerator", '[^0-9.\-]+', '', 'g'), '')::NUMERIC
FROM hh_master
WHERE NULLIF(regexp_replace("Possess_Refrigerator", '[^0-9.\-]+', '', 'g'), '') IS NOT NULL
UNION ALL
SELECT "HHID", "State_label", "Sector_label", "Social_Group_of_HH_Head_label",
       'Car', NULLIF(regexp_replace("Possess_Car", '[^0-9.\-]+', '', 'g'), '')::NUMERIC
FROM hh_master
WHERE NULLIF(regexp_replace("Possess_Car", '[^0-9.\-]+', '', 'g'), '') IS NOT NULL
UNION ALL
SELECT "HHID", "State_label", "Sector_label", "Social_Group_of_HH_Head_label",
       'Washing Machine', NULLIF(regexp_replace("Possess_WashingMachine", '[^0-9.\-]+', '', 'g'), '')::NUMERIC
FROM hh_master
WHERE NULLIF(regexp_replace("Possess_WashingMachine", '[^0-9.\-]+', '', 'g'), '') IS NOT NULL
UNION ALL
SELECT "HHID", "State_label", "Sector_label", "Social_Group_of_HH_Head_label",
       'Laptop', NULLIF(regexp_replace("Possess_Laptop", '[^0-9.\-]+', '', 'g'), '')::NUMERIC
FROM hh_master
WHERE NULLIF(regexp_replace("Possess_Laptop", '[^0-9.\-]+', '', 'g'), '') IS NOT NULL;

CREATE OR REPLACE VIEW vw_income_source_flow AS
SELECT
    COALESCE(NULLIF("Max_Income_Activity_label", ''), 'Unknown') AS source,
    COALESCE(NULLIF("Sector_label", ''), 'Unknown') AS target,
    COUNT("HHID") AS hh_count
FROM hh_master
GROUP BY COALESCE(NULLIF("Max_Income_Activity_label", ''), 'Unknown'), COALESCE(NULLIF("Sector_label", ''), 'Unknown');

-- Pre-aggregated heatmap views (exact, fast, no row limit issues)
CREATE OR REPLACE VIEW vw_food_spend_heatmap AS
SELECT
    state,
    category,
    ROUND(AVG(spend)::NUMERIC, 2) AS avg_spend,
    COUNT(DISTINCT hhid) AS hh_count
FROM vw_food_spend_long
GROUP BY state, category;

CREATE OR REPLACE VIEW vw_asset_ownership_heatmap AS
SELECT
    state,
    asset,
    ROUND(AVG(owned)::NUMERIC, 4) AS ownership_rate,
    COUNT(DISTINCT hhid) AS hh_count
FROM vw_asset_possession_long
GROUP BY state, asset;

-- Geographic hierarchy views
CREATE OR REPLACE VIEW vw_district_summary AS
SELECT
    "State_label" AS state,
    "District" AS district,
    COUNT("HHID") AS hh_count,
    ROUND(AVG(NULLIF(regexp_replace("hh_size", '[^0-9.\-]+', '', 'g'), '')::NUMERIC)::NUMERIC, 2) AS avg_hh_size,
    ROUND(AVG(NULLIF(regexp_replace("mean_years_edu", '[^0-9.\-]+', '', 'g'), '')::NUMERIC)::NUMERIC, 2) AS avg_edu_years,
    ROUND(AVG(NULLIF(regexp_replace("any_internet", '[^0-9.\-]+', '', 'g'), '')::NUMERIC)::NUMERIC, 4) AS internet_rate,
    ROUND(AVG(NULLIF(regexp_replace("Ayushman_beneficiary", '[^0-9.\-]+', '', 'g'), '')::NUMERIC)::NUMERIC, 4) AS ayushman_rate,
    ROUND(AVG(NULLIF(regexp_replace("LPG_subsidy_received", '[^0-9.\-]+', '', 'g'), '')::NUMERIC)::NUMERIC, 4) AS lpg_subsidy_rate,
    ROUND(AVG(NULLIF(regexp_replace("Ration_Any_Item_Last_30_Days", '[^0-9.\-]+', '', 'g'), '')::NUMERIC)::NUMERIC, 4) AS ration_coverage
FROM hh_master
GROUP BY "State_label", "District";

-- State + District combined for drill-down
CREATE OR REPLACE VIEW vw_geo_hierarchy AS
SELECT
    "State_label" AS state,
    "District" AS district,
    COUNT("HHID") AS hh_count,
    "Sector_label" AS sector,
    "Social_Group_of_HH_Head_label" AS social_group,
    "Religion_of_HH_Head_label" AS religion,
    "Year" AS year
FROM hh_master
GROUP BY "State_label", "District", "Sector_label", "Social_Group_of_HH_Head_label", "Religion_of_HH_Head_label", "Year";

-- Welfare summary view
CREATE OR REPLACE VIEW vw_welfare_summary AS
SELECT
    "State_label" AS state,
    COUNT("HHID") AS hh_count,
    ROUND(AVG(NULLIF(regexp_replace("Ayushman_beneficiary", '[^0-9.\-]+', '', 'g'), '')::NUMERIC)::NUMERIC, 4) AS ayushman_rate,
    ROUND(AVG(NULLIF(regexp_replace("LPG_subsidy_received", '[^0-9.\-]+', '', 'g'), '')::NUMERIC)::NUMERIC, 4) AS lpg_subsidy_rate,
    ROUND(AVG(NULLIF(regexp_replace("Free_electricity", '[^0-9.\-]+', '', 'g'), '')::NUMERIC)::NUMERIC, 4) AS free_electricity_rate,
    ROUND(AVG(NULLIF(regexp_replace("Ration_Any_Item_Last_30_Days", '[^0-9.\-]+', '', 'g'), '')::NUMERIC)::NUMERIC, 4) AS ration_rate,
    ROUND(AVG(NULLIF(regexp_replace("Any_member_attended_school", '[^0-9.\-]+', '', 'g'), '')::NUMERIC)::NUMERIC, 4) AS school_attendance_rate,
    ROUND(AVG(NULLIF(regexp_replace("Free_textbooks_received", '[^0-9.\-]+', '', 'g'), '')::NUMERIC)::NUMERIC, 4) AS free_textbooks_rate,
    ROUND(AVG(NULLIF(regexp_replace("Fee_waiver_received", '[^0-9.\-]+', '', 'g'), '')::NUMERIC)::NUMERIC, 4) AS fee_waiver_rate
FROM hh_master
GROUP BY "State_label";

-- Digital adoption summary
CREATE OR REPLACE VIEW vw_digital_adoption AS
SELECT
    "State_label" AS state,
    "Sector_label" AS sector,
    COUNT("HHID") AS hh_count,
    ROUND(AVG(NULLIF(regexp_replace("any_internet", '[^0-9.\-]+', '', 'g'), '')::NUMERIC)::NUMERIC, 4) AS internet_rate,
    ROUND(AVG(NULLIF(regexp_replace("Online_Groceries", '[^0-9.\-]+', '', 'g'), '')::NUMERIC)::NUMERIC, 4) AS online_grocery_rate,
    ROUND(AVG(NULLIF(regexp_replace("Online_Milk", '[^0-9.\-]+', '', 'g'), '')::NUMERIC)::NUMERIC, 4) AS online_milk_rate,
    ROUND(AVG(NULLIF(regexp_replace("Online_Vegetables", '[^0-9.\-]+', '', 'g'), '')::NUMERIC)::NUMERIC, 4) AS online_veg_rate,
    ROUND(AVG(NULLIF(regexp_replace("Online_purchase_medicine", '[^0-9.\-]+', '', 'g'), '')::NUMERIC)::NUMERIC, 4) AS online_medicine_rate,
    ROUND(AVG(NULLIF(regexp_replace("Online_purchase_education", '[^0-9.\-]+', '', 'g'), '')::NUMERIC)::NUMERIC, 4) AS online_education_rate
FROM hh_master
GROUP BY "State_label", "Sector_label";

-- State-level choropleth is rendered via Superset's built-in country_map
-- plugin, which ships the India GeoJSON and matches rows by ISO 3166-2
-- code. See vw_state_summary.iso_code above — no boundary table or
-- external GeoJSON loader is needed.
