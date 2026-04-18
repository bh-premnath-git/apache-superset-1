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

-- ── State label → ISO 3166-2 code mapping ────────────────────────────────────
-- Single source of truth for the label-to-ISO conversion. Every analytical
-- view that exposes `iso_code` calls this function so the cross-filter from
-- the country_map plugin (which emits the `iso_code` column) lines up across
-- views without having to keep multiple CASE expressions in sync.
--
-- Keep the mapping aligned with the ISO property in Superset's bundled India
-- country_map GeoJSON. Covers all 28 states and 8 UTs, plus legacy labels
-- (Orissa/Pondicherry/Uttaranchal) and pre-2020 split UT names that still
-- appear in NSS extracts.
CREATE OR REPLACE FUNCTION state_to_iso(state_label TEXT) RETURNS TEXT
LANGUAGE SQL IMMUTABLE AS $$
    SELECT CASE UPPER(TRIM(state_label))
        WHEN 'ANDAMAN AND NICOBAR ISLANDS'         THEN 'IN-AN'
        WHEN 'ANDAMAN & NICOBAR ISLANDS'           THEN 'IN-AN'
        WHEN 'ANDAMAN AND NICOBAR'                 THEN 'IN-AN'
        WHEN 'A AND N ISLANDS (U.T.)'              THEN 'IN-AN'
        WHEN 'A & N ISLANDS (U.T.)'                THEN 'IN-AN'
        WHEN 'ANDHRA PRADESH'                      THEN 'IN-AP'
        WHEN 'ARUNACHAL PRADESH'                   THEN 'IN-AR'
        WHEN 'ASSAM'                               THEN 'IN-AS'
        WHEN 'BIHAR'                               THEN 'IN-BR'
        WHEN 'CHANDIGARH'                          THEN 'IN-CH'
        WHEN 'CHANDIGARH(U.T.)'                    THEN 'IN-CH'
        WHEN 'CHHATTISGARH'                        THEN 'IN-CT'
        WHEN 'CHATTISGARH'                         THEN 'IN-CT'
        WHEN 'DADRA AND NAGAR HAVELI AND DAMAN AND DIU' THEN 'IN-DH'
        WHEN 'DADRA & NAGAR HAVELI AND DAMAN & DIU' THEN 'IN-DH'
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
        WHEN 'LADAKH (U.T.)'                       THEN 'IN-LA'
        WHEN 'LAKSHADWEEP'                         THEN 'IN-LD'
        WHEN 'LAKSHADWEEP (U.T.)'                  THEN 'IN-LD'
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
        WHEN 'PUDUCHERRY (U.T.)'                   THEN 'IN-PY'
        WHEN 'PUNJAB'                              THEN 'IN-PB'
        WHEN 'RAJASTHAN'                           THEN 'IN-RJ'
        WHEN 'SIKKIM'                              THEN 'IN-SK'
        WHEN 'TAMIL NADU'                          THEN 'IN-TN'
        WHEN 'TAMILNADU'                           THEN 'IN-TN'
        WHEN 'TELANGANA'                           THEN 'IN-TG'
        WHEN 'TRIPURA'                             THEN 'IN-TR'
        WHEN 'UTTAR PRADESH'                       THEN 'IN-UP'
        WHEN 'UTTAR PRDESH'                        THEN 'IN-UP'
        WHEN 'UTTARAKHAND'                         THEN 'IN-UT'
        WHEN 'UTTARANCHAL'                         THEN 'IN-UT'
        WHEN 'UTTRAKHAND'                          THEN 'IN-UT'
        WHEN 'WEST BENGAL'                         THEN 'IN-WB'
    END
$$;

CREATE OR REPLACE VIEW vw_state_summary AS
SELECT
    "State_label" AS state,
    state_to_iso("State_label") AS iso_code,
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
WITH state_households AS (
    SELECT
        "State_label" AS state,
        COUNT(DISTINCT "HHID") AS hh_count
    FROM hh_master
    GROUP BY "State_label"
),
asset_rates AS (
    SELECT
        "State_label" AS state,
        'Television' AS asset,
        AVG(CASE WHEN COALESCE(NULLIF(TRIM("Possess_Television"), ''), '0') = '1' THEN 1.0 ELSE 0.0 END) AS ownership_rate
    FROM hh_master
    GROUP BY "State_label"
    UNION ALL
    SELECT
        "State_label",
        'Mobile',
        AVG(CASE WHEN COALESCE(NULLIF(TRIM("Possess_Mobile"), ''), '0') = '1' THEN 1.0 ELSE 0.0 END)
    FROM hh_master
    GROUP BY "State_label"
    UNION ALL
    SELECT
        "State_label",
        'Refrigerator',
        AVG(CASE WHEN COALESCE(NULLIF(TRIM("Possess_Refrigerator"), ''), '0') = '1' THEN 1.0 ELSE 0.0 END)
    FROM hh_master
    GROUP BY "State_label"
    UNION ALL
    SELECT
        "State_label",
        'Car',
        AVG(CASE WHEN COALESCE(NULLIF(TRIM("Possess_Car"), ''), '0') = '1' THEN 1.0 ELSE 0.0 END)
    FROM hh_master
    GROUP BY "State_label"
    UNION ALL
    SELECT
        "State_label",
        'Washing Machine',
        AVG(CASE WHEN COALESCE(NULLIF(TRIM("Possess_WashingMachine"), ''), '0') = '1' THEN 1.0 ELSE 0.0 END)
    FROM hh_master
    GROUP BY "State_label"
    UNION ALL
    SELECT
        "State_label",
        'Laptop',
        AVG(CASE WHEN COALESCE(NULLIF(TRIM("Possess_Laptop"), ''), '0') = '1' THEN 1.0 ELSE 0.0 END)
    FROM hh_master
    GROUP BY "State_label"
)
SELECT
    asset_rates.state,
    asset_rates.asset,
    ROUND(asset_rates.ownership_rate::NUMERIC, 4) AS ownership_rate,
    state_households.hh_count
FROM asset_rates
JOIN state_households
  ON state_households.state = asset_rates.state;

CREATE OR REPLACE VIEW vw_state_geo_points AS
WITH geo_base AS (
    SELECT
        summary.state,
        summary.iso_code,
        summary.hh_count,
        ROUND(summary.internet_rate::NUMERIC, 4) AS internet_rate,
        ROUND(summary.mobile_ownership_rate::NUMERIC, 4) AS mobile_ownership_rate,
        ROUND(summary.car_ownership_rate::NUMERIC, 4) AS car_ownership_rate,
        ROUND(summary.avg_edu_years::NUMERIC, 2) AS avg_edu_years,
        ROUND(summary.ayushman_rate::NUMERIC, 4) AS ayushman_rate,
        CASE summary.iso_code
            WHEN 'IN-AN' THEN 11.7401
            WHEN 'IN-AP' THEN 15.9129
            WHEN 'IN-AR' THEN 28.2180
            WHEN 'IN-AS' THEN 26.2006
            WHEN 'IN-BR' THEN 25.0961
            WHEN 'IN-CH' THEN 30.7333
            WHEN 'IN-CT' THEN 21.2787
            WHEN 'IN-DN' THEN 20.3974
            WHEN 'IN-DL' THEN 28.7041
            WHEN 'IN-GA' THEN 15.2993
            WHEN 'IN-GJ' THEN 22.2587
            WHEN 'IN-HP' THEN 31.1048
            WHEN 'IN-HR' THEN 29.0588
            WHEN 'IN-JH' THEN 23.6102
            WHEN 'IN-JK' THEN 34.0837
            WHEN 'IN-KA' THEN 15.3173
            WHEN 'IN-KL' THEN 10.8505
            WHEN 'IN-LA' THEN 34.1526
            WHEN 'IN-LD' THEN 10.5667
            WHEN 'IN-MH' THEN 19.7515
            WHEN 'IN-ML' THEN 25.4670
            WHEN 'IN-MN' THEN 24.6637
            WHEN 'IN-MP' THEN 23.4733
            WHEN 'IN-MZ' THEN 23.1645
            WHEN 'IN-NL' THEN 26.1584
            WHEN 'IN-OR' THEN 20.9517
            WHEN 'IN-PB' THEN 31.1471
            WHEN 'IN-PY' THEN 11.9416
            WHEN 'IN-RJ' THEN 27.0238
            WHEN 'IN-SK' THEN 27.5330
            WHEN 'IN-TG' THEN 18.1124
            WHEN 'IN-TN' THEN 11.1271
            WHEN 'IN-TR' THEN 23.9408
            WHEN 'IN-UP' THEN 26.8467
            WHEN 'IN-UT' THEN 30.0668
            WHEN 'IN-WB' THEN 22.9868
        END AS latitude,
        CASE summary.iso_code
            WHEN 'IN-AN' THEN 92.6586
            WHEN 'IN-AP' THEN 79.7400
            WHEN 'IN-AR' THEN 94.7278
            WHEN 'IN-AS' THEN 92.9376
            WHEN 'IN-BR' THEN 85.3131
            WHEN 'IN-CH' THEN 76.7794
            WHEN 'IN-CT' THEN 81.8661
            WHEN 'IN-DN' THEN 72.8397
            WHEN 'IN-DL' THEN 77.1025
            WHEN 'IN-GA' THEN 74.1240
            WHEN 'IN-GJ' THEN 71.1924
            WHEN 'IN-HP' THEN 77.1734
            WHEN 'IN-HR' THEN 76.0856
            WHEN 'IN-JH' THEN 85.2799
            WHEN 'IN-JK' THEN 74.7973
            WHEN 'IN-KA' THEN 75.7139
            WHEN 'IN-KL' THEN 76.2711
            WHEN 'IN-LA' THEN 77.5770
            WHEN 'IN-LD' THEN 72.6417
            WHEN 'IN-MH' THEN 75.7139
            WHEN 'IN-ML' THEN 91.3662
            WHEN 'IN-MN' THEN 93.9063
            WHEN 'IN-MP' THEN 77.9470
            WHEN 'IN-MZ' THEN 92.9376
            WHEN 'IN-NL' THEN 94.5624
            WHEN 'IN-OR' THEN 85.0985
            WHEN 'IN-PB' THEN 75.3412
            WHEN 'IN-PY' THEN 79.8083
            WHEN 'IN-RJ' THEN 74.2179
            WHEN 'IN-SK' THEN 88.5122
            WHEN 'IN-TG' THEN 79.0193
            WHEN 'IN-TN' THEN 78.6569
            WHEN 'IN-TR' THEN 91.9882
            WHEN 'IN-UP' THEN 80.9462
            WHEN 'IN-UT' THEN 79.0193
            WHEN 'IN-WB' THEN 87.8550
        END AS longitude
    FROM vw_state_summary AS summary
)
SELECT *
FROM geo_base
WHERE iso_code IS NOT NULL AND latitude IS NOT NULL AND longitude IS NOT NULL;

-- Geographic hierarchy views
CREATE OR REPLACE VIEW vw_district_summary AS
SELECT
    "State_label" AS state,
    state_to_iso("State_label") AS iso_code,
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

CREATE OR REPLACE VIEW vw_household_drill_base AS
SELECT
    "HHID" AS hhid,
    "Year" AS year,
    "State_label" AS state,
    state_to_iso("State_label") AS iso_code,
    COALESCE(NULLIF("District", ''), 'Unknown') AS district,
    COALESCE(NULLIF("Sector_label", ''), 'Unknown') AS sector,
    COALESCE(NULLIF("Social_Group_of_HH_Head_label", ''), 'Unknown') AS social_group,
    COALESCE(NULLIF("Religion_of_HH_Head_label", ''), 'Unknown') AS religion,
    COALESCE(NULLIF("Max_Income_Activity_label", ''), 'Unknown') AS income_source,
    NULLIF(regexp_replace("hh_size", '[^0-9.\-]+', '', 'g'), '')::NUMERIC AS hh_size,
    NULLIF(regexp_replace("mean_years_edu", '[^0-9.\-]+', '', 'g'), '')::NUMERIC AS avg_edu_years,
    CASE WHEN COALESCE(NULLIF(TRIM("any_internet"), ''), '0') = '1' THEN 1 ELSE 0 END AS internet_access,
    CASE WHEN COALESCE(NULLIF(TRIM("Ayushman_beneficiary"), ''), '0') = '1' THEN 1 ELSE 0 END AS ayushman_beneficiary,
    CASE WHEN COALESCE(NULLIF(TRIM("LPG_subsidy_received"), ''), '0') = '1' THEN 1 ELSE 0 END AS lpg_subsidy_received,
    CASE WHEN COALESCE(NULLIF(TRIM("Ration_Any_Item_Last_30_Days"), ''), '0') = '1' THEN 1 ELSE 0 END AS ration_received,
    CASE WHEN COALESCE(NULLIF(TRIM("Fee_waiver_received"), ''), '0') = '1' THEN 1 ELSE 0 END AS fee_waiver_received,
    CASE WHEN COALESCE(NULLIF(TRIM("Possess_Mobile"), ''), '0') = '1' THEN 1 ELSE 0 END AS mobile_ownership,
    CASE WHEN COALESCE(NULLIF(TRIM("Possess_Car"), ''), '0') = '1' THEN 1 ELSE 0 END AS car_ownership,
    NULLIF(regexp_replace("cereal_val_total", '[^0-9.\-]+', '', 'g'), '')::NUMERIC AS cereal_spend,
    NULLIF(regexp_replace("electricity_val_total", '[^0-9.\-]+', '', 'g'), '')::NUMERIC AS electricity_spend,
    NULLIF(regexp_replace("beverages_val_total", '[^0-9.\-]+', '', 'g'), '')::NUMERIC AS beverages_spend
FROM hh_master;

CREATE OR REPLACE VIEW vw_district_sector_drill AS
SELECT
    state,
    iso_code,
    district,
    sector,
    COUNT(hhid) AS hh_count,
    ROUND(AVG(hh_size)::NUMERIC, 2) AS avg_hh_size,
    ROUND(AVG(avg_edu_years)::NUMERIC, 2) AS avg_edu_years,
    ROUND(AVG(internet_access)::NUMERIC, 4) AS internet_rate,
    ROUND(AVG(ayushman_beneficiary)::NUMERIC, 4) AS ayushman_rate,
    ROUND(AVG(lpg_subsidy_received)::NUMERIC, 4) AS lpg_subsidy_rate,
    ROUND(AVG(ration_received)::NUMERIC, 4) AS ration_rate,
    ROUND(AVG(mobile_ownership)::NUMERIC, 4) AS mobile_ownership_rate,
    ROUND(AVG(car_ownership)::NUMERIC, 4) AS car_ownership_rate,
    ROUND(AVG(cereal_spend)::NUMERIC, 2) AS avg_cereal_spend,
    ROUND(AVG(electricity_spend)::NUMERIC, 2) AS avg_electricity_spend
FROM vw_household_drill_base
GROUP BY state, iso_code, district, sector;

CREATE OR REPLACE VIEW vw_district_social_group_drill AS
SELECT
    state,
    iso_code,
    district,
    social_group,
    COUNT(hhid) AS hh_count,
    ROUND(AVG(hh_size)::NUMERIC, 2) AS avg_hh_size,
    ROUND(AVG(avg_edu_years)::NUMERIC, 2) AS avg_edu_years,
    ROUND(AVG(internet_access)::NUMERIC, 4) AS internet_rate,
    ROUND(AVG(ayushman_beneficiary)::NUMERIC, 4) AS ayushman_rate,
    ROUND(AVG(lpg_subsidy_received)::NUMERIC, 4) AS lpg_subsidy_rate,
    ROUND(AVG(ration_received)::NUMERIC, 4) AS ration_rate,
    ROUND(AVG(fee_waiver_received)::NUMERIC, 4) AS fee_waiver_rate,
    ROUND(AVG(mobile_ownership)::NUMERIC, 4) AS mobile_ownership_rate,
    ROUND(AVG(car_ownership)::NUMERIC, 4) AS car_ownership_rate
FROM vw_household_drill_base
GROUP BY state, iso_code, district, social_group;

CREATE OR REPLACE VIEW vw_state_sector_social_group_drill AS
SELECT
    state,
    iso_code,
    sector,
    social_group,
    COUNT(hhid) AS hh_count,
    ROUND(AVG(hh_size)::NUMERIC, 2) AS avg_hh_size,
    ROUND(AVG(avg_edu_years)::NUMERIC, 2) AS avg_edu_years,
    ROUND(AVG(internet_access)::NUMERIC, 4) AS internet_rate,
    ROUND(AVG(ayushman_beneficiary)::NUMERIC, 4) AS ayushman_rate,
    ROUND(AVG(lpg_subsidy_received)::NUMERIC, 4) AS lpg_subsidy_rate,
    ROUND(AVG(ration_received)::NUMERIC, 4) AS ration_rate,
    ROUND(AVG(fee_waiver_received)::NUMERIC, 4) AS fee_waiver_rate,
    ROUND(AVG(mobile_ownership)::NUMERIC, 4) AS mobile_ownership_rate,
    ROUND(AVG(car_ownership)::NUMERIC, 4) AS car_ownership_rate,
    ROUND(AVG(cereal_spend)::NUMERIC, 2) AS avg_cereal_spend,
    ROUND(AVG(beverages_spend)::NUMERIC, 2) AS avg_beverages_spend
FROM vw_household_drill_base
GROUP BY state, iso_code, sector, social_group;

-- Welfare summary view. `iso_code` is exposed so the country_map's
-- cross-filter (which emits {col: 'iso_code', op: 'IN', val: ['IN-XX']})
-- can target this view as a state drill-down receiver.
CREATE OR REPLACE VIEW vw_welfare_summary AS
SELECT
    "State_label" AS state,
    state_to_iso("State_label") AS iso_code,
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

-- Welfare KPI view in long form for the "Selected State Welfare Coverage" bar
-- chart. One row per (iso_code, scheme) so a single bar chart with x_axis =
-- scheme will draw side-by-side bars for the cross-filtered state.
CREATE OR REPLACE VIEW vw_welfare_kpis_long AS
SELECT iso_code, state, 'Ayushman'           AS scheme, ayushman_rate         AS coverage_rate FROM vw_welfare_summary
UNION ALL
SELECT iso_code, state, 'LPG Subsidy',                  lpg_subsidy_rate                       FROM vw_welfare_summary
UNION ALL
SELECT iso_code, state, 'Free Electricity',             free_electricity_rate                  FROM vw_welfare_summary
UNION ALL
SELECT iso_code, state, 'Ration (last 30d)',            ration_rate                            FROM vw_welfare_summary
UNION ALL
SELECT iso_code, state, 'School Attendance',            school_attendance_rate                 FROM vw_welfare_summary
UNION ALL
SELECT iso_code, state, 'Free Textbooks',               free_textbooks_rate                    FROM vw_welfare_summary
UNION ALL
SELECT iso_code, state, 'Fee Waiver',                   fee_waiver_rate                        FROM vw_welfare_summary;

-- Digital adoption summary. `iso_code` is exposed so the country_map's
-- cross-filter targets this view as a state drill-down receiver.
CREATE OR REPLACE VIEW vw_digital_adoption AS
SELECT
    "State_label" AS state,
    state_to_iso("State_label") AS iso_code,
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

-- Digital adoption KPI view in long form for the "Selected State Digital
-- Adoption" bar chart. One row per (iso_code, channel) so a single bar chart
-- with x_axis = channel will draw side-by-side bars for the cross-filtered
-- state, weight-averaged across sectors using hh_count.
CREATE OR REPLACE VIEW vw_digital_kpis_long AS
WITH agg AS (
    SELECT
        iso_code,
        state,
        SUM(hh_count) AS hh_count,
        ROUND((SUM(internet_rate         * hh_count) / NULLIF(SUM(hh_count), 0))::NUMERIC, 4) AS internet_rate,
        ROUND((SUM(online_grocery_rate   * hh_count) / NULLIF(SUM(hh_count), 0))::NUMERIC, 4) AS online_grocery_rate,
        ROUND((SUM(online_milk_rate      * hh_count) / NULLIF(SUM(hh_count), 0))::NUMERIC, 4) AS online_milk_rate,
        ROUND((SUM(online_veg_rate       * hh_count) / NULLIF(SUM(hh_count), 0))::NUMERIC, 4) AS online_veg_rate,
        ROUND((SUM(online_medicine_rate  * hh_count) / NULLIF(SUM(hh_count), 0))::NUMERIC, 4) AS online_medicine_rate,
        ROUND((SUM(online_education_rate * hh_count) / NULLIF(SUM(hh_count), 0))::NUMERIC, 4) AS online_education_rate
    FROM vw_digital_adoption
    GROUP BY iso_code, state
)
SELECT iso_code, state, 'Any Internet'        AS channel, internet_rate         AS adoption_rate FROM agg
UNION ALL
SELECT iso_code, state, 'Online Groceries',              online_grocery_rate                    FROM agg
UNION ALL
SELECT iso_code, state, 'Online Milk',                   online_milk_rate                       FROM agg
UNION ALL
SELECT iso_code, state, 'Online Vegetables',             online_veg_rate                        FROM agg
UNION ALL
SELECT iso_code, state, 'Online Medicine',               online_medicine_rate                   FROM agg
UNION ALL
SELECT iso_code, state, 'Online Education',              online_education_rate                  FROM agg;

-- Per-state sector mix for the "Selected State Sector Mix" pie. iso_code is
-- exposed so the cross-filter from the choropleth narrows the pie to the
-- clicked state.
CREATE OR REPLACE VIEW vw_state_sector_summary AS
SELECT
    "State_label" AS state,
    state_to_iso("State_label") AS iso_code,
    "Sector_label" AS sector,
    COUNT("HHID") AS hh_count
FROM hh_master
GROUP BY "State_label", "Sector_label";

CREATE OR REPLACE VIEW vw_dashboard_navigation AS
SELECT
    1 AS nav_order,
    'Overview'::TEXT AS navigation_group,
    'LCA Overview Dashboard'::TEXT AS dashboard_title,
    'lca-overview-dashboard'::TEXT AS dashboard_slug,
    '/superset/dashboard/lca-overview-dashboard/'::TEXT AS dashboard_path,
    'National overview with state map, KPI summary, and top-level comparisons.'::TEXT AS dashboard_description,
    'Use when starting exploration or comparing states nationally.'::TEXT AS recommended_use
UNION ALL
SELECT
    2,
    'Drill',
    'LCA State Drill Dashboard',
    'lca-state-drill-dashboard',
    '/superset/dashboard/lca-state-drill-dashboard/',
    'District, sector, social-group, and household drill views for one state at a time.',
    'Use after identifying a state or segment that needs deeper analysis.'
UNION ALL
SELECT
    3,
    'Explorer',
    'LCA Household Explorer',
    'lca-household-explorer',
    '/superset/dashboard/lca-household-explorer/',
    'Household-level exploration table with state, district, sector, and social-group filters.',
    'Use for row-level inspection and detailed household slicing.';

CREATE TABLE IF NOT EXISTS dashboard_state_links (
    state TEXT NOT NULL,
    iso_code TEXT NOT NULL,
    state_drill_url TEXT NOT NULL,
    household_explorer_url TEXT NOT NULL,
    PRIMARY KEY (iso_code)
);

-- State-level choropleth is rendered via Superset's built-in country_map
-- plugin, which ships the India GeoJSON and matches rows by ISO 3166-2
-- code. See vw_state_summary.iso_code above — no boundary table or
-- external GeoJSON loader is needed.
--
-- All "Selected State *" detail charts are wired to receive the cross-filter
-- the choropleth emits on `iso_code`. Every view they read from exposes that
-- column via state_to_iso(). See seed/chart_config.yaml for the wiring and
-- docker/scripts/seed_dashboard.py for the chart_configuration that scopes
-- the cross-filter to those receivers only.

-- ── Social group welfare & digital summary ───────────────────────────────────
-- Aggregates welfare scheme coverage, internet access, education, and asset
-- ownership by social group of the household head. Used for equity comparison.
CREATE OR REPLACE VIEW vw_social_group_summary AS
SELECT
    COALESCE(NULLIF("Social_Group_of_HH_Head_label", ''), 'Unknown') AS social_group,
    COUNT("HHID") AS hh_count,
    ROUND(AVG(NULLIF(regexp_replace("Ayushman_beneficiary",        '[^0-9.\-]+', '', 'g'), '')::NUMERIC)::NUMERIC, 4) AS ayushman_rate,
    ROUND(AVG(NULLIF(regexp_replace("LPG_subsidy_received",        '[^0-9.\-]+', '', 'g'), '')::NUMERIC)::NUMERIC, 4) AS lpg_subsidy_rate,
    ROUND(AVG(NULLIF(regexp_replace("Ration_Any_Item_Last_30_Days",'[^0-9.\-]+', '', 'g'), '')::NUMERIC)::NUMERIC, 4) AS ration_rate,
    ROUND(AVG(NULLIF(regexp_replace("any_internet",                '[^0-9.\-]+', '', 'g'), '')::NUMERIC)::NUMERIC, 4) AS internet_rate,
    ROUND(AVG(NULLIF(regexp_replace("mean_years_edu",              '[^0-9.\-]+', '', 'g'), '')::NUMERIC)::NUMERIC, 2) AS avg_edu_years,
    ROUND(AVG(NULLIF(regexp_replace("Fee_waiver_received",         '[^0-9.\-]+', '', 'g'), '')::NUMERIC)::NUMERIC, 4) AS fee_waiver_rate,
    ROUND(AVG(NULLIF(regexp_replace("Possess_Mobile",              '[^0-9.\-]+', '', 'g'), '')::NUMERIC)::NUMERIC, 4) AS mobile_ownership_rate
FROM hh_master
GROUP BY "Social_Group_of_HH_Head_label";

-- Long-form KPIs by social group for grouped bar comparison chart.
-- kpi_name is the dimension; rate is the measure.
CREATE OR REPLACE VIEW vw_social_group_kpis_long AS
SELECT social_group, 'Ayushman'        AS kpi_name, ayushman_rate         AS rate FROM vw_social_group_summary
UNION ALL
SELECT social_group, 'LPG Subsidy',               lpg_subsidy_rate              FROM vw_social_group_summary
UNION ALL
SELECT social_group, 'Ration Coverage',           ration_rate                   FROM vw_social_group_summary
UNION ALL
SELECT social_group, 'Internet Access',           internet_rate                 FROM vw_social_group_summary
UNION ALL
SELECT social_group, 'Fee Waiver',                fee_waiver_rate               FROM vw_social_group_summary
UNION ALL
SELECT social_group, 'Mobile Ownership',          mobile_ownership_rate         FROM vw_social_group_summary;

-- ── State food spend with iso_code (cross-filter drill-down receiver) ─────────
-- Pre-aggregated food category spend by state, exposing iso_code so the
-- India choropleth cross-filter can narrow it to the selected state.
CREATE OR REPLACE VIEW vw_food_spend_state AS
SELECT
    state,
    state_to_iso(state)              AS iso_code,
    category,
    ROUND(AVG(spend)::NUMERIC, 2)    AS avg_spend,
    COUNT(DISTINCT hhid)             AS hh_count
FROM vw_food_spend_long
GROUP BY state, category;

-- ── State asset ownership with iso_code (cross-filter drill-down receiver) ────
-- Pre-aggregated asset ownership rate by state, exposing iso_code so the
-- choropleth cross-filter narrows it to the selected state.
CREATE OR REPLACE VIEW vw_asset_state AS
WITH state_households AS (
    SELECT
        "State_label" AS state,
        state_to_iso("State_label") AS iso_code,
        COUNT(DISTINCT "HHID") AS hh_count
    FROM hh_master
    GROUP BY "State_label"
),
asset_rates AS (
    SELECT
        "State_label" AS state,
        state_to_iso("State_label") AS iso_code,
        'Television' AS asset,
        AVG(CASE WHEN COALESCE(NULLIF(TRIM("Possess_Television"), ''), '0') = '1' THEN 1.0 ELSE 0.0 END) AS ownership_rate
    FROM hh_master
    GROUP BY "State_label"
    UNION ALL
    SELECT
        "State_label",
        state_to_iso("State_label"),
        'Mobile',
        AVG(CASE WHEN COALESCE(NULLIF(TRIM("Possess_Mobile"), ''), '0') = '1' THEN 1.0 ELSE 0.0 END)
    FROM hh_master
    GROUP BY "State_label"
    UNION ALL
    SELECT
        "State_label",
        state_to_iso("State_label"),
        'Refrigerator',
        AVG(CASE WHEN COALESCE(NULLIF(TRIM("Possess_Refrigerator"), ''), '0') = '1' THEN 1.0 ELSE 0.0 END)
    FROM hh_master
    GROUP BY "State_label"
    UNION ALL
    SELECT
        "State_label",
        state_to_iso("State_label"),
        'Car',
        AVG(CASE WHEN COALESCE(NULLIF(TRIM("Possess_Car"), ''), '0') = '1' THEN 1.0 ELSE 0.0 END)
    FROM hh_master
    GROUP BY "State_label"
    UNION ALL
    SELECT
        "State_label",
        state_to_iso("State_label"),
        'Washing Machine',
        AVG(CASE WHEN COALESCE(NULLIF(TRIM("Possess_WashingMachine"), ''), '0') = '1' THEN 1.0 ELSE 0.0 END)
    FROM hh_master
    GROUP BY "State_label"
    UNION ALL
    SELECT
        "State_label",
        state_to_iso("State_label"),
        'Laptop',
        AVG(CASE WHEN COALESCE(NULLIF(TRIM("Possess_Laptop"), ''), '0') = '1' THEN 1.0 ELSE 0.0 END)
    FROM hh_master
    GROUP BY "State_label"
)
SELECT
    asset_rates.state,
    asset_rates.iso_code,
    asset_rates.asset,
    ROUND(asset_rates.ownership_rate::NUMERIC, 4) AS ownership_rate,
    state_households.hh_count
FROM asset_rates
JOIN state_households
  ON state_households.state = asset_rates.state;

-- ── Non-food expenditure categories in long form ──────────────────────────────
-- Six major non-food spending categories per state, unpivoted to long form
-- so a single bar chart can compare categories nationally.
CREATE OR REPLACE VIEW vw_expenditure_long AS
WITH base AS (
    SELECT
        "State_label" AS state,
        ROUND(AVG(NULLIF(regexp_replace("edu expense_val_total",              '[^0-9.\-]+', '', 'g'), '')::NUMERIC)::NUMERIC, 2) AS avg_edu_expense,
        ROUND(AVG(NULLIF(regexp_replace("medical nonhospitalized_val_total",  '[^0-9.\-]+', '', 'g'), '')::NUMERIC)::NUMERIC, 2) AS avg_medical_expense,
        ROUND(AVG(NULLIF(regexp_replace("conveyance_val_total",               '[^0-9.\-]+', '', 'g'), '')::NUMERIC)::NUMERIC, 2) AS avg_conveyance,
        ROUND(AVG(NULLIF(regexp_replace("entertainment_val_total",            '[^0-9.\-]+', '', 'g'), '')::NUMERIC)::NUMERIC, 2) AS avg_entertainment,
        ROUND(AVG(NULLIF(regexp_replace("toilet articles_val_total",          '[^0-9.\-]+', '', 'g'), '')::NUMERIC)::NUMERIC, 2) AS avg_toilet_articles,
        ROUND(AVG(NULLIF(regexp_replace("clothing_val_total",                 '[^0-9.\-]+', '', 'g'), '')::NUMERIC)::NUMERIC, 2) AS avg_clothing
    FROM hh_master
    GROUP BY "State_label"
)
SELECT state, 'Education'       AS category, avg_edu_expense       AS avg_spend FROM base
UNION ALL
SELECT state, 'Medical',                     avg_medical_expense                FROM base
UNION ALL
SELECT state, 'Conveyance',                  avg_conveyance                     FROM base
UNION ALL
SELECT state, 'Entertainment',               avg_entertainment                  FROM base
UNION ALL
SELECT state, 'Toilet Articles',             avg_toilet_articles                FROM base
UNION ALL
SELECT state, 'Clothing',                    avg_clothing                       FROM base;

-- ── Rural Household Segmentation (Personas) ───────────────────────────────────
-- Categorizes households into four rural segments based on digital connectivity,
-- economic stability, human capital, and welfare dependence.
CREATE OR REPLACE VIEW vw_rural_segments AS
WITH hh_scored AS (
    SELECT
        "HHID" AS hhid,
        "State_label" AS state,
        state_to_iso("State_label") AS iso_code,
        COALESCE(NULLIF("District", ''), 'Unknown') AS district,
        COALESCE(NULLIF("Sector_label", ''), 'Unknown') AS sector,
        COALESCE(NULLIF("Social_Group_of_HH_Head_label", ''), 'Unknown') AS social_group,
        NULLIF(regexp_replace("hh_size", '[^0-9.\-]+', '', 'g'), '')::NUMERIC AS hh_size,
        NULLIF(regexp_replace("mean_years_edu", '[^0-9.\-]+', '', 'g'), '')::NUMERIC AS avg_edu_years,
        CASE WHEN COALESCE(NULLIF(TRIM("any_internet"), ''), '0') = '1' THEN 1 ELSE 0 END AS internet_access,
        CASE WHEN COALESCE(NULLIF(TRIM("Ayushman_beneficiary"), ''), '0') = '1' THEN 1 ELSE 0 END AS ayushman_beneficiary,
        CASE WHEN COALESCE(NULLIF(TRIM("Ration_Any_Item_Last_30_Days"), ''), '0') = '1' THEN 1 ELSE 0 END AS ration_received,
        CASE WHEN COALESCE(NULLIF(TRIM("Possess_Mobile"), ''), '0') = '1' THEN 1 ELSE 0 END AS mobile_ownership,
        CASE WHEN COALESCE(NULLIF(TRIM("Possess_Car"), ''), '0') = '1' THEN 1 ELSE 0 END AS car_ownership,
        CASE WHEN COALESCE(NULLIF(TRIM("Online_Groceries"), ''), '0') = '1' THEN 1 ELSE 0 END AS online_grocery,
        NULLIF(regexp_replace("cereal_val_total", '[^0-9.\-]+', '', 'g'), '')::NUMERIC AS cereal_spend,
        NULLIF(regexp_replace("beverages_val_total", '[^0-9.\-]+', '', 'g'), '')::NUMERIC AS beverages_spend,
        NULLIF(regexp_replace("n_children_u15", '[^0-9.\-]+', '', 'g'), '')::NUMERIC AS n_children_u15,
        -- Scoring logic for segmentation
        (CASE WHEN COALESCE(NULLIF(TRIM("any_internet"), ''), '0') = '1' THEN 2 ELSE 0 END +
         CASE WHEN COALESCE(NULLIF(TRIM("Possess_Mobile"), ''), '0') = '1' THEN 1 ELSE 0 END +
         CASE WHEN COALESCE(NULLIF(TRIM("Online_Groceries"), ''), '0') = '1' THEN 1 ELSE 0 END) AS digital_score,
        (CASE WHEN COALESCE(NULLIF(TRIM("Possess_Car"), ''), '0') = '1' THEN 2 ELSE 0 END +
         CASE WHEN COALESCE(NULLIF(TRIM("Possess_Mobile"), ''), '0') = '1' THEN 1 ELSE 0 END) AS asset_score,
        (CASE WHEN COALESCE(NULLIF(TRIM("Ayushman_beneficiary"), ''), '0') = '1' THEN 1 ELSE 0 END +
         CASE WHEN COALESCE(NULLIF(TRIM("Ration_Any_Item_Last_30_Days"), ''), '0') = '1' THEN 1 ELSE 0 END) AS welfare_score
    FROM hh_master
),
classified AS (
    SELECT *,
        CASE
            -- Rural Stable: High assets (car+mobile) + internet + some welfare
            WHEN asset_score >= 2 AND digital_score >= 2 AND internet_access = 1 THEN 'Rural Stable'
            -- Rural Aspirant: High digital + mobile ownership + moderate assets
            WHEN digital_score >= 3 AND mobile_ownership = 1 AND asset_score >= 1 THEN 'Rural Aspirant'
            -- Rural Disconnected: Low digital (no internet) + low online activity
            WHEN digital_score <= 1 AND internet_access = 0 THEN 'Rural Disconnected'
            -- Rural Constrained: Low assets + high welfare dependence
            WHEN asset_score <= 1 AND welfare_score >= 1 AND internet_access = 0 THEN 'Rural Constrained'
            ELSE 'Rural Constrained'  -- Default fallback
        END AS segment
    FROM hh_scored
)
SELECT * FROM classified;

-- ── Rural Segment Aggregated Summary ─────────────────────────────────────────
-- Aggregated metrics by state and rural segment for comparison dashboard
CREATE OR REPLACE VIEW vw_rural_segment_summary AS
SELECT
    state,
    state_to_iso(state) AS iso_code,
    segment,
    COUNT(hhid) AS hh_count,
    ROUND(COUNT(hhid) * 100.0 / SUM(COUNT(hhid)) OVER (PARTITION BY state), 1) AS segment_pct,
    ROUND(AVG(hh_size)::NUMERIC, 1) AS avg_hh_size,
    ROUND(AVG(avg_edu_years)::NUMERIC, 1) AS avg_edu_years,
    ROUND(AVG(internet_access)::NUMERIC * 100, 1) AS internet_pct,
    ROUND(AVG(mobile_ownership)::NUMERIC * 100, 1) AS mobile_ownership_pct,
    ROUND(AVG(car_ownership)::NUMERIC * 100, 1) AS car_ownership_pct,
    ROUND(AVG(online_grocery)::NUMERIC * 100, 1) AS online_grocery_pct,
    ROUND(AVG(ayushman_beneficiary)::NUMERIC * 100, 1) AS ayushman_pct,
    ROUND(AVG(ration_received)::NUMERIC * 100, 1) AS ration_pct,
    ROUND(AVG(cereal_spend)::NUMERIC, 0) AS avg_cereal_spend,
    ROUND(AVG(beverages_spend)::NUMERIC, 0) AS avg_beverages_spend,
    ROUND(AVG(digital_score)::NUMERIC, 1) AS avg_digital_score,
    ROUND(AVG(asset_score)::NUMERIC, 1) AS avg_asset_score
FROM vw_rural_segments
GROUP BY state, segment;

-- ── Rural Segment KPIs Long Form ──────────────────────────────────────────────
-- Long-form view for grouped bar charts comparing segments across KPIs by state
CREATE OR REPLACE VIEW vw_rural_segment_kpis_long AS
WITH segment_metrics AS (
    SELECT
        state,
        state_to_iso(state) AS iso_code,
        segment,
        ROUND(AVG(internet_access)::NUMERIC * 100, 1) AS internet_rate,
        ROUND(AVG(mobile_ownership)::NUMERIC * 100, 1) AS mobile_rate,
        ROUND(AVG(car_ownership)::NUMERIC * 100, 1) AS car_rate,
        ROUND(AVG(online_grocery)::NUMERIC * 100, 1) AS online_grocery_rate,
        ROUND(AVG(ayushman_beneficiary)::NUMERIC * 100, 1) AS ayushman_rate,
        ROUND(AVG(ration_received)::NUMERIC * 100, 1) AS ration_rate,
        ROUND(AVG(avg_edu_years)::NUMERIC, 1) AS avg_education,
        ROUND(AVG(CASE WHEN hh_size > 5 THEN 1 ELSE 0 END)::NUMERIC * 100, 1) AS large_hh_pct
    FROM vw_rural_segments
    GROUP BY state, segment
)
SELECT state, iso_code, segment, 'Internet Access' AS kpi, internet_rate AS value FROM segment_metrics
UNION ALL
SELECT state, iso_code, segment, 'Mobile Ownership', mobile_rate FROM segment_metrics
UNION ALL
SELECT state, iso_code, segment, 'Car Ownership', car_rate FROM segment_metrics
UNION ALL
SELECT state, iso_code, segment, 'Online Grocery', online_grocery_rate FROM segment_metrics
UNION ALL
SELECT state, iso_code, segment, 'Ayushman Coverage', ayushman_rate FROM segment_metrics
UNION ALL
SELECT state, iso_code, segment, 'Ration Card Use', ration_rate FROM segment_metrics
UNION ALL
SELECT state, iso_code, segment, 'Avg Education Years', avg_education FROM segment_metrics
UNION ALL
SELECT state, iso_code, segment, 'Large Households (>5)', large_hh_pct FROM segment_metrics;

-- ── Rural Segment Matrix (Wide Format) ────────────────────────────────────────
-- Pivoted view for grid-style dashboard layout.
-- Each row is a segment with all KPIs as columns for matrix display.
CREATE OR REPLACE VIEW vw_rural_segment_matrix AS
WITH state_max AS (
    -- Compute max values per state for percentage scaling
    SELECT
        state,
        MAX(cereal_spend) AS max_cereal_spend,
        MAX(avg_edu_years) AS max_edu_years
    FROM vw_rural_segments
    GROUP BY state
)
SELECT
    rs.state,
    state_to_iso(rs.state) AS iso_code,
    rs.segment,
    COUNT(rs.hhid) AS hh_count,
    ROUND(COUNT(rs.hhid) * 100.0 / SUM(COUNT(rs.hhid)) OVER (PARTITION BY rs.state), 1) AS size_pct,
    -- Economic Condition
    ROUND(AVG(rs.cereal_spend)::NUMERIC, 0) AS cereal_spend,
    ROUND(AVG(rs.cereal_spend) / NULLIF(sm.max_cereal_spend, 0) * 100, 1) AS cereal_spend_pct,
    ROUND(AVG(rs.beverages_spend)::NUMERIC, 0) AS beverages_spend,
    -- MCPE: Monthly Consumption Proxy Expenditure (cereal + beverages as proxy for total food spend)
    ROUND((AVG(rs.cereal_spend) + COALESCE(AVG(rs.beverages_spend), 0))::NUMERIC, 0) AS mcpe_inr,
    -- Digital Connectivity
    ROUND(AVG(rs.internet_access)::NUMERIC * 100, 1) AS internet_pct,
    ROUND(AVG(rs.mobile_ownership)::NUMERIC * 100, 1) AS mobile_pct,
    ROUND(AVG(rs.mobile_ownership)::NUMERIC * 100, 1) AS high_online_pct,
    ROUND(AVG(rs.online_grocery)::NUMERIC * 100, 1) AS online_grocery_pct,
    -- Human Capital
    ROUND(AVG(rs.avg_edu_years)::NUMERIC, 1) AS avg_edu_years,
    ROUND(AVG(rs.avg_edu_years) / NULLIF(sm.max_edu_years, 0) * 100, 1) AS edu_pct,
    ROUND(AVG(CASE WHEN rs.hh_size > 6 THEN 1 ELSE 0 END)::NUMERIC * 100, 1) AS large_hh_pct,
    -- UHS minors >3: households with more than 3 children under 15
    ROUND(AVG(CASE WHEN COALESCE(rs.n_children_u15, 0) > 3 THEN 1 ELSE 0 END)::NUMERIC * 100, 1) AS uhs_minor_pct,
    -- Welfare & Vulnerability
    ROUND(AVG(rs.ayushman_beneficiary)::NUMERIC * 100, 1) AS ayushman_pct,
    ROUND(AVG(rs.ration_received)::NUMERIC * 100, 1) AS ration_pct,
    -- Asset Ownership
    ROUND(AVG(rs.car_ownership)::NUMERIC * 100, 1) AS car_pct,
    -- No digital connectivity (inverse of internet)
    ROUND((1 - AVG(rs.internet_access))::NUMERIC * 100, 1) AS no_digital_pct,
    -- SC/ST composition (placeholder - replace with actual social_group calc)
    ROUND(AVG(CASE WHEN rs.social_group IN ('SC', 'ST') THEN 1 ELSE 0 END)::NUMERIC * 100, 1) AS scst_pct,
    -- PMGKY placeholder (using ration as proxy)
    ROUND(AVG(rs.ration_received)::NUMERIC * 100, 1) AS pmgky_pct,
    -- Segment class for CSS styling
    LOWER(REPLACE(rs.segment, ' ', '-')) AS segment_class,
    -- Segment ordering for display
    CASE rs.segment
        WHEN 'Rural Stable' THEN 1
        WHEN 'Rural Aspirant' THEN 2
        WHEN 'Rural Disconnected' THEN 3
        WHEN 'Rural Constrained' THEN 4
        ELSE 5
    END AS segment_order
FROM vw_rural_segments rs
JOIN state_max sm ON rs.state = sm.state
GROUP BY rs.state, rs.segment, sm.max_cereal_spend, sm.max_edu_years;
