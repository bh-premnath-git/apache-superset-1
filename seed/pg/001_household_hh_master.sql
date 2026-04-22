CREATE SCHEMA IF NOT EXISTS household;

CREATE TABLE IF NOT EXISTS household.hh_master (
    "Survey_Name" varchar(50) NULL,
    "Year" int4 NULL,
    "FSU_Serial_No" int4 NULL,
    "Sector" int4 NULL,
    "State" int4 NULL,
    "NSS_Region" int4 NULL,
    "District" int4 NULL,
    "Stratum" int4 NULL,
    "Sub_stratum" int4 NULL,
    "Panel" int4 NULL,
    "Sub_sample" int4 NULL,
    "FOD_Sub_Region" int4 NULL,
    "Sample_SU_No" int4 NULL,
    "Sample_Sub_Division_No" varchar(50) NULL,
    "Second_Stage_Stratum_No" int4 NULL,
    "Sample_Household_No" int4 NULL,
    "Questionnaire_No" varchar(50) NULL,
    "Level" int4 NULL,
    "Survey_Code" int4 NULL,
    "Reason_for_Substitution_Code" varchar(50) NULL,
    "Multiplier" float4 NULL,
    "Sector_label" varchar(100) NULL,
    "State_label" varchar(100) NULL,
    "Survey_Code_label" varchar(100) NULL,
    "Reason_for_Substitution_Code_label" varchar(100) NULL,
    "HHID" varchar(50) NULL,
    wt float4 NULL,
    wt_norm float4 NULL,
    hh_size int4 NULL,
    n_children_u5 int4 NULL,
    n_children_u15 int4 NULL,
    n_elderly int4 NULL,
    any_child int4 NULL,
    any_elderly int4 NULL,
    prop_female float4 NULL,
    any_female int4 NULL,
    head_age int4 NULL,
    head_gender varchar(50) NULL,
    head_marital varchar(50) NULL,
    head_edu_level varchar(64) NULL,
    head_years_edu int4 NULL,
    head_internet30 varchar(50) NULL,
    mean_years_edu float4 NULL,
    max_years_edu int4 NULL,
    any_edu int4 NULL,
    any_secondary int4 NULL,
    any_higher int4 NULL,
    any_internet int4 NULL,
    prop_internet_users float4 NULL,
    mean_meals_per_day float4 NULL,
    any_meal_from_school int4 NULL,
    any_meal_from_employer int4 NULL,
    any_paid_meals int4 NULL,
    any_live_away int4 NULL,
    any_migration_work int4 NULL,
    "HH_Size_FDQ" int4 NULL,
    "Engaged_in_Economic_Activity_Las" int4 NULL,
    "NCO_2015_Code" varchar(50) NULL,
    "NIC_2008_Code" varchar(50) NULL,
    "Max_Income_Activity" varchar(50) NULL,
    "Self_Employment_Source_Sector" varchar(50) NULL,
    "Regular_Wage_Source_Sector" varchar(50) NULL,
    "Casual_Labour_Source_Sector" varchar(50) NULL,
    "Household_Type" int4 NULL,
    "Religion_of_HH_Head" int4 NULL,
    "Social_Group_of_HH_Head" int4 NULL,
    "Land_Ownership" int4 NULL,
    "Type_of_Land_Owned" int4 NULL,
    "Total_Area_Land_Owned_Acres" float4 NULL,
    "Dwelling_Unit_Exists" int4 NULL,
    "Type_of_Dwelling_Unit" varchar(50) NULL,
    "Energy_Source_Cooking" int4 NULL,
    "Energy_Source_Lighting" int4 NULL,
    "Ration_Card_Type" int4 NULL,
    "Rent_Rate_Available_Rural" int4 NULL,
    "Benefitted_From_PMGKY" int4 NULL,
    "Engaged_in_Economic_Activity_Las_label" varchar(100) NULL,
    "Max_Income_Activity_label" varchar(100) NULL,
    "Self_Employment_Source_Sector_label" varchar(100) NULL,
    "Regular_Wage_Source_Sector_label" varchar(100) NULL,
    "Casual_Labour_Source_Sector_label" varchar(100) NULL,
    "Religion_of_HH_Head_label" varchar(100) NULL,
    "Social_Group_of_HH_Head_label" varchar(100) NULL,
    "Land_Ownership_label" varchar(100) NULL,
    "Type_of_Land_Owned_label" varchar(100) NULL,
    "Dwelling_Unit_Exists_label" varchar(100) NULL,
    "Type_of_Dwelling_Unit_label" varchar(100) NULL,
    "Energy_Source_Cooking_label" varchar(100) NULL,
    "Energy_Source_Lighting_label" varchar(100) NULL,
    "Ration_Card_Type_label" varchar(100) NULL,
    "Rent_Rate_Available_Rural_label" varchar(100) NULL,
    "Benefitted_From_PMGKY_label" varchar(100) NULL,
    "Ration_Any_Item_Last_30_Days" int4 NULL,
    "Ration_Rice" varchar(50) NULL,
    "Ration_Wheat" varchar(50) NULL,
    "Ration_Coarse_Grain" varchar(50) NULL,
    "Ration_Sugar" varchar(50) NULL,
    "Ration_Pulses" varchar(50) NULL,
    "Ration_Edible_Oil" varchar(50) NULL,
    "Ration_Other_Food_Items" varchar(50) NULL,
    "Online_Groceries" varchar(50) NULL,
    "Online_Milk" varchar(50) NULL,
    "Online_Vegetables" varchar(50) NULL,
    "Online_Fresh_Fruits" varchar(50) NULL,
    "Online_Dry_Fruits" varchar(50) NULL,
    "Online_Egg_Fish_Meat" varchar(50) NULL,
    "Online_Served_Processed_Food" varchar(50) NULL,
    "Online_Packed_Processed_Food" varchar(50) NULL,
    "Online_Other_Food_Items" varchar(50) NULL,
    "Ceremony_Performed_Last_30_Days" int4 NULL,
    "Meals_Served_to_Non_HH_Members" int4 NULL,
    "Ration_Any_Item_Last_30_Days_label" varchar(100) NULL,
    "Ceremony_Performed_Last_30_Days_label" varchar(100) NULL,
    beverages_qty_total float4 NULL,
    cereal_qty_total float4 NULL,
    dairy_qty_total float4 NULL,
    "edible oil_qty_total" float4 NULL,
    pulses_qty_total float4 NULL,
    spices_qty_total float4 NULL,
    suger_salt_qty_total float4 NULL,
    vegetables_qty_total float4 NULL,
    egg_fish_meat_qty_total float4 NULL,
    "fresh fruits_qty_total" float4 NULL,
    "dry fruits_qty_total" float4 NULL,
    "cereal substitute_qty_total" float4 NULL,
    beverages_val_total float4 NULL,
    cereal_val_total float4 NULL,
    dairy_val_total float4 NULL,
    "edible oil_val_total" float4 NULL,
    pulses_val_total float4 NULL,
    spices_val_total float4 NULL,
    suger_salt_val_total float4 NULL,
    vegetables_val_total float4 NULL,
    egg_fish_meat_val_total float4 NULL,
    "fresh fruits_val_total" float4 NULL,
    "dry fruits_val_total" float4 NULL,
    "cereal substitute_val_total" float4 NULL,
    beverages_qty_out float4 NULL,
    cereal_qty_out float4 NULL,
    dairy_qty_out float4 NULL,
    "edible oil_qty_out" float4 NULL,
    pulses_qty_out float4 NULL,
    spices_qty_out float4 NULL,
    suger_salt_qty_out float4 NULL,
    vegetables_qty_out float4 NULL,
    egg_fish_meat_qty_out float4 NULL,
    "fresh fruits_qty_out" float4 NULL,
    "dry fruits_qty_out" float4 NULL,
    "cereal substitute_qty_out" float4 NULL,
    beverages_val_out float4 NULL,
    cereal_val_out float4 NULL,
    dairy_val_out float4 NULL,
    "edible oil_val_out" float4 NULL,
    pulses_val_out float4 NULL,
    spices_val_out float4 NULL,
    suger_salt_val_out float4 NULL,
    vegetables_val_out float4 NULL,
    egg_fish_meat_val_out float4 NULL,
    "fresh fruits_val_out" float4 NULL,
    "dry fruits_val_out" float4 NULL,
    "cereal substitute_val_out" float4 NULL,
    "packaged processed food_val_total" varchar(50) NULL,
    "served processed food_val_total" varchar(50) NULL,
    "Kerosene_ration_card" int4 NULL,
    "LPG_subsidy_received" int4 NULL,
    "LPG_subsidized_cylinders" varchar(50) NULL,
    "Free_electricity" int4 NULL,
    "Any_member_attended_school" int4 NULL,
    "Num_govt_school_attended" varchar(50) NULL,
    "Num_private_school_attended" varchar(50) NULL,
    "Free_textbooks_received" varchar(50) NULL,
    "Total_textbooks" varchar(50) NULL,
    "Free_stationery_received" varchar(50) NULL,
    "Total_stationery" varchar(50) NULL,
    "Free_school_bag_received" varchar(50) NULL,
    "Total_school_bags" varchar(50) NULL,
    "Free_other_items_received" varchar(50) NULL,
    "Total_other_items" varchar(50) NULL,
    "Fee_waiver_received" varchar(50) NULL,
    "Num_fee_waiver_received" varchar(50) NULL,
    "Ayushman_beneficiary" int4 NULL,
    "Num_ayushman_beneficiaries" varchar(50) NULL,
    "Hospitalization_case" int4 NULL,
    "Medical_benefit_received" varchar(50) NULL,
    "Num_medical_beneficiaries" varchar(50) NULL,
    "Medical_benefit_amount" varchar(50) NULL,
    "Online_purchase_fuel_light" varchar(50) NULL,
    "Online_purchase_toilet_articles" varchar(50) NULL,
    "Online_purchase_education" varchar(50) NULL,
    "Online_purchase_medicine" varchar(50) NULL,
    "Online_purchase_services" varchar(50) NULL,
    "Kerosene_ration_card_label" varchar(100) NULL,
    "LPG_subsidy_received_label" varchar(100) NULL,
    "Free_electricity_label" varchar(100) NULL,
    "Any_member_attended_school_label" varchar(100) NULL,
    "Fee_waiver_received_label" varchar(100) NULL,
    "Hospitalization_case_label" varchar(100) NULL,
    "Medical_benefit_received_label" varchar(100) NULL,
    electricity_val_total float4 NULL,
    firewood_val_total float4 NULL,
    "other fuel_val_total" float4 NULL,
    "subtotal fuel and light_val_total" float4 NULL,
    "LPG_val_total" float4 NULL,
    kerosene_other_val_total float4 NULL,
    "kerosene_PDS_val_total" float4 NULL,
    conveyance_val_total float4 NULL,
    "edu expense_val_total" float4 NULL,
    "house_garage rent_val_total" float4 NULL,
    "medical nonhospitalized_val_total" float4 NULL,
    "other HH consumables_val_total" float4 NULL,
    "other consumer services_val_total" float4 NULL,
    "toilet articles_val_total" float4 NULL,
    "medical hospitalized_val_total" float4 NULL,
    entertainment_val_total float4 NULL,
    "other consumer taxes_cesses_val_total" float4 NULL,
    "subtotal rent_val_total" float4 NULL,
    internet_val_total float4 NULL,
    taxi_val_total float4 NULL,
    airfare_val_total float4 NULL,
    tobacco_val_total varchar(50) NULL,
    intoxicants_val_total varchar(50) NULL,
    pan_val_total varchar(50) NULL,
    "questionnaire_No_1" varchar(50) NULL,
    "Online_Clothing" varchar(50) NULL,
    "Online_Footwear" varchar(50) NULL,
    "Online_Furniture" varchar(50) NULL,
    "Online_Mobile" varchar(50) NULL,
    "Online_PersonalGoods" varchar(50) NULL,
    "Online_RecreationGoods" varchar(50) NULL,
    "Online_HouseholdAppliances" varchar(50) NULL,
    "Online_Crockery" varchar(50) NULL,
    "Online_SportsGoods" varchar(50) NULL,
    "Online_MedicalEquipment" varchar(50) NULL,
    "Online_Bedding" varchar(50) NULL,
    "Free_Laptop" varchar(50) NULL,
    "Num_Free_Laptop" varchar(50) NULL,
    "Free_Tablet" varchar(50) NULL,
    "Num_Free_Tablet" varchar(50) NULL,
    "Free_Mobile" varchar(50) NULL,
    "Num_Free_Mobile" varchar(50) NULL,
    "Free_Bicycle" varchar(50) NULL,
    "Num_Free_Bicycle" varchar(50) NULL,
    "Free_Scooter" varchar(50) NULL,
    "Num_Free_Scooter" varchar(50) NULL,
    "Free_Clothing" varchar(50) NULL,
    "Num_Free_Clothing" varchar(50) NULL,
    "Free_Footwear" varchar(50) NULL,
    "Num_Free_Footwear" varchar(50) NULL,
    "Free_Other" varchar(50) NULL,
    "Num_Free_Other" varchar(50) NULL,
    "Possess_Television" varchar(50) NULL,
    "Possess_Radio" varchar(50) NULL,
    "Possess_Laptop" varchar(50) NULL,
    "Possess_Mobile" varchar(10) NULL,
    "Possess_Bicycle" varchar(50) NULL,
    "Possess_Scooter" varchar(50) NULL,
    "Possess_Car" varchar(50) NULL,
    "Possess_Truck" varchar(50) NULL,
    "Possess_AnimalCart" varchar(50) NULL,
    "Possess_Refrigerator" varchar(50) NULL,
    "Possess_WashingMachine" varchar(50) NULL,
    "Possess_AirCooler" varchar(50) NULL,
    "TV_Facility_Type" varchar(50) NULL,
    "TV_Facility_Type_label" varchar(100) NULL,
    clothing_val_total float4 NULL,
    footwear_val_total float4 NULL,
    bedding_val_total float4 NULL,
    "HH appliances_val_total" float4 NULL,
    building_land_durable_val_total float4 NULL,
    crockery_utensil_val_total float4 NULL,
    furniture_fixture_val_total float4 NULL,
    jewelry_ornaments_val_total float4 NULL,
    "personal good_val_total" float4 NULL,
    "transport equipment_val_total" float4 NULL,
    recreation_val_total float4 NULL,
    "medical equipment_val_total" float4 NULL
);

TRUNCATE TABLE household.hh_master;

COPY household.hh_master
FROM '/docker-entrypoint-initdb.d/HH.master.csv'
DELIMITER ','
CSV HEADER
NULL 'NA';

-- ── Map State_label → GeoJSON NAME_1 for Country Map visualization ──
-- The Superset Country Map plugin (india.geojson) uses specific state names
-- that differ from the NSS survey labels. This column provides exact matches.
ALTER TABLE household.hh_master ADD COLUMN IF NOT EXISTS state_map_name varchar(100);

UPDATE household.hh_master SET state_map_name = CASE "State_label"
    WHEN 'A and N Islands (U.T.)'                    THEN 'Andaman and Nicobar'
    WHEN 'Chandigarh(U.T.)'                          THEN 'Chandigarh'
    WHEN 'Chattisgarh'                               THEN 'Chhattisgarh'
    WHEN 'Dadra & Nagar Haveli and Daman & Diu'      THEN 'Dadra and Nagar Haveli and Daman and Diu'
    WHEN 'Jammu & Kashmir'                           THEN 'Jammu and Kashmir'
    WHEN 'Ladakh (U.T.)'                             THEN 'Ladakh'
    WHEN 'Lakshadweep (U.T.)'                        THEN 'Lakshadweep'
    WHEN 'Puducherry (U.T.)'                         THEN 'Puducherry'
    WHEN 'Tamilnadu'                                 THEN 'Tamil Nadu'
    WHEN 'Uttar Prdesh'                              THEN 'Uttar Pradesh'
    WHEN 'Uttrakhand'                                THEN 'Uttarakhand'
    ELSE "State_label"
END;

-- ── ISO 3166-2:IN code for Country Map region matching ──
-- The legacy-plugin-chart-country-map renders per-region fills by matching
-- the entity column against each GeoJSON feature's `ISO` property (see
-- superset/superset-frontend/plugins/legacy-plugin-chart-country-map/src/
-- CountryMap.ts: `colorMap[d.properties.ISO]`). For india.geojson the `ISO`
-- values are ISO 3166-2:IN codes like IN-BR, IN-MP, IN-JH — NOT the state
-- names in NAME_1. Without this column, every feature fell back to `'none'`
-- fill and the chart rendered only the state outlines.
ALTER TABLE household.hh_master ADD COLUMN IF NOT EXISTS state_iso_code varchar(10);

UPDATE household.hh_master SET state_iso_code = CASE "State_label"
    WHEN 'A and N Islands (U.T.)'                    THEN 'IN-AN'
    WHEN 'Andhra Pradesh'                            THEN 'IN-AP'
    WHEN 'Arunachal Pradesh'                         THEN 'IN-AR'
    WHEN 'Assam'                                     THEN 'IN-AS'
    WHEN 'Bihar'                                     THEN 'IN-BR'
    WHEN 'Chandigarh(U.T.)'                          THEN 'IN-CH'
    WHEN 'Chattisgarh'                               THEN 'IN-CT'
    WHEN 'Dadra & Nagar Haveli and Daman & Diu'      THEN 'IN-DH'
    WHEN 'Delhi'                                     THEN 'IN-DL'
    WHEN 'Goa'                                       THEN 'IN-GA'
    WHEN 'Gujarat'                                   THEN 'IN-GJ'
    WHEN 'Haryana'                                   THEN 'IN-HR'
    WHEN 'Himachal Pradesh'                          THEN 'IN-HP'
    WHEN 'Jammu & Kashmir'                           THEN 'IN-JK'
    WHEN 'Jharkhand'                                 THEN 'IN-JH'
    WHEN 'Karnataka'                                 THEN 'IN-KA'
    WHEN 'Kerala'                                    THEN 'IN-KL'
    WHEN 'Ladakh (U.T.)'                             THEN 'IN-LA'
    WHEN 'Lakshadweep (U.T.)'                        THEN 'IN-LD'
    WHEN 'Madhya Pradesh'                            THEN 'IN-MP'
    WHEN 'Maharashtra'                               THEN 'IN-MH'
    WHEN 'Manipur'                                   THEN 'IN-MN'
    WHEN 'Meghalaya'                                 THEN 'IN-ML'
    WHEN 'Mizoram'                                   THEN 'IN-MZ'
    WHEN 'Nagaland'                                  THEN 'IN-NL'
    WHEN 'Odisha'                                    THEN 'IN-OR'
    WHEN 'Puducherry (U.T.)'                         THEN 'IN-PY'
    WHEN 'Punjab'                                    THEN 'IN-PB'
    WHEN 'Rajasthan'                                 THEN 'IN-RJ'
    WHEN 'Sikkim'                                    THEN 'IN-SK'
    WHEN 'Tamilnadu'                                 THEN 'IN-TN'
    WHEN 'Telangana'                                 THEN 'IN-TG'
    WHEN 'Tripura'                                   THEN 'IN-TR'
    WHEN 'Uttar Prdesh'                              THEN 'IN-UP'
    WHEN 'Uttrakhand'                                THEN 'IN-UT'
    WHEN 'West Bengal'                               THEN 'IN-WB'
    ELSE NULL
END;
