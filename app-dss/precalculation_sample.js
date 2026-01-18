// Import script with layers and reducers configuration
var mdlPrecalculation = require('users/apacheta/dss-demo:app-dss/precalculation.js');

var sidsLevel0 = ee.FeatureCollection("projects/apacheta/assets/SIDS/SIDS_GAUL_ADM0"),
    sidsLevel1 = ee.FeatureCollection("projects/apacheta/assets/SIDS/SIDS_GAUL_ADM1");

var version = 'v3';  // v2=add p_soc_lc p_soc_lc_lpd v3=calculate GLAD tr

// Modify countryName and iso3 variables accordingly. Alternatively replace ftc0 and ftc1 variables with custom feature collections for boundaries
var countryName = 'Haiti';  // name to filter FAO GAUL collection
var iso3 = 'HTI'; // ISO to use in files and folders names

var assetFolder = 'projects/apacheta-pislm/assets/UNCCD2026_HTI/DSS/';

/* v1 assets
var ftc0 = sidsLevel0.filter(ee.Filter.eq('ADM0_NAME', countryName));
var ftc1 = sidsLevel1.filter(ee.Filter.eq('ADM0_NAME', countryName));

var ftcBasins = ee.FeatureCollection("WWF/HydroSHEDS/v1/Basins/hybas_7");
var ftcBasinsCountry = ftcBasins.filterBounds(ftc0);
var ftcBasinsCountryIntersected = ftcBasinsCountry.map(function (f) {
    var f_intersect = f.intersection(ftc0.first());
    return f_intersect;
});
*/

// Precalculated assets as base for new calculations
var ftc0 = ee.FeatureCollection("projects/apacheta-pislm/assets/UNCCD2026_HTI/DSS/HTI_DSS_Precal_Level0_v2"),
    ftc1 = ee.FeatureCollection("projects/apacheta-pislm/assets/UNCCD2026_HTI/DSS/HTI_DSS_Precal_Level1_v2"),
    ftcBasinsCountryIntersected = ee.FeatureCollection("projects/apacheta-pislm/assets/UNCCD2026_HTI/DSS/HTI_DSS_Precal_Basins_Intersected_v2");

// Configuration of collections to run
var sample = [
    { name: 'Precal_Level0', asset: ftc0 },
    { name: 'Precal_Level1', asset: ftc1 },
    { name: 'Precal_Basins_Intersected', asset: ftcBasinsCountryIntersected },
];

var calculate = [
  "p_lc_2000_GLA",
  "p_lc_2015_GLA",
  "p_lc_2020_GLA",
  "p_lc_trans_GLA_2000_2015",
  "p_lc_degradation_GLA_2000_2015",
  "p_lc_trans_GLA_2015_2020",
  "p_lc_degradation_GLA_2015_2020",
  "p_lc_trans_GLA_2000_2020",
  "p_lc_degradation_GLA_2000_2020"];
  
// Calculation and assets exports
sample.forEach(function (s) {
    Export.table.toAsset({
        collection: mdlPrecalculation.precalculate(s.asset, false, calculate),
        description: iso3 + '_DSS_' + s.name + '_' + version,
        assetId: assetFolder + iso3 + '_DSS_' + s.name + '_' + version,
    });
});
