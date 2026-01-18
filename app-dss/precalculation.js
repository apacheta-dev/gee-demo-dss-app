/* ******* GLOBAL layers **************/
var imgSOC = ee.Image("users/projectgeffao/GSOCmap150"),
    imgLPD = ee.Image("projects/gef-fao/assets/World/LPD_2001_2023_World_MK_MTID3_Des025"),// alternative
    imgMountains = ee.Image("users/projectgeffao/World/k1classes"),
    imgHansen = ee.Image("UMD/hansen/global_forest_change_2021_v1_9"),
    imgNPP = ee.Image("users/projectgeffao/World/NPP_2022_World"),
    ftcPA = ee.FeatureCollection("WCMC/WDPA/current/polygons");


/* ******** NDVI ********/
var imgNDVIAnnual = ee.Image("users/wocatapps/World/NDVI_AnnualMean_2001_2020_World");

/* ******* SDG layers **************/
/* Selected SDG product for this implementation: TRENDS.EARTH */

// Water masks -- Water may be added to differenciate NoData (land and water)
var lcESA = ee.Image("users/geflanddegradation/toolbox_datasets/lcov_esacc_1992_2022");

var water_2015 = lcESA.select('y2015').eq(210);
var water_2019 = lcESA.select('y2019').eq(210);
var water_2023 = lcESA.select('y2022').eq(210);

var sdgBaselineTE = ee.Image("projects/fao-unccd/assets/TrendsEarth/01_SDG_Indicator_15_3_1_for_baseline_2000_2015")
    .remap([-1, 0, 1], [1, 2, 3])
    .unmask()
    .where(water_2015.eq(1), 4);

var sdgRep1TE = ee.Image("projects/fao-unccd/assets/TrendsEarth/09_SDG_Indicator_15_3_1_status_in_2019_compared_2000_2015_baseline")
    .remap([1, 2, 3, 4, 5, 6, 7], [1, 1, 1, 2, 3, 3, 3])
    .unmask()
    .where(water_2019.eq(1), 4);

var sdgRep2TE = ee.Image("projects/fao-unccd/assets/TrendsEarth/14_SDG_Indicator_15_3_1_status_in_2023_compared_2000_2015_baseline")
    .remap([1, 2, 3, 4, 5, 6, 7], [1, 1, 1, 2, 3, 3, 3])
    .unmask()
    .where(water_2023.eq(1), 4);

var pa1OAO_2019_TE = ee.Image("projects/fao-unccd/assets/TrendsEarth/05_SDG_Indicator_15_3_1_2004_2019")
    .remap([-1, 0, 1], [1, 2, 3])
    .unmask()
    .where(water_2023.eq(1), 4);

var pa1OAO_2023_TE = ee.Image("projects/fao-unccd/assets/TrendsEarth/10_SDG_Indicator_15_3_1_2008_2023")
    .remap([-1, 0, 1], [1, 2, 3])
    .unmask()
    .where(water_2023.eq(1), 4);

/* Uncomment to visualize sdg layers
var degradation_style = { max: 4, min: 0, opacity: 1, palette: ['black', '#f23c46', '#a9afae', '#267300', 'blue'], }; // includes no data and water
Map.addLayer(pa1OAO_2019_TE, degradation_style, 'pa1OAO_2019_TE', false);
Map.addLayer(pa1OAO_2023_TE, degradation_style, 'pa1OAO_2023_TE', false);
Map.addLayer(sdgBaselineTE, degradation_style, 'sdgBaselineTE', false);
Map.addLayer(sdgRep1TE, degradation_style, 'sdgRep1TE', false);
Map.addLayer(sdgRep2TE, degradation_style, 'sdgRep2TE', false);*/

var sdgSource = {
    name: 'Trends.Earth',
    scale: 250,
    periods: {
        lblSAO2015: { //'Status as of 2015 (Baseline-1OAO)'
            imgMap: sdgBaselineTE,
            suffix: 'SAO_2015_TE'
        },
        lblSAO2019: { // 'Status as of 2019'
            imgMap: sdgRep1TE,
            suffix: 'SAO_2019_TE'
        },
        lblSAO2023: { // 'Status as of 2023'
            imgMap: sdgRep2TE,
            suffix: 'SAO_2023_TE'
        },
        lblPA1: { // 'Period Assesment 2016-2019 (1OAO)'
            imgMap: pa1OAO_2019_TE,
            suffix: 'PA_2016_2019_TE'
        },
        lblPA2: { // 'Period Assesment 2016-2023 (1OAO)'
            imgMap: pa1OAO_2023_TE,
            suffix: 'PA_2016_2023_TE'
        }
    },
};

/* ******* LC layers **************/
// Land Cover, Transitions and Degradation Layers styles 
var lcUNCCDCatVis = {
    vis: {
        min: 1, max: 7, opacity: 1,
        palette: ['#377e3f', '#c19511', '#fcdb00', '#18eebe', '#d7191c', '#cfdad2', '#4458eb',],
    },
    labels: [
        'lblTreeCovered',
        'lblGrassland',
        'lblCropland',
        'lblWetland',
        'lblArtificial',
        'lblOtherLand',
        'lblWaterbody',
    ]
};

var lcTransUNCCDCatVis = {
    vis: {
        min: 0, max: 7, opacity: 1,
        palette: ['#FEFFE5'].concat(lcUNCCDCatVis.vis.palette.slice(0)),
    },
    labels: ['lblNoChange'].concat(lcUNCCDCatVis.labels.slice(0)),
};

var lcDegCatVis = {
    vis: {
        min: 1, max: 3, opacity: 1,
        palette: ['#AB2727', '#e5e5c9', '#45A146'],
    },
    labels: [
        'lblDegradation',
        'lblStable',
        'lblImprovement',
    ]
};


/* Selected LC product for transitions */
/*var lcTrSource =
{
    initials: 'ESA',
    name: 'lblLCESA', //'Land Cover - ESA (Default)',
    imgLcAll: ee.Image("users/apacheta/SIDS_LCT/HTI/ESA_LC_all_2000_2022_UNCCD_Cat_HTI"),
    years: ['2000', '2015', '2019', '2022'],
    periods: [[2000, 2015], [2015, 2019], [2015, 2022], [2000, 2022]],
    imgLcTransitions: ee.Image("users/apacheta/SIDS_LCT/HTI/ESA_LC_Transitions_UNCCD_Cat_HTI"),
    scale: 300,
    categories: [1, 2, 3, 4, 5, 6, 7],

    lcStyle: lcUNCCDCatVis,
    lcTransitionsStyle: lcTransUNCCDCatVis,
    lcDegradationStyle: lcDegCatVis,
};*/

var lcTrSource =
{
    initials: 'GLA',
    name: 'lblLCGLAD', 
    imgLcAll: ee.Image("projects/apacheta-pislm/assets/UNCCD2026_HTI/LC/GLAD_LC_all_2000_2020_UNCCD_Cat_HTI"),
    years: ['2000', '2015', '2020'],
    periods: [[2000, 2015], [2015, 2020], [2000, 2020]],
    imgLcTransitions: ee.Image("projects/apacheta-pislm/assets/UNCCD2026_HTI/LC/GLAD_LC_Transitions_UNCCD_Cat_HTI"),
    scale: 30,
    categories: [1, 2, 3, 4, 5, 6, 7],

    lcStyle: lcUNCCDCatVis,
    lcTransitionsStyle: lcTransUNCCDCatVis,
    lcDegradationStyle: lcDegCatVis,
};


/* ****** Select a LC that will be used as current LC in ap */
var lcESRIStyle = {
    vis: {
        min: 1, max: 9, opacity: 1,
        palette: ["#1A5BAB", "#358221", "#87D19E", "#FFDB5C", "#ED022A", "#EDE9E4", "#F2FAFF", "#C8C8C8", "#C6AD8D"],
    },
    labels: [
        'lblWater',
        'lblTrees',
        'lblFloodedVegetation',
        'lblCrops',
        'lblBuiltArea',
        'lblBareGround',
        'lblSnowIce',
        'lblClouds',
        'lblRangelands',
    ]
};

//https://gee-community-catalog.org/projects/S2TSLULC/#class-definitions
var imcLCESRI = ee.ImageCollection("projects/sat-io/open-datasets/landcover/ESRI_Global-LULC_10m_TS");
var imgLCESRI = ee.ImageCollection(imcLCESRI.filterDate('2023-01-01', '2023-12-31').mosaic()).map(
    function remapper(image) {
        var remapped = image.remap([1, 2, 4, 5, 7, 8, 9, 10, 11], [1, 2, 3, 4, 5, 6, 7, 8, 9]);
        return remapped;
    });

var lcSource = {
    initials: 'ESRI',
    name: 'lblESRI',
    img: imgLCESRI.mosaic(),
    year: 2023,
    scale: 10,
    categories: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    style: lcESRIStyle,

    imgLCxLPD: imgLCESRI.mosaic().multiply(10).add(imgLPD.unmask()),
    scaleLCxLPD: 30
};

/* ******** World Protected Areas ********/
var imgPABin = ee.Image("users/projectgeffao/World/PAs_WDPA_image_Bin_30m_World");
var imgPACat = imgPABin.eq([0, 1])
    .rename(['pa_bin_0', 'pa_bin_1'])
    .multiply(ee.Image.pixelArea()).divide(10000);

/* ******** World key Biodiversity Areas ********/
var imgKBABin = ee.Image('users/projectgeffao/World/KBA_image_Bin_30m_World');
var imgKBABinCat = imgKBABin.eq([0, 1])
    .rename(['kba_bin_0', 'kba_bin_1'])
    .multiply(ee.Image.pixelArea()).divide(10000);

/* ******** World key Biodiversity Areas which are also Protected Areas ********/
var imgProtectedKBACat = imgKBABin.mask(imgPABin.eq(0)).selfMask().addBands(imgKBABin.mask(imgPABin.eq(1)).selfMask())
    .rename(['kba_noPA', 'kba_PA'])
    .multiply(ee.Image.pixelArea()).divide(10000);

/* ******** Forest Loss - Hansen ********/
var yearsHansen = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
var namesHansen = yearsHansen.map(function (y) { return 'hansen_' + (2000 + y); });
var imgHansenLoss = imgHansen.select('lossyear').unmask();
var imgHansenLossCat = imgHansenLoss.eq(yearsHansen)
    .rename(namesHansen)
    .multiply(ee.Image.pixelArea()).divide(10000);


/* ******** Mountain Yes/No ********/
var imgMountainBin = imgMountains.gte(1).unmask();
var imgMountainBinCat = imgMountainBin.eq([0, 1])
    .rename(['mountain_bin_0', 'mountain_bin_1'])
    .multiply(ee.Image.pixelArea()).divide(10000);

/* ******** LPD 5 cat + 0 ********/
var namesLPD = ['lpd_0', 'lpd_1', 'lpd_2', 'lpd_3', 'lpd_4', 'lpd_5',];
var imgLPDCat = imgLPD.unmask().eq([0, 1, 2, 3, 4, 5])
    .rename(namesLPD)
    .multiply(ee.Image.pixelArea()).divide(10000);

/* ******** Current LC ********/
var colsBaseLC = lcSource.categories.map(function (lc) {
    return 'lc_' + lc;
});
lcSource.colsBaseLC = colsBaseLC;

var imgLCCat = lcSource.img.eq(lcSource.categories)
    .rename(colsBaseLC)
    .multiply(ee.Image.pixelArea()).divide(10000);


/* ******** Combined LCxLPD: LC BASe 1-? X LPD 0-5 ********/
var LCxLPDStrings = [];
var LCxLPDNumbers = [];
lcSource.categories.forEach(function (lc) {
    [0, 1, 2, 3, 4, 5].forEach(function (lpd) {
        LCxLPDNumbers.push(parseInt('' + lc + lpd));
        LCxLPDStrings.push(lc + '_' + lpd);
    })
});
lcSource.LCxLPDStrings = LCxLPDStrings;

var imgLCxLPDCat = lcSource.imgLCxLPD.eq(LCxLPDNumbers)
    .rename(LCxLPDStrings)
    .multiply(ee.Image.pixelArea()).divide(10000);

/* ******** SOC ********/
var renamedSOC = imgSOC.eq(0).rename('cero').addBands(imgSOC.rename('soc'));


/* ******** SOC Stock in t/ha ********/
var socMask = imgSOC.unmask().gte(0)
var socArea = socMask.multiply(ee.Image.pixelArea()).divide(10000);
var socStock = imgSOC.eq(0).rename('cero').addBands(imgSOC.multiply(socArea).rename('soc_sum'))

/* ******** NPP Stock in kg*C/m^2 ********/
var nppStock = imgNPP.eq(0).rename('cero')
    .addBands(imgNPP.multiply(ee.Image.pixelArea()).rename('npp_sum'));

/* ******** CONFIGURE IMAGES TO PROCESS ********/
var reducersList = [
    { name: 'p_lpd', image: imgLPDCat, reducer: ee.Reducer.sum(), scale: 250, },
    { name: 'p_lc', image: imgLCCat, reducer: ee.Reducer.sum(), scale: lcSource.scale, },
    { name: 'p_x2', image: imgLCxLPDCat, reducer: ee.Reducer.sum(), scale: lcSource.scaleLCxLPD, },
    { name: 'p_soc_sum', image: socStock, reducer: ee.Reducer.sum(), scale: 1000, },
    { name: 'p_soc_min', image: renamedSOC.rename(['cero', 'soc_min']), reducer: ee.Reducer.min(), scale: 1000, },
    { name: 'p_soc_max', image: renamedSOC.rename(['cero', 'soc_max']), reducer: ee.Reducer.max(), scale: 1000, },
    { name: 'p_soc_mean', image: renamedSOC.rename(['cero', 'soc_mean']), reducer: ee.Reducer.mean(), scale: 1000, },
    { name: 'p_pa_bin', image: imgPACat, reducer: ee.Reducer.sum(), scale: 30, },
    { name: 'p_kba_bin', image: imgKBABinCat, reducer: ee.Reducer.sum(), scale: 30, },
    { name: 'p_mountain_bin', image: imgMountainBinCat, reducer: ee.Reducer.sum(), scale: 250, },
    { name: 'p_hansen', image: imgHansenLossCat, reducer: ee.Reducer.sum(), scale: 30, },
    { name: 'p_ndvi_annual', image: imgNDVIAnnual, reducer: ee.Reducer.mean(), scale: 250, },
    { name: 'p_npp_sum', image: nppStock, reducer: ee.Reducer.sum(), scale: 500, },
    { name: 'p_kba_pa', image: imgProtectedKBACat, reducer: ee.Reducer.sum(), scale: 30, },

];

/* *** Add selected SDG product statistics ***/
var sdgPeriods = Object.keys(sdgSource.periods);

sdgPeriods.forEach(function (periodKey) {
    var source = sdgSource.periods[periodKey];
    var colNamesSDGPeriod = [];
    [0, 1, 2, 3, 4].forEach(function (catNumber) {
        colNamesSDGPeriod.push('sdg_' + catNumber + '_' + source.suffix);
    });

    var imgRenamedSDG = source.imgMap.unmask().eq([0, 1, 2, 3, 4]).rename(colNamesSDGPeriod);
    var imgArea = imgRenamedSDG.multiply(ee.Image.pixelArea()).divide(1e6)//to km2 .divide(10000); ha
    reducersList.push({
        name: 'p_sdg_' + source.suffix,
        image: imgArea,
        reducer: ee.Reducer.sum(),
        scale: sdgSource.scale
    });

    source.colNames = colNamesSDGPeriod;

});



/* *** Add reducer for lc area for each year  ***/
lcTrSource.years.forEach(function (year) {

    var colNamesLCYear = [];
    lcTrSource.categories.forEach(function (catNumber) {
        colNamesLCYear.push('lc_' + catNumber + '_' + year + '_' + lcTrSource.initials);
    });

    var imgRenamedLC = lcTrSource.imgLcAll.select('y' + year).eq(lcTrSource.categories).rename(colNamesLCYear);
    var imgAreaLC = imgRenamedLC.multiply(ee.Image.pixelArea()).divide(10000);

    reducersList.push({
        name: 'p_lc_' + year + '_' + lcTrSource.initials,
        image: imgAreaLC,
        reducer: ee.Reducer.sum(),
        scale: lcTrSource.scale
    });
});



/* *** Add reducers for lc transitions and degradation por each period and product ***/
lcTrSource.periods.forEach(function (period) {

    var initialYear = period[0];
    var finalYear = period[1];

    // LC transition
    var lcChangeBand = 'lc_change_' + initialYear + '_' + finalYear; // name of the band: lc_change_1990_2018
    var colBaseName = 'lc_trans_' + lcTrSource.initials + '_' + initialYear + '_' + finalYear; // name of the column: lc_trans_ESA_1990_2018

    var colNames = [];
    var catValues = [];
    var n = lcTrSource.categories.length;
    lcTrSource.categories.forEach(function (initialCat) {
        lcTrSource.categories.forEach(function (finalCat) {
            catValues.push(initialCat * (n < 10 ? 10 : 100) + finalCat);
            colNames.push(colBaseName + '_' + initialCat + '_' + finalCat); // lc_trans_ESA_1990_2020_1_1
        });
    });


    var imgRenamedLCChange = lcTrSource.imgLcTransitions.select(lcChangeBand).eq(catValues).rename(colNames);
    var imgAreaLCChange = imgRenamedLCChange.multiply(ee.Image.pixelArea()).divide(10000);
    reducersList.push({
        name: 'p_lc_trans_' + lcTrSource.initials + '_' + initialYear + '_' + finalYear,
        image: imgAreaLCChange,
        reducer: ee.Reducer.sum(),
        scale: lcTrSource.scale
    });

    //  Degradation
    var lcDegradationBand = 'lc_degradation_' + initialYear + '_' + finalYear; // name of the band: lc_degradation_1990_2018
    var colDegBaseName = 'lc_deg_' + lcTrSource.initials + '_' + initialYear + '_' + finalYear; // base name of the column: lc_deg_COR_1990_2018
    var colDegNames = [];


    var catValuesDeg = [1, 2, 3];
    catValuesDeg.forEach(function (n) {
        colDegNames.push(colDegBaseName + '_' + n); // final names for the columns: lc_deg_ESA_1990_2020_1 / 2 / 3
    });

    var imgRenamedLCDegradation = lcTrSource.imgLcTransitions.select(lcDegradationBand).eq(catValuesDeg).rename(colDegNames);
    var imgAreaLCDegradation = imgRenamedLCDegradation.multiply(ee.Image.pixelArea()).divide(10000);
    reducersList.push({
        name: 'p_lc_degradation_' + lcTrSource.initials + '_' + initialYear + '_' + finalYear,
        image: imgAreaLCDegradation,
        reducer: ee.Reducer.sum(),
        scale: lcTrSource.scale
    });

});

/* *** Add to process soc x lpd, column names will be soc_mean_lpd_x -> soc_mean_lpd_1 ***/
for (var i = 1; i <= 5; i++) {
    reducersList.push({
        name: 'p_soc_lpd',
        image: renamedSOC.mask(imgLPD.eq(i)).rename(['cero', 'soc_mean_lpd_' + i]),
        reducer: ee.Reducer.mean(),
        scale: 250,
    });
}

/* *** Add to process soc x lc, column names will be soc_mean_lc_x -> soc_mean_lc_3 ***/
lcSource.categories.forEach(function (lc) {
    reducersList.push({
        name: 'p_soc_lc',
        image: renamedSOC.mask(lcSource.img.eq(lc)).rename(['cero', 'soc_mean_lc_' + lc]),
        reducer: ee.Reducer.mean(),
        scale: lcSource.scale,
    });

});

/* *** Add to process soc x lc x lpd, column names will be soc_mean_lc_x_lpd_y -> soc_mean_lc_3_lpd_1 ***/
lcSource.categories.forEach(function (lc) {
    [1, 2, 3, 4, 5].forEach(function (lpd) {
        reducersList.push({
            name: 'p_soc_lc_lpd',
            image: renamedSOC.mask(lcSource.img.eq(lc).mask(imgLPD.eq(lpd)))
                .rename(['cero', 'soc_mean_lc_' + lc + '_lpd_' + lpd]),
            reducer: ee.Reducer.mean(),
            scale: lcSource.scale,
        });

    });

});

// Uncomment to print reducers list
/*var l = [];
reducersList.forEach(function (r) {
    l.push(r.name);
})
print(l);*/

var precalculate = function (ftc, bestEffort, processNames) {

    // Check which reducers to calculate
    var reducersSelected = [];
    if (processNames === undefined || processNames.length === 0) {
        reducersSelected = reducersList; // all
    }
    else {
        for (var i = 0; i < reducersList.length; i++) {
            if (processNames.indexOf(reducersList[i].name) >= 0) {
                reducersSelected.push(reducersList[i]);
            }
        }
    }

    var ftcProcessed = ftc.map(function (f) {
        f = f.set(
            'area_ha', f
                .geometry()
                .area({ 'maxError': 1 })
                .divide(10000)
        );
        // Add reducers calculation to feature
        var image;
        for (var j = 0; j < reducersSelected.length; j++) {
            image = reducersSelected[j].image.clip(f.geometry());
            var c = image.reduceRegion({
                reducer: reducersSelected[j].reducer,
                geometry: f.geometry().bounds(),
                scale: reducersSelected[j].scale,
                bestEffort: bestEffort,
                maxPixels: 1e13
            });
            f = f.set(c);
        }
        return f;
    });
    
    return ftcProcessed;
};


// Uncomment to test 
/*
var sidsLevel1 = ee.FeatureCollection("projects/apacheta/assets/SIDS/SIDS_GAUL_ADM1");
var ftc1 = sidsLevel1.filter(ee.Filter.eq('ADM0_NAME', 'Haiti'));
var ftc1 = sidsLevel1.filter(ee.Filter.eq('ADM1_CODE', 1412));
//print(ftc1.first())

var test = precalculate(ftc1);

//print(test)
*/

exports = {
    precalculate: precalculate,

    sdgSource: sdgSource,
    lcTrSource: lcTrSource,
    lcSource: lcSource,

    yearsHansen: yearsHansen,
   
    imgSOC: imgSOC,
    imgLPD: imgLPD,
    imgMountains: imgMountains,
    imgNPP: imgNPP,
    imgPABin: imgPABin,
    imgKBABin: imgKBABin,
};

