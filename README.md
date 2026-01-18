# Land Degradation Neutrality Decision Support System (DSS) – DEMO for Haiti

This repository contains the source code for a **Google Earth Engine (GEE) App** designed to support **integrated analysis and decision-making for Land Degradation Neutrality (LDN)**. The application provides a **multi-layer, multi-criteria decision support environment** combining several datasets and indicators related to land degradation and sustainable land management.

---

## 🔗 Live Demo

A deployed example of the application is available here:

👉 https://apacheta.projects.earthengine.app/view/dss-hti

The demo illustrates an integrated Land Degradation Neutrality Decision Support System for Haiti.
<img width="1826" height="927" alt="image" src="https://github.com/user-attachments/assets/2be0619f-9584-4cb8-8df5-6f444f69a447" />

---

## 📌 About

This project provides a **Google Earth Engine application** to support **planning, prioritization and monitoring of actions towards Land Degradation Neutrality**.

The DSS integrates data from:

- Land Cover change analysis  
- Land Productivity Dynamics  
- Soil Organic Carbon  
- SDG 15.3.1 layers  
- Ancillary global and national datasets  
- Multi-criteria hotspot analysis  

---

## 📁 App Folder: `app-dss`

The `app-dss` folder contains **all scripts required for the GEE application to function**.  
The app is responsible for visualization, interaction, and summarization of **integrated LDN indicators and decision-support outputs**.

### `app.js`
- Main entry point of the application.
- Initializes the full DSS interface, map panels, and analytical sections.
- This is the script executed in the GEE Code Editor to run the app or to publish it.

### `legends.js`
- Defines reusable legends and symbology for all DSS layers.

### `localization.js`
- Stores all user interface labels.
- Supports multiple languages.
- Facilitates adaptation to national contexts without modifying the app logic.

### `precalculation.js`
- Defines the **DSS analytical configuration**.
- Specifies:
  - Land Cover, LPD and SOC products  
  - SDG 15.3.1 layers 
  - Protected Areas, Key Biodiversity Areas, Forest Loss, NDVI layers
- Controls how statistics are computed and combined.

### `precalculation_sample.js`
- Intended as a starting point for adapting the DSS to new countries and generating all required statistics.

---

## 📁 Analytical Sections in the DSS

The application is organized into several thematic sections:

- **General Global Layers**
  - Access to auxiliary datasets (elevation, climate, hydrology, etc.).

- **Land Degradation Neutrality (LDN) Layers**
  - Thematic layers relevant to LDN planning and monitoring.

- **SDG 15.3.1 Layers**
  - Visualization of the reported layers for the required periods.
    
- **Land Cover Transitions**
  - Visualization of land cover gains, loss, and degradation for the selected product.

- **Land Cover Transitions**
  - Visualization of land cover gains, loss, and degradation for the selected product.

- **Multi-Criteria Hotspot Analysis**
  - Combination of multiple indicators to identify priority intervention areas.

- **Drawing Tool**
  - To obtain statistics on the fly for a custom area.
    
Each section is linked to dedicated statistical summaries available in the right-hand panel.

---

## 🌍 How to Adapt This App for a New Country

1. Open the **Google Earth Engine Code Editor**:  
   https://code.earthengine.google.com
2. Copy the contents of the `app-dss` folder into your GEE repository and update script file paths accordingly.
3. Update country-specific terminology and labels in `localization.js`.
4. Prepare or import the required input datasets (LC, LPD, SOC and ancillary layers).
5. Adapt `precalculation.js` to configure the indicators, aggregation logic and hotspot criteria.
6. Replace the FeatureCollections in `precalculation_sample.js`, run the script, and export the resulting assets.
7. Update the precalculated collections referenced in `app.js`, then run the script to launch the DSS.
8. Publish the app (optional).


