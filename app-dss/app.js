/** Modules */
var mdlLegends = require('users/apacheta/dss-demo:app-dss/legends.js');
var mdlPrecal = require('users/apacheta/dss-demo:app-dss/precalculation.js');
var mdlLoc = require('users/apacheta/dss-demo:app-dss/localization.js');

// Precalculated assets, created running precalculation-sample.js
var ftc0 = ee.FeatureCollection("projects/apacheta-pislm/assets/UNCCD2026_HTI/DSS/HTI_DSS_Precal_Level0_v3"),
    ftc1 = ee.FeatureCollection("projects/apacheta-pislm/assets/UNCCD2026_HTI/DSS/HTI_DSS_Precal_Level1_v3"),
    ftc2 = ee.FeatureCollection("projects/apacheta-pislm/assets/UNCCD2026_HTI/DSS/HTI_DSS_Precal_Level1_v3"), // level 2 functionality is commented
    ftcBasinsIntersected = ee.FeatureCollection("projects/apacheta-pislm/assets/UNCCD2026_HTI/DSS/HTI_DSS_Precal_Basins_Intersected_v3");

// General layers assets
var ftcPA = ee.FeatureCollection("WCMC/WDPA/current/polygons"),
    ftcKBA = ee.FeatureCollection("users/projectgeffao/World/KBAsGlobal_2021_March_01_POL_Fix"),
    ftcBasins = ee.FeatureCollection("WWF/HydroSHEDS/v1/Basins/hybas_7"),
    imgFireIndex = ee.Image("projects/gef-fao/assets/World/FireRecurrenceIndex_MCD_FIRMS_2001_2023_World"),
    imgPrecipitationTrend = ee.Image("projects/gef-fao/assets/World/PrecipTrendIndex_World_2010_2023"),
    imgTerrain = ee.Image("projects/apacheta-pislm/assets/UNCCD2026_HTI/DSS/Terrain_rgb3_Haiti");

// Filter global KBA and PA assets
ftcKBA = ftcKBA.filter(ee.Filter.eq('ISO3', 'HTI'));
ftcPA = ftcPA.filter(ee.Filter.eq('ISO3', 'HTI')).filterMetadata('DESIG_TYPE', 'equals', 'National');
ftcBasins = ftcBasins.filterBounds(ftc0);
imgFireIndex = imgFireIndex.updateMask(1).clip(ftc0);

// LDN areas // TODO for testing purposes use level 1 ftc
var ftcProjectAreas = ee.FeatureCollection("projects/apacheta-pislm/assets/UNCCD2026_HTI/DSS/HTI_DSS_Precal_Level1_v2"),
    ftcLandscapes = ee.FeatureCollection("projects/apacheta-pislm/assets/UNCCD2026_HTI/DSS/HTI_DSS_Precal_Level1_v2"),
    ftcDemoSites = ee.FeatureCollection("projects/apacheta-pislm/assets/UNCCD2026_HTI/DSS/HTI_DSS_Precal_Level1_v2");

// Clip to country assets from precalculation script
var imgMountains = mdlPrecal.imgMountains.clip(ftc0);
var imgLPD = mdlPrecal.imgLPD.unmask().clip(ftc0);
var imgSOC = mdlPrecal.imgSOC.unmask().clip(ftc0);
var imgNPP = mdlPrecal.imgNPP.clip(ftc0);
var imgKBABin = mdlPrecal.imgKBABin.clip(ftc0);
var imgPABin = mdlPrecal.imgPABin.clip(ftc0);
var imgCurrentLC = mdlPrecal.lcSource.img.clip(ftc0);

// NDVI by month and year
var startYear = 2001;
var endYear = 2024;
var imcModis = ee.ImageCollection('MODIS/061/MOD13Q1').filterDate(startYear + '-01-01', endYear + '-12-31');
var imcModisNDVI = imcModis.select('NDVI');
var lstYears = ee.List.sequence(startYear, endYear);
var lstMonths = ee.List.sequence(1, 12);

var imcNDVIByMonthYear = ee.ImageCollection.fromImages(
    lstYears.map(function (y) {
        return lstMonths.map(function (m) {
            return imcModisNDVI
                .filter(ee.Filter.calendarRange(y, y, 'year'))
                .filter(ee.Filter.calendarRange(m, m, 'month'))
                .mean()
                .set('system:time_start', ee.Date.fromYMD(y, m, 1));
        });
    }).flatten());


initApp(mdlLoc.languages[0]);

function initApp(lan) {

    /*******************************************************************************
    * 1-Model *
    ******************************************************************************/

    // JSON object for storing the data model.
    var m = {};
    m.labels = mdlLoc.getLocLabels(lan);
    m.evalSet = {};
    m.maxAreaHa = 100000;
    m.bestEffort = false;

    // Set labels for lc
    mdlPrecal.lcSource.style.names = mdlPrecal.lcSource.style.labels.map(function (lbl) { return m.labels[lbl] });

    // More info & contact
    m.info = {
        referenceDocUrl: '',
        contact1: { name: 'contact1@', email: 'contact1@' },
        contact2: { name: 'contact2@', email: 'contact2@' },
        contact3: { name: '', email: '' },
    };

    // Feature collections options to click on the map to obtain precalculated statistics
    m.assetsClick = {};
    m.assetsClick[m.labels.lblNone] = null;
    m.assetsClick[m.labels.lblLevel1] = ftc1;
    m.assetsClick[m.labels.lblBasins] = ftcBasinsIntersected;

    // Feature collection to query on map click
    m.ftcClickOn = null;

    // Layers Visualization
    m.lv = {
        lpd: {
            vis: {
                min: 0, max: 5, opacity: 1,
                palette: ['#ffffff', '#f23c46', '#e9a358', '#e5e6b3', '#a9afae', '#267300'],
            },
            names: [
                m.labels.lblNonVegetatedArea,
                m.labels.lblDeclining,
                m.labels.lblEarlySignDecline,
                m.labels.lblStableButStressed,
                m.labels.lblStable,
                m.labels.lblIncreasing,
            ]
        },
        mountains: {
            vis: {
                min: 1, max: 7, opacity: 1,
                palette: ['#c5fff8', '#95dbd3', '#92db9c', '#55c364', '#8b9c15', '#d99c22', '#9e7219'],
            },
            names: [
                m.labels.lblMountain1,
                m.labels.lblMountain2,
                m.labels.lblMountain3,
                m.labels.lblMountain4,
                m.labels.lblMountain5,
                m.labels.lblMountain6,
                m.labels.lblMountain7,
            ]
        },
        npp: {
            vis: { min: 0, max: 1, opacity: 1, palette: ['#d1442e', '#d17534', '#feb532', '#fef622', '#cee40d', '#b7cb0c', '#09db16', '#07a811', '#05800d'] },

        },
        sdg1531: {
            vis: {
                min: 0, max: 4, opacity: 1,
                palette: ['#000000', '#9b2779', '#ffffe0', '#006500', '#78a4e5'],
            },
            names: [
                m.labels.lblNoData,
                m.labels.lblSDGDegrading,
                m.labels.lblSDGStable,
                m.labels.lblSDGImproving,
                m.labels.lblWaterbody,
            ]
        },

        borderLevel1: { vis: { color: 'black', fillColor: '00000000' } },
        borderLevel2: { vis: { color: '#838888', fillColor: '00000000', width: 1 } },
        borderLevel3: { vis: { color: 'purple', fillColor: '00000000', width: 1 } },
        borderBasins: { vis: { color: 'blue', fillColor: '00000000', width: 1 } },
        borderProjectAreas: { vis: { color: 'darkgreen', fillColor: '00000000', width: 1 } },
        borderLandscapes: { vis: { color: '#ff9e0f', fillColor: '00000000', width: 1 } },
        borderDemoSites: { vis: { color: 'red', fillColor: '00000000', width: 1 } },
        highlight: { vis: { color: '#b040d6', fillColor: '00000000' } },
        soc: { vis: { min: 0, max: 100, palette: ['#fcffac', '#a60000'] } },
        custom: { vis: { max: 1, min: 1, opacity: 1, palette: ['#FF00FF'] } },
        terrain: { vis: { min: 0, max: 2000, palette: ['#05ff96', '006600', '002200', 'fff700', 'ab7634', '67471f', 'ffffff'] } },
        pa: { vis: { color: 'green', width: 1 } },
        kba: { vis: { color: 'orange' } },
        fireIndex: { vis: { opacity: 1, min: 0, max: 0.5, palette: ['#fcfdbf', '#fc8761', '#b63679', '#50127b', '#000004'] } },
        precipTrend: { vis: { min: -3, max: 3, opacity: 0.8, palette: ["#d63000", "#ffffff", "#062fd6"] } },
    };

    // Map layers configuration
    m.layersNames = [];

    /*******************************************************************************
    * 2-Components *
    ******************************************************************************/

    // JSON object for storing UI components.
    var c = {};
    // Root Container Panel 
    c.pnlRoot = ui.Panel({
        layout: ui.Panel.Layout.flow('horizontal'),
        style: { height: '100%', width: '100%', },
    });

    // Left panel
    c.lp = {};
    c.lp.pnlControl = ui.Panel({ style: { height: '100%', width: '30%' } });
    // Center panel
    c.cp = {};
    c.cp.pnlMap = ui.Panel({ style: { height: '100%', width: '70%' } });
    // Right panel
    c.rp = {};
    c.rp.pnlOutput = ui.Panel({ style: { height: '100%', width: '30%' } });

    // Split panel (Map & Output Panel)
    c.sppMapOutput = ui.SplitPanel(c.cp.pnlMap, c.rp.pnlOutput);

    // Left Panel -Contact section
    c.lp.info = {};
    c.lp.info.lblIntro = ui.Label(m.labels.lblTitle);
    c.lp.info.lblApp = ui.Label(m.labels.lblExpl1);
    c.lp.info.lblAppDev = ui.Label(m.labels.lblAppDeveloped);

    c.lp.info.lblEmail1 = ui.Label(m.info.contact1.name).setUrl('mailto:' + m.info.contact1.email);
    c.lp.info.lblEmail2 = ui.Label(m.info.contact2.name).setUrl('mailto:' + m.info.contact2.email);
    c.lp.info.lblEmail3 = ui.Label(m.info.contact3.name).setUrl('mailto:' + m.info.contact3.email);

    c.lp.info.btnClose = ui.Button({ label: m.labels.lblCloseInfoPanel });

    c.lp.info.pnlContainer = ui.Panel(
        [c.lp.info.lblApp,
        c.lp.info.lblAppDev,
        c.lp.info.lblEmail1,
        c.lp.info.lblEmail2,
        c.lp.info.lblEmail3,
        ]);


    // Left Panel - Language section
    c.lp.lan = {};
    c.lp.lan.selLanguage = ui.Select({
        items: ['English', 'Spanish'],
        value: lan
    });

    // Left Panel - Administrative boundaries section
    c.lp.levels = {};
    c.lp.levels.lblChoose = ui.Label(m.labels.lblExpl2 + ' (*)');
    c.lp.levels.selLevel1 = ui.Select({
        items: [],
        placeholder: m.labels.lblSelectLevel1,
    });
    c.lp.levels.selLevel2 = ui.Select({
        items: [],
        placeholder: m.labels.lblSelectLevel1First,
    });

    // Left Panel - Layer for boundaries selection
    c.lp.boundaries = {};
    c.lp.boundaries.lblChoose = ui.Label(m.labels.lblAssetClick + ' (*)');
    c.lp.boundaries.selBoundariesLayer = ui.Select({
        items: Object.keys(m.assetsClick),
        value: m.labels.lblNone
    });


    // Left Panel - General layers section    
    c.lp.lblExploreLayers = ui.Label(m.labels.lblExploreLayers);

    // AOI Mask
    c.lp.mask = {};
    c.lp.mask.entry =
    {
        asset: ee.Image(0),
        style: { palette: ['white'] },
        name: m.labels.lblAOIMask,
        visible: false,
        legend: null,
        group: 'RASTER',
        citation: ''
    };

    c.lp.mask.pnlMaskAOI = ui.Panel();
    c.lp.mask.pnlMaskAOI.add(configureLayerEntry(c.lp.mask.entry)); // Only one layer


    /* General Layers Section*/
    c.lp.gl = {};
    c.lp.gl.entries = [
        {
            asset: ftc1,
            style: m.lv.borderLevel1.vis,
            name: m.labels.lblLevel1,
            visible: false,
            legend: null,
            group: 'FEATURES',
            singleColor: 'SQUARE',
        },
        /*{ // TODO level2_functionality is commented
            asset: ftc2,
            style: m.lv.borderLevel2.vis,
            name: m.labels.lblLevel2,
            visible: false,
            legend: null,
            group: 'FEATURES',
            singleColor: 'SQUARE',
        },*/
        {
            asset: ftcBasins,
            style: m.lv.borderBasins.vis,
            name: m.labels.lblBasins,
            visible: false,
            legend: null,
            group: 'FEATURES',
            singleColor: 'SQUARE',
            citation: 'https://www.hydrosheds.org/'
        },
        {
            asset: ftcKBA,
            style: m.lv.kba.vis,
            name: m.labels.lblKeyBiodiversityAreas,
            visible: false,
            legend: null,
            group: 'FEATURES',
            singleColor: 'SQUARE',
            citation: 'https://www.keybiodiversityareas.org/'
        },
        {
            asset: ftcPA,
            style: m.lv.pa.vis,
            name: m.labels.lblProtectedAreas,
            visible: false,
            legend: null,
            group: 'FEATURES',
            singleColor: 'SQUARE',
            citation: 'https://www.protectedplanet.net/en'
        },
        {
            asset: imgTerrain,
            style: {},
            name: m.labels.lblTopography,
            visible: false,
            legend: mdlLegends.createColorRampLegendPanel(m.labels.lblElevation + ' (m)', m.lv.terrain.vis),
            group: 'RASTER',
            citation: ''
        },
        {
            asset: imgCurrentLC,
            style: mdlPrecal.lcSource.style.vis,
            name: m.labels.lblLandCover + ' (' + m.labels[mdlPrecal.lcSource.name] + ') ' +
                mdlPrecal.lcSource.year,
            visible: true,
            legend: mdlLegends.createDiscreteLegendPanel(m.labels.lblLandCover + ' (' + m.labels[mdlPrecal.lcSource.name] + ') ' + mdlPrecal.lcSource.year,
                mdlPrecal.lcSource.style.names,
                mdlPrecal.lcSource.style.vis.palette, false, false),
            group: 'RASTER',
            citation: ''
        },
        {
            asset: imgLPD,
            style: m.lv.lpd.vis,
            name: m.labels.lblLandProductivityDynamics,
            visible: false,
            legend: mdlLegends.createDiscreteLegendPanel(m.labels.lblLandProductivityDynamics, m.lv.lpd.names, m.lv.lpd.vis.palette, false, false),
            group: 'RASTER',
            citation: ''
        },
        {
            asset: imgSOC,
            style: m.lv.soc.vis,
            name: m.labels.lblSocMap,
            visible: false,
            legend: mdlLegends.createColorRampLegendPanel(m.labels.lblSOCTonnesHa, m.lv.soc.vis),
            group: 'RASTER',
            citation: 'https://data.apps.fao.org/glosis/?share=f-6756da2a-5c1d-4ac9-9b94-297d1f105e83&lang=en'
        },

        {
            asset: imgPrecipitationTrend,
            style: m.lv.precipTrend.vis,
            name: m.labels.lblPrecipitationTrend,
            visible: false,
            legend: mdlLegends.createColorRampLegendPanel(m.labels.lblPrecipitationTrend, m.lv.precipTrend.vis, m.labels.lblNegTrend, '', m.labels.lblPosTrend),
            group: 'RASTER',
            citation: ''
        },
        {
            asset: imgMountains,
            style: m.lv.mountains.vis,
            name: m.labels.lblMountains,
            visible: false,
            legend: mdlLegends.createDiscreteLegendPanel(m.labels.lblMountains, m.lv.mountains.names, m.lv.mountains.vis.palette, false, false),
            group: 'RASTER',
            citation: ''
        },
        {
            asset: imgNPP,
            style: m.lv.npp.vis,
            name: m.labels.lblNPP,
            visible: false,
            legend: mdlLegends.createColorRampLegendPanel(m.labels.lblNPPLegend, m.lv.npp.vis),
            group: 'RASTER',
            citation: ''
        },
        {
            asset: imgFireIndex,
            style: m.lv.fireIndex.vis,
            name: m.labels.lblFireIndex,
            visible: false,
            legend: mdlLegends.createColorRampLegendPanel(m.labels.lblFireIndex, m.lv.fireIndex.vis, '0.05', '0.25', '0.5'),
            group: 'RASTER',
            citation: ''
        },

    ];
    c.lp.gl.btnSection = ui.Button(m.labels.lblGeneralLayers);
    c.lp.gl.pnlLayers = ui.Panel();

    // Create a panel entry with a check, citation and opacity slider for each layer
    c.lp.gl.entries.forEach(function (layer) {
        c.lp.gl.pnlLayers.add(configureLayerEntry(layer));
    });
    c.lp.gl.pnlContainer = ui.Panel(c.lp.gl.pnlLayers);

    /* LC Transitions Layers Section*/
    c.lp.tr = {};
    c.lp.tr.btnSection = ui.Button(m.labels.lblTransitions + ' - ' + m.labels[mdlPrecal.lcTrSource.name]);
    c.lp.tr.pnlContainer = ui.Panel();
    var defaultPeriod = mdlPrecal.lcTrSource.periods[0];

    c.lp.tr.lblPeriods = ui.Label(m.labels.lblPeriods + ': ');
    var periodItems = mdlPrecal.lcTrSource.periods.map(function (p) {
        return p[0] + '-' + p[1];
    });
    c.lp.tr.selTransitionPeriods = ui.Select({
        items: periodItems,
        value: periodItems[0],
    });
    c.lp.tr.pnlFromYear = ui.Panel({
        layout: ui.Panel.Layout.flow('horizontal'),
        widgets: [c.lp.tr.lblPeriods, c.lp.tr.selTransitionPeriods]
    });

    c.lp.tr.pnlContainer.add(c.lp.tr.pnlFromYear);


    c.lp.tr.pnlLayers = ui.Panel();

    c.lp.tr.entries = [
        {
            asset: mdlPrecal.lcTrSource.imgLcAll.select('y' + defaultPeriod[0]).selfMask().clip(ftc0),
            style: mdlPrecal.lcTrSource.lcStyle.vis,
            layerId: m.labels.lblFromLC,
            name: m.labels.lblLandCover + ' ' + defaultPeriod[0],
            visible: false,
            group: 'RASTER',
            legend: mdlLegends.createDiscreteLegendPanel(m.labels.lblLandCover,
                mdlPrecal.lcTrSource.lcStyle.labels.map(function (lbl) { return m.labels[lbl] }),
                mdlPrecal.lcTrSource.lcStyle.vis.palette, false, false),
        },
        {
            asset: mdlPrecal.lcTrSource.imgLcAll.select('y' + defaultPeriod[1]).selfMask().clip(ftc0),
            style: mdlPrecal.lcTrSource.lcStyle.vis,
            layerId: m.labels.lblCurrentLC,
            name: m.labels.lblLandCover + ' ' + defaultPeriod[1],
            visible: false,
            group: 'RASTER',
            legend: mdlLegends.createDiscreteLegendPanel(m.labels.lblLandCover,
                mdlPrecal.lcTrSource.lcStyle.labels.map(function (lbl) { return m.labels[lbl] }),
                mdlPrecal.lcTrSource.lcStyle.vis.palette, false, false),
        },
        {
            asset: mdlPrecal.lcTrSource.imgLcTransitions.select('lc_gain_' + defaultPeriod[0] + '_' + defaultPeriod[1]).selfMask().clip(ftc0),
            style: mdlPrecal.lcTrSource.lcTransitionsStyle.vis,
            layerId: m.labels.lblGains,
            name: m.labels.lblGains + ' ' + defaultPeriod[0] + '-' + defaultPeriod[1],
            visible: false,
            group: 'RASTER',
            legend: mdlLegends.createDiscreteLegendPanel(m.labels.lblGains,
                mdlPrecal.lcTrSource.lcTransitionsStyle.labels.map(function (lbl) { return m.labels[lbl] }),
                mdlPrecal.lcTrSource.lcTransitionsStyle.vis.palette, false, false),
        },
        {
            asset: mdlPrecal.lcTrSource.imgLcTransitions.select('lc_loss_' + defaultPeriod[0] + '_' + defaultPeriod[1]).selfMask().clip(ftc0),
            style: mdlPrecal.lcTrSource.lcTransitionsStyle.vis,
            layerId: m.labels.lblLosses,
            name: m.labels.lblLosses + ' ' + defaultPeriod[0] + '-' + defaultPeriod[1],
            visible: false,
            group: 'RASTER',
            legend: mdlLegends.createDiscreteLegendPanel(m.labels.lblLosses,
                mdlPrecal.lcTrSource.lcTransitionsStyle.labels.map(function (lbl) { return m.labels[lbl] }),
                mdlPrecal.lcTrSource.lcTransitionsStyle.vis.palette, false, false),
        },
        {
            asset: mdlPrecal.lcTrSource.imgLcTransitions.select('lc_degradation_' + defaultPeriod[0] + '_' + defaultPeriod[1]).selfMask().clip(ftc0),
            style: mdlPrecal.lcTrSource.lcDegradationStyle.vis,
            layerId: m.labels.lblDegradation,
            name: m.labels.lblDegradation + ' ' + defaultPeriod[0] + '-' + defaultPeriod[1],
            visible: false,
            group: 'RASTER',
            legend: mdlLegends.createDiscreteLegendPanel(m.labels.lblDegradation,
                mdlPrecal.lcTrSource.lcDegradationStyle.labels.map(function (lbl) { return m.labels[lbl] }),
                mdlPrecal.lcTrSource.lcDegradationStyle.vis.palette, false, false),
        }];

    // Create a panel entry with a check, citation and opacity slider for each layer
    c.lp.tr.entries.forEach(function (layer) {
        c.lp.tr.pnlLayers.add(configureLayerEntry(layer));
    });
    c.lp.tr.pnlContainer.add(c.lp.tr.pnlLayers);

    // Left Panel - Multi-criteria analysis section   
    c.lp.mc = {};
    c.lp.mc.btnSection = ui.Button(m.labels.lblHotspots);
    c.lp.mc.catEntries = [
        {
            title: m.labels.lblLandCover + ' (' + m.labels[mdlPrecal.lcSource.name] + ') ' + mdlPrecal.lcSource.year,
            palette: mdlPrecal.lcSource.style.vis.palette,
            names: mdlPrecal.lcSource.style.names,
            image: imgCurrentLC,
            categories: mdlPrecal.lcSource.categories,
        },
        {
            title: m.labels.lblLandProductivityDynamics,
            palette: m.lv.lpd.vis.palette.slice(1),
            names: m.lv.lpd.names.slice(1),
            image: imgLPD,
            categories: [1, 2, 3, 4, 5],
        },
        {
            title: m.labels.lblMountains,
            palette: m.lv.mountains.vis.palette,
            names: m.lv.mountains.names,
            image: imgMountains.unmask(),
            categories: [1, 2, 3, 4, 5, 6, 7],
        },
        {
            title: m.labels.lblKeyBiodiversityAreas,
            palette: ['grey', 'orange'],
            names: [m.labels.lblNonKba, m.labels.lblKba],
            image: imgKBABin,
            categories: [0, 1],
        },
        {
            title: m.labels.lblProtectedAreas,
            palette: ['grey', 'green'],
            names: [m.labels.lblNonProtectedAreas, m.labels.lblProtectedAreas],
            image: imgPABin,
            categories: [0, 1],
        },

    ];
    c.lp.mc.pnlEntries = mdlLegends.createMultiCriteriaPanel(c.lp.mc.catEntries);
    c.lp.mc.lblDisplay = ui.Label(m.labels.lblStepDisplay);
    c.lp.mc.btnCalculate = ui.Button({ label: m.labels.lblDisplay, disabled: true });
    c.lp.mc.btnReset = ui.Button({ label: m.labels.lblReset, disabled: true });
    c.lp.mc.pnlButtons = ui.Panel({
        layout: ui.Panel.Layout.flow('horizontal'),
        widgets: [c.lp.mc.btnCalculate, c.lp.mc.btnReset]
    });


    // Multicriteria Layer Entry
    c.lp.mc.entry =
    {
        asset: ee.Image(0).selfMask(),
        style: m.lv.custom.vis,
        name: m.labels.lblHotspots,
        visible: false,
        legend: null,
        group: 'RASTER',
        singleColor: 'SQUARE',
        citation: ''
    };
    c.lp.mc.pnlLayers = ui.Panel();
    c.lp.mc.pnlLayers.add(configureLayerEntry(c.lp.mc.entry)); // Only one layer
    c.lp.mc.pnlContainer = ui.Panel({
        widgets: [
            c.lp.mc.pnlEntries,
            c.lp.mc.lblDisplay,
            c.lp.mc.pnlButtons,
            c.lp.mc.pnlLayers]
    });


    /* Function to create a layer entry check panel component with an opacity slider */
    function configureLayerEntry(layer) {
        var pnl = mdlLegends.createLayerEntry(layer);
        var stackName = layer.layerId !== undefined ? layer.layerId : layer.name;
        pnl.widgets().get(0).onChange(function (checked) {
            var list = c.cp.map.layers().getJsArray().filter(function (l) { return l.get('name') === stackName });

            list[0].setShown(checked);
            showFrontLayerLegend();
            if (stackName === m.labels.lblHotspots) {
                c.cp.pnlCombinedLegend.style().set({
                    shown: checked,
                });
            }
        });

        pnl.widgets().get(3).onSlide(function (v) {
            var list = c.cp.map.layers().getJsArray().filter(function (l) { return l.get('name') === stackName });
            list[0].setOpacity(v);
        });
        return pnl;
    }


    // Left Panel - LDN Implementation
    c.lp.ldn = {};
    c.lp.ldn.btnSection = ui.Button(m.labels.lblLDNImplementation);
    c.lp.ldn.pnlLayers = ui.Panel();

    /** LDN implementation entries */
    c.lp.ldn.entries = [{
        asset: ftcProjectAreas,
        style: m.lv.borderProjectAreas.vis,
        name: m.labels.lblProjectAreas,
        visible: false,
        legend: null,
        group: 'FEATURES',
        singleColor: 'SQUARE',
    },
    {
        asset: ftcLandscapes,
        style: m.lv.borderLandscapes.vis,
        name: m.labels.lblLandscapes,
        visible: false,
        legend: null,
        group: 'FEATURES',
        singleColor: 'SQUARE',
    },
    {
        asset: ftcDemoSites,
        style: m.lv.borderDemoSites.vis,
        name: m.labels.lblDemoSites,
        visible: false,
        legend: null,
        group: 'FEATURES',
        singleColor: 'SQUARE',
    }];

    c.lp.ldn.entries.forEach(function (layer) {
        c.lp.ldn.pnlLayers.add(configureLayerEntry(layer));
    });
    c.lp.ldn.pnlContainer = ui.Panel(c.lp.ldn.pnlLayers);


    /** SDG layers SDG 15.3.1 section */
    c.lp.sdg = {};
    c.lp.sdg.btnSection = ui.Button(m.labels.lblSDG1531Title);
    c.lp.sdg.pnlLayers = ui.Panel();
    c.lp.sdg.entries =
        [
            {
                asset: mdlPrecal.sdgSource.periods.lblSAO2015.imgMap.clip(ftc0),
                style: m.lv.sdg1531.vis,
                name: m.labels.lblSAO2015,
                visible: false,
                legend: mdlLegends.createDiscreteLegendPanel(m.labels.lblSAO2015, m.lv.sdg1531.names, m.lv.sdg1531.vis.palette, false, false),
                group: 'RASTER',
                citation: ''
            },
            {
                asset: mdlPrecal.sdgSource.periods.lblSAO2019.imgMap.clip(ftc0),
                style: m.lv.sdg1531.vis,
                name: m.labels.lblSAO2019,
                visible: false,
                legend: mdlLegends.createDiscreteLegendPanel(m.labels.lblSAO2019, m.lv.sdg1531.names, m.lv.sdg1531.vis.palette, false, false),
                group: 'RASTER',
                citation: ''
            },
            {
                asset: mdlPrecal.sdgSource.periods.lblSAO2023.imgMap.clip(ftc0),
                style: m.lv.sdg1531.vis,
                name: m.labels.lblSAO2023,
                visible: false,
                legend: mdlLegends.createDiscreteLegendPanel(m.labels.lblSAO2023, m.lv.sdg1531.names, m.lv.sdg1531.vis.palette, false, false),
                group: 'RASTER',
                citation: ''
            },
            {
                asset: mdlPrecal.sdgSource.periods.lblPA1.imgMap.clip(ftc0),
                style: m.lv.sdg1531.vis,
                name: m.labels.lblPA1,
                visible: false,
                legend: mdlLegends.createDiscreteLegendPanel(m.labels.lblPA1, m.lv.sdg1531.names, m.lv.sdg1531.vis.palette, false, false),
                group: 'RASTER',
                citation: ''
            },
            {
                asset: mdlPrecal.sdgSource.periods.lblPA2.imgMap.clip(ftc0),
                style: m.lv.sdg1531.vis,
                name: m.labels.lblPA2,
                visible: false,
                legend: mdlLegends.createDiscreteLegendPanel(m.labels.lblPA2, m.lv.sdg1531.names, m.lv.sdg1531.vis.palette, false, false),
                group: 'RASTER',
                citation: ''
            },
        ];

    c.lp.sdg.entries.forEach(function (layer) {
        c.lp.sdg.pnlLayers.add(configureLayerEntry(layer));
    });
    c.lp.sdg.pnlContainer = ui.Panel(c.lp.sdg.pnlLayers);

    // Left Panel - Drawing tool section
    c.lp.dt = {};
    c.lp.dt.btnSection = ui.Button(m.labels.lblDrawingTools + ' 📍');

    c.lp.dt.lblCustomLayer = ui.Label(m.labels.lblCustomLayer);
    c.lp.dt.txbLayerName = ui.Textbox(m.labels.lblLayerName, '');
    c.lp.dt.btnAddLayer = ui.Button('+');
    c.lp.dt.pnlFileName = ui.Panel({
        widgets: [c.lp.dt.txbLayerName, c.lp.dt.btnAddLayer],
        layout: ui.Panel.Layout.Flow('horizontal'),
    });
    c.lp.dt.lblDrawFeatures = ui.Label(m.labels.lblDrawFeatures);
    c.lp.dt.lblGetStatistics = ui.Label(m.labels.lblGetStatistics);
    c.lp.dt.btnZonalStats = ui.Button(m.labels.lblSelectAndCalculate);
    c.lp.dt.lblDownloadLinks = ui.Label(m.labels.lblDownloadLinks);
    c.lp.dt.lblLinks = ui.Label(m.labels.lblLinks);
    c.lp.dt.lblJson = ui.Label();
    c.lp.dt.lblKml = ui.Label();
    c.lp.dt.pnlLinks = ui.Panel({
        widgets: [c.lp.dt.lblLinks, c.lp.dt.lblJson, c.lp.dt.lblKml],
        layout: ui.Panel.Layout.Flow('horizontal'),
    });
    // Flyto panel
    c.lp.dt.flyTo = {};
    c.lp.dt.lblFlyTo = ui.Label(m.labels.lblFlyToText);
    c.lp.dt.txtLat = ui.Textbox(m.labels.lblLatitude, '');
    c.lp.dt.txtLon = ui.Textbox(m.labels.lblLongitude, '');
    c.lp.dt.btnFlyTo = ui.Button(m.labels.lblFlyTo);
    c.lp.dt.btnUserLocation = ui.Button(m.labels.lblUserLocation + '\u25BC');
    c.lp.dt.btnRemoveLocation = ui.Button(m.labels.lblRemoveLocation + ' \u2716');

    c.lp.dt.pnlFlyTo = ui.Panel({
        layout: ui.Panel.Layout.flow('vertical'),
        widgets: [ui.Panel({
            layout: ui.Panel.Layout.flow('horizontal'),
            widgets: [c.lp.dt.txtLat, c.lp.dt.txtLon, c.lp.dt.btnFlyTo]
        }),
        ui.Panel({
            layout: ui.Panel.Layout.flow('horizontal'),
            widgets: [c.lp.dt.btnUserLocation, c.lp.dt.btnRemoveLocation]
        })]
    });
    // Asset id
    c.lp.dt.customAsset = {};
    c.lp.dt.customAsset.lblEnterAssetId = ui.Label(m.labels.lblEnterAssetId);
    c.lp.dt.customAsset.txtAssetId = ui.Textbox(m.labels.lblAssetId, '');
    c.lp.dt.customAsset.btnLoadAsset = ui.Button(m.labels.lblLoadAsset);
    c.lp.dt.customAsset.pnlCustomAsset = ui.Panel({
        layout: ui.Panel.Layout.flow('horizontal'),
        widgets: [c.lp.dt.customAsset.txtAssetId, c.lp.dt.customAsset.btnLoadAsset]
    });

    c.lp.dt.pnlContainer = ui.Panel({
        widgets: [
            c.lp.dt.lblCustomLayer,
            c.lp.dt.pnlFileName,
            c.lp.dt.lblDrawFeatures,
            c.lp.dt.lblGetStatistics,
            c.lp.dt.btnZonalStats,
            c.lp.dt.lblDownloadLinks,
            c.lp.dt.pnlLinks,
            c.lp.dt.customAsset.lblEnterAssetId,
            c.lp.dt.customAsset.pnlCustomAsset,
            c.lp.dt.lblFlyTo,
            c.lp.dt.pnlFlyTo,
        ]
    });

    /**  */
    var handleCustomFeatureCollection = function (gmy, name, level) {

        var f = ee.Feature(gmy).set('area_ha', gmy.area({ 'maxError': 1 }).divide(10000));
        f = f.set('name', name);

        handleEvaluating(true);
        f.get('area_ha').evaluate(function (area, error) {
            if (error) {
                handleEvaluating(false);
                c.rp.lblMessages.setValue(m.labels.lblUnexpectedError + error);
                c.rp.pnlMessages.style().set({ shown: true });
                return;
            }
            if (area > m.maxAreaHa) {
                handleEvaluating(false);
                c.rp.lblMessages.setValue(m.labels.lblSmallerArea
                    + formatNumber(m.maxAreaHa, 2) + 'ha. '
                    + m.labels.lblSelectedAreaHa
                    + ' ' + formatNumber(area, 2) + 'ha.');
                c.rp.pnlMessages.style().set({ shown: true });
                //return;
            }
            //ftc0.geometry().intersects(gmy, 1).evaluate(function (intersection, error) {
            ftc0.geometry().contains(gmy, 1).evaluate(function (contained, error) {
                if (error) {
                    handleEvaluating(false);
                    c.rp.lblMessages.setValue(m.labels.lblUnexpectedError + error);
                    c.rp.pnlMessages.style().set({ shown: true });
                    return;
                }

                if (!contained) {
                    handleEvaluating(false);
                    c.rp.lblMessages.setValue(m.labels.lblGeometryNotContained);
                    //c.rp.lblMessages.setValue(m.labels.lblGeometryNoIntersection);
                    c.rp.pnlMessages.style().set({ shown: true });
                    return;
                }

                m.ftcAOI = ee.FeatureCollection(f);
                m.precalculated = false;
                m.haAOI = area;
                m.levelAoi = level;
                showInfoSelectedAOI();
            });
        });
    };

    c.lp.dt.customAsset.btnLoadAsset.onClick(function () {

        var assetId = c.lp.dt.customAsset.txtAssetId.getValue().trim();
        if (assetId === '') {
            c.rp.pnlMessages.style().set({ shown: true });
            c.rp.lblMessages.setValue(m.labels.lblInvalidAssetId);
            return;
        }
        try {
            var ftcCustom = ee.FeatureCollection(assetId);
            ftcCustom.size().getInfo(function (size) {
                if (size === undefined) {
                    c.rp.pnlMessages.style().set({ shown: true });
                    c.rp.lblMessages.setValue(m.labels.lblInvalidAssetId);
                }
                else {
                    /*if (size > 1) {
                        c.rp.pnlMessages.style().set({ shown: true });
                        c.rp.lblMessages.setValue(m.labels.lblMoreThanOneFeature);
                    }*/
                    handleCustomFeatureCollection(ftcCustom.first().geometry(), assetId, m.labels.lblCustomAsset);

                }
            });
        }
        catch (err) {
            c.rp.pnlMessages.style().set({ shown: true });
            c.rp.lblMessages.setValue(m.labels.lblInvalidAssetId + ': ' + err);
        }
    });

    // Left Panel - Disclaimer
    c.lp.lblDisclaimer = ui.Label('(*) ' + m.labels.lblDisclaimer);

    /* Center Panel   */
    c.cp.map = ui.Map();
    c.cp.pnlCombinedLegend = ui.Panel();
    c.cp.pnlFrontLayerLegend = ui.Panel();
    c.cp.drt = ui.Map.DrawingTools();
    c.cp.btnSelectContainer = ui.Button(m.labels.lblSelectContainer);

    /* Right Panel */
    // Messages Panel    
    c.rp.lblMessages = ui.Label('');
    c.rp.pnlMessages = ui.Panel({
        widgets: [c.rp.lblMessages]
    });

    // Stats Panel
    c.rp.stats = {};
    c.rp.stats.pnlStats = ui.Panel();
    c.rp.stats.lblStatsTitle = ui.Label(m.labels.lblSelectedAOI);
    c.rp.stats.lblHighlightBox = ui.Label();
    c.rp.stats.pnlSelectedArea = ui.Panel({
        widgets: [c.rp.stats.lblStatsTitle, c.rp.stats.lblHighlightBox],
        layout: ui.Panel.Layout.Flow("horizontal"),

    });
    c.rp.stats.pnlStats.add(c.rp.stats.pnlSelectedArea);

    c.rp.stats.labels = [
        'lblAreaName',
        'lblArea',
        'lblVegetatedArea',
        'lblDecliningProductivity',
        'lblIncreasingProductivity',
        'lblSocMean',
        'lblSocSum',
        'lblProtectedArea',
        'lblKeyBiodiversityArea',
        'lblMountainCoverage',
        'lblNPPTotal'
    ];

    c.rp.stats.ge = {};
    c.rp.stats.labels.forEach(function (label) {
        c.rp.stats.ge[label] = ui.Panel({
            layout: ui.Panel.Layout.flow('horizontal'),
            widgets: [ui.Label(m.labels[label] + ': '), ui.Label(m.labels.lblLoading)],
        });
        c.rp.stats.pnlStats.add(c.rp.stats.ge[label]);
    });

    c.rp.lblExploreCharts = ui.Label(m.labels.lblExploreCharts);

    // Charts panels
    c.rp.gl = {};
    c.rp.gl.btnSection = ui.Button(m.labels.lblGeneralCharts);
    c.rp.gl.pnlContainer = ui.Panel();
    c.rp.gl.btnSection.onClick(function () {
        c.rp.gl.pnlContainer.style().set({ shown: !c.rp.gl.pnlContainer.style().get('shown') });
    });

    c.rp.sdg = {};
    c.rp.sdg.btnSection = ui.Button(m.labels.lblSDG1531);
    c.rp.sdg.pnlContainer = ui.Panel();
    c.rp.sdg.btnSection.onClick(function () {
        c.rp.sdg.pnlContainer.style().set({ shown: !c.rp.sdg.pnlContainer.style().get('shown') });
    });

    c.rp.mc = {};
    c.rp.mc.btnSection = ui.Button(m.labels.lblHotspotsCharts);
    c.rp.mc.pnlContainer = ui.Panel();
    c.rp.mc.btnSection.onClick(function () {
        c.rp.mc.pnlContainer.style().set({ shown: !c.rp.mc.pnlContainer.style().get('shown') });
    });

    c.rp.tr = {};
    c.rp.tr.btnSection = ui.Button(m.labels.lblTransitions + ' - ' + m.labels[mdlPrecal.lcTrSource.name]);
    c.rp.tr.pnlContainer = ui.Panel();
    c.rp.tr.btnSection.onClick(function () {
        c.rp.tr.pnlContainer.style().set({ shown: !c.rp.tr.pnlContainer.style().get('shown') });
    });


    /*******************************************************************************
    * 3-Composition *   
    ******************************************************************************/

    ui.root.clear();
    ui.root.add(c.pnlRoot);

    c.pnlRoot.add(ui.SplitPanel(c.lp.pnlControl, ui.Panel(c.sppMapOutput)));

    /* Left Panel*/
    c.lp.pnlControl.add(c.lp.info.lblIntro);
    c.lp.pnlControl.add(c.lp.info.pnlContainer);
    c.lp.pnlControl.add(c.lp.info.btnClose);

    c.lp.pnlControl.add(c.lp.lan.selLanguage);

    c.lp.pnlControl.add(c.lp.levels.lblChoose);
    c.lp.pnlControl.add(c.lp.levels.selLevel1);
    //c.lp.pnlControl.add(c.lp.levels.selLevel2); // TODO level2_functionality is commented

    c.lp.pnlControl.add(c.lp.mask.pnlMaskAOI);

    c.lp.pnlControl.add(c.lp.boundaries.lblChoose);
    c.lp.pnlControl.add(c.lp.boundaries.selBoundariesLayer);

    c.lp.pnlControl.add(c.lp.lblExploreLayers);

    c.lp.pnlControl.add(c.lp.gl.btnSection);
    c.lp.pnlControl.add(c.lp.gl.pnlContainer);

    c.lp.pnlControl.add(c.lp.ldn.btnSection);
    c.lp.pnlControl.add(c.lp.ldn.pnlContainer);

    c.lp.pnlControl.add(c.lp.sdg.btnSection);
    c.lp.pnlControl.add(c.lp.sdg.pnlContainer);

    c.lp.pnlControl.add(c.lp.mc.btnSection);
    c.lp.pnlControl.add(c.lp.mc.pnlContainer);

    c.lp.pnlControl.add(c.lp.tr.btnSection);
    c.lp.pnlControl.add(c.lp.tr.pnlContainer);

    c.lp.pnlControl.add(c.lp.dt.btnSection);
    c.lp.pnlControl.add(c.lp.dt.pnlContainer);

    c.lp.pnlControl.add(c.lp.lblDisclaimer);

    /* Map panel */
    c.cp.pnlMap.add(c.cp.map);
    c.cp.map.add(c.cp.pnlFrontLayerLegend);
    c.cp.map.add(c.cp.drt);
    c.cp.map.add(c.cp.btnSelectContainer);

    /* Right Panel */
    c.rp.pnlOutput.add(c.rp.pnlMessages);
    c.rp.pnlOutput.add(c.rp.stats.pnlStats);

    c.rp.pnlOutput.add(c.rp.lblExploreCharts);

    c.rp.pnlOutput.add(c.rp.gl.btnSection);
    c.rp.pnlOutput.add(c.rp.gl.pnlContainer);

    c.rp.pnlOutput.add(c.rp.sdg.btnSection);
    c.rp.pnlOutput.add(c.rp.sdg.pnlContainer);

    c.rp.pnlOutput.add(c.rp.mc.btnSection);
    c.rp.pnlOutput.add(c.rp.mc.pnlContainer);

    c.rp.pnlOutput.add(c.rp.tr.btnSection);
    c.rp.pnlOutput.add(c.rp.tr.pnlContainer);


    /*******************************************************************************
    * 4-Styling *  
    ******************************************************************************/

    // JSON object for defining CSS-like class style properties.
    var s = {};

    s.style1 = { fontSize: '12px', margin: '2px 10px' };
    s.styleMessage = { color: 'gray', fontSize: '12px', padding: '2px 0px 2px 10px' };
    s.styleWarning = { color: 'blue', fontSize: '12px' };

    c.lp.info.lblIntro.style().set({ fontWeight: 'bold', fontSize: '20px', margin: '10px 5px', });
    c.lp.info.lblApp.style().set({ fontSize: '12px' });
    c.lp.info.lblAppDev.style().set(s.style1);
    c.lp.info.lblEmail1.style().set(s.style1);
    c.lp.info.lblEmail2.style().set(s.style1);
    c.lp.info.lblEmail3.style().set(s.style1);

    c.lp.info.pnlContainer.style().set({ margin: 0, padding: 0 });

    c.lp.lan.selLanguage.style().set({ width: '70%' });

    c.lp.dt.lblFlyTo.style().set(s.style1);
    c.lp.dt.txtLat.style().set({ width: '25%', margin: '5px 5px' });
    c.lp.dt.txtLon.style().set({ width: '25%', margin: '5px 5px' });
    c.lp.dt.btnFlyTo.style().set({ width: '30%', margin: '5px 5px' });

    c.lp.dt.btnUserLocation.style().set({ width: '40%', margin: '5px 5px' });
    c.lp.dt.btnRemoveLocation.style().set({ width: '40%', margin: '5px 5px' });

    c.lp.levels.lblChoose.style().set(s.style1);
    c.lp.levels.selLevel1.style().set({ width: "90%", });
    c.lp.levels.selLevel2.style().set({ width: "90%", });

    c.lp.tr.lblPeriods.style().set({ fontSize: '12px', margin: '10px 10px' });

    c.lp.lblExploreLayers.style().set(s.style1);
    c.rp.lblExploreCharts.style().set(s.style1);

    c.lp.boundaries.lblChoose.style().set(s.style1);
    c.lp.boundaries.selBoundariesLayer.style().set({ width: '70%' });

    s.sectionButton = { width: '90%', fontSize: '6px', fontWeight: 'normal' };
    s.sectionPanel = { margin: '5px 5px', shown: false, width: '90%' };
    s.paramPanel = { width: '90%', fontSize: '12px', margin: '0px', padding: '0px' };

    // Common styling left sections
    ['gl', 'ldn', 'sdg', 'mc', 'tr', 'dt'].forEach(function (section) {
        c.lp[section].btnSection.style().set(s.sectionButton);
        c.lp[section].pnlContainer.style().set(s.sectionPanel);
    });

    // Common styling rigth chart sections   
    ['gl', 'sdg', 'mc', 'tr'].forEach(function (section) {
        c.rp[section].btnSection.style().set(s.sectionButton);
        c.rp[section].pnlContainer.style().set(s.sectionPanel);

    });

    // General Layers Sections
    c.lp.gl.btnSection.style().set({ color: '#0000FF' });
    c.lp.gl.pnlContainer.style().set({ border: '3px solid #0000FF', shown: true });
    c.rp.gl.btnSection.style().set({ color: '#0000FF' });
    c.rp.gl.pnlContainer.style().set({ border: '3px solid #0000FF', shown: true });

    // LDN Implementation Section
    c.lp.ldn.btnSection.style().set({ color: '#800080' });
    c.lp.ldn.pnlContainer.style().set({ border: '3px solid #800080' });

    // SDG Section
    c.lp.sdg.btnSection.style().set({ color: '#000000' });
    c.lp.sdg.pnlContainer.style().set({ border: '3px solid #000000' });
    c.rp.sdg.btnSection.style().set({ color: '#000000' });
    c.rp.sdg.pnlContainer.style().set({ border: '3px solid #000000' });

    // Multicriteria Sections
    c.lp.mc.btnSection.style().set({ color: '#900303' });
    c.lp.mc.pnlContainer.style().set({ border: '3px solid #900303' });
    c.lp.mc.lblDisplay.style().set({
        fontWeight: 'bold',
        fontSize: '12px',
        margin: '1px 1px 1px 5px',
        padding: '2px',
    });
    c.lp.mc.btnCalculate.style().set({ width: '40%' });
    c.lp.mc.btnReset.style().set({ width: '40%' });
    c.rp.mc.btnSection.style().set({ color: '#900303' });
    c.rp.mc.pnlContainer.style().set({ border: '3px solid #900303' });

    // Transitions Sections
    c.lp.tr.btnSection.style().set({ color: '#008000' });
    c.lp.tr.pnlContainer.style().set({ border: '3px solid #008000' });
    c.rp.tr.btnSection.style().set({ color: '#008000' });
    c.rp.tr.pnlContainer.style().set({ border: '3px solid #008000' });

    // Drawing tools Sections
    c.lp.dt.pnlContainer.style().set({ border: '3px solid black' });
    c.lp.dt.lblCustomLayer.style().set({ fontSize: '12px' });
    c.lp.dt.pnlFileName.style().set({ margin: '0px 5px' });
    c.lp.dt.txbLayerName.style().set({ width: '60%', fontSize: '12px' });
    c.lp.dt.lblDrawFeatures.style().set({ fontSize: '12px' });
    c.lp.dt.lblGetStatistics.style().set({ fontSize: '12px' });
    c.lp.dt.lblJson.style().set({ fontSize: '12px' });
    c.lp.dt.lblKml.style().set({ fontSize: '12px' });
    c.lp.dt.lblDownloadLinks.style().set({ fontSize: '12px' });
    c.lp.dt.customAsset.lblEnterAssetId.style().set({ fontSize: '12px' });
    c.lp.dt.customAsset.txtAssetId.style().set({ width: '60%', fontSize: '12px' });
    c.lp.dt.lblLinks.style().set({ fontSize: '12px' });

    c.lp.lblDisclaimer.style().set({ fontSize: '10px', margin: '2px 10px' });

    s.styleStatsValue = { margin: '4px 0px', fontSize: '12px', whiteSpace: 'pre' };
    s.styleStatsHeader = { margin: '4px 0px', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'pre' };
    s.styleInfoTitle = { fontSize: '16px', fontWeight: 'bold', margin: '4px 0px' };

    // Center Panel
    c.cp.pnlFrontLayerLegend.style().set({ position: 'bottom-left' });
    c.cp.pnlCombinedLegend.style().set({ shown: false });
    c.cp.btnSelectContainer.style().set({ position: "bottom-right", margin: '0', padding: '0' });
    c.cp.map.style().set('cursor', 'crosshair');

    // Messages Panel
    c.rp.pnlMessages.style().set({ padding: '8px 15px' });
    c.rp.lblMessages.style().set(s.styleWarning);
    c.rp.lblMessages.style().set({ margin: '4px 0px' });

    // Stats Panel
    c.rp.stats.lblStatsTitle.style().set(s.styleInfoTitle);
    c.rp.stats.lblHighlightBox.style().set({
        border: "2px solid " + m.lv.highlight.vis.color,
        padding: "5px",
        margin: "7px 0 0 5px",
    });
    c.rp.stats.pnlStats.style().set({ padding: '8px 15px', });
    Object.keys(c.rp.stats.ge).forEach(function (key) {
        c.rp.stats.ge[key].widgets().get(0).style().set(s.styleStatsHeader);
        c.rp.stats.ge[key].widgets().get(1).style().set(s.styleStatsValue);
    });


    /*******************************************************************************
    * 5-Behaviors *   
    ******************************************************************************/

    var formatNumber = function (number, digits) {
        return number.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })
    };

    var sortByLabel = function (a, b) {
        if (a.label < b.label) { return -1; }
        if (a.label > b.label) { return 1; }
        return 0;
    };
    var createChartPanel = function (container) {
        var pnlChart = ui.Panel();
        container.add(pnlChart);
        return pnlChart;
    };

    /** Shows the front layer legend (shows legend for first selected layer, from bottom to top, in order of apearence in left panel list) */
    var showFrontLayerLegend = function () {
        c.cp.pnlFrontLayerLegend.clear();
        var chk;
        var sections = ['tr', 'sdg', 'ldn', 'gl'];

        for (var n = 0; n < sections.length; n++) {
            var pnl = c.lp[sections[n]].pnlLayers;
            var entries = c.lp[sections[n]].entries;

            for (var i = pnl.widgets().length() - 1; i >= 0; i--) {
                chk = pnl.widgets().get(i).widgets().get(0); // layer entry check
                if (chk.getValue() && entries[i].legend !== null) {
                    c.cp.pnlFrontLayerLegend.widgets().set(0, entries[i].legend); // check and entry order are the same
                    return;
                }
            }
        }
    };

    c.lp.lan.selLanguage.onChange(function (lan) { initApp(lan); });

    c.lp.dt.btnFlyTo.onClick(function () {
        try {
            var coords = [parseFloat(c.lp.dt.txtLon.getValue()), parseFloat(c.lp.dt.txtLat.getValue())];
            var gmyPoint = ee.Geometry.Point(coords);
            c.cp.map.layers().set(m.layersNames.indexOf(m.labels.lblFlyTo), ui.Map.Layer(ee.FeatureCollection(gmyPoint).style({ color: 'red', pointShape: 'star5', pointSize: 6 })));
            c.cp.map.centerObject(gmyPoint, 10);
        } catch (error) {
            c.rp.lblMessages.setValue(error);
        }

    });

    c.lp.dt.btnUserLocation.onClick(function () {
        c.rp.pnlMessages.style().set({ shown: false });

        var handlePosition = function (position) {
            var lat = position.coords.latitude;
            var lon = position.coords.longitude;
            if (navigator.geolocation) {
                var point = ee.Geometry.Point([lon, lat]);
                c.cp.map.centerObject(point);
                c.cp.map.layers().set(m.layersNames.indexOf(m.labels.lblFlyTo), ui.Map.Layer(point, { color: '#0099ff' }, m.labels.lblFlyTo));

            }
            else {
                c.rp.pnlMessages.style().set({ shown: true });
                c.rp.lblMessages.setValue(m.labels.lblLocNotSupported);
            }
        };
        var handleLocError = function (error) {
            c.rp.pnlMessages.style().set({ shown: true });
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    c.rp.lblMessages.setValue(m.labels.lblPermissionDenied);
                    break;
                case error.POSITION_UNAVAILABLE:
                    c.rp.lblMessages.setValue(m.labels.lblPositionUnavailable);
                    break;
                case error.TIMEOUT:
                    c.rp.lblMessages.setValue(m.labels.lblTimeout);
                    break;
                case error.UNKNOWN_ERROR:
                    c.rp.lblMessages.setValue(m.labels.lblUnknownError);
                    break;
            }
        };

        navigator.geolocation.getCurrentPosition(handlePosition, handleLocError);
    });

    c.lp.dt.btnRemoveLocation.onClick(function () {
        var i = m.layersNames.indexOf(m.labels.lblFlyTo);
        if (m.layersNames.indexOf(m.labels.lblFlyTo) >= 0) {
            c.cp.map.layers().get(i).setShown(false);
        }
    });

    c.lp.info.btnClose.onClick(function () {
        c.lp.info.pnlContainer.style().set({ shown: !c.lp.info.pnlContainer.style().get('shown') });
        c.lp.info.btnClose.setLabel(c.lp.info.pnlContainer.style().get('shown') ? m.labels.lblCloseInfoPanel : m.labels.lblOpenInfoPanel);
    });

    // Stack ldn, sdg and tr layers in map - RASTER layers go first
    c.lp.gl.entries.concat(c.lp.ldn.entries).concat(c.lp.sdg.entries).concat(c.lp.tr.entries)
        .filter(function (layer) {
            return layer.group === 'RASTER';
        }).forEach(function (layer) {
            var name = layer.layerId !== undefined ? layer.layerId : layer.name;
            c.cp.map.addLayer(layer.asset, layer.style, name, layer.visible);

        });

    // Multicriteria layer - this layer is dinamically updated when critera is changed
    c.cp.map.addLayer(c.lp.mc.entry.asset, c.lp.mc.entry.style, c.lp.mc.entry.name, c.lp.mc.entry.visible);

    // AOI Mask layer - this layer is dinamucally updated when user changes AOI
    c.cp.map.addLayer(c.lp.mask.entry.asset, c.lp.mask.entry.style, c.lp.mask.entry.name, c.lp.mask.entry.visible);

    // Stack gl and ldn VECTOR Layers
    c.lp.gl.entries.concat(c.lp.ldn.entries)
        .filter(function (layer) {
            return layer.group === 'FEATURES';
        }).forEach(function (layer) {
            c.cp.map.addLayer(layer.asset.style(layer.style), {}, layer.name, layer.visible);
        });

    // User Localization - this layer is dinamically updated 
    c.cp.map.addLayer(ee.Geometry.Point([0, 0]), { color: '#0099ff' }, m.labels.lblFlyTo, false);

    // Selected AOI
    c.cp.map.addLayer(ee.Geometry.Point([0, 0]), {}, m.labels.lblSelectedAOI, false);

    c.lp.boundaries.selBoundariesLayer.onChange(function (v) {
        m.ftcClickOn = m.assetsClick[v];

        if (m.ftcClickOn !== null) {
            var section;
            if (v === m.labels.lblLevel1 || v === m.labels.lblLevel2 || v === m.labels.lblBasins) {
                section = 'gl';
            }
            else if (v === m.labels.lblLandscapes || v === m.labels.lblDemoSites) {
                section = 'ldn';
            }

            // Open section
            c.lp[section].pnlContainer.style().set({ shown: true });

            // Show layer on map
            for (var i = 0; i < c.lp[section].pnlLayers.widgets().length(); i++) {
                var chk = c.lp[section].pnlLayers.widgets().get(i).widgets().get(0);
                if (chk.getLabel() === v) {
                    chk.setValue(true);
                    break;
                }
            }

            // Hide drawing tool panel
            c.lp.dt.pnlContainer.style().set({ shown: false });
            c.cp.map.drawingTools().stop();
            c.cp.map.drawingTools().setShown(false);
            c.cp.map.drawingTools().layers().forEach(function (l) {
                l.setShown(false);
            });
        }
    });

    /** Shows precalculated stats and charts for selected area of interest. 
     *  If area of interest is a user drawn-feature calculates all stats on the fly*/
    var showInfoSelectedAOI = function () {

        handleEvaluating(true);

        Object.keys(c.rp.stats.ge).forEach(function (key) {
            c.rp.stats.ge[key].widgets().get(1).setValue(m.labels.lblLoading);
        });

        var f;
        if (m.precalculated) { // AOI from precalculated assets
            var selectedArea = m.ftcAOI.first();

            // Get area value in precalculated row, for drawn-feature is already calculated
            m.haAOI = selectedArea.get('area_ha').getInfo();

            m.bestEffort = m.haAOI > m.maxAreaHa ? true : false;

            var statsCols = [
                'name',
                'lpd_0',
                'lpd_1',
                'lpd_2',
                'lpd_3',
                'lpd_4',
                'lpd_5',
                'pa_bin_1',
                'kba_bin_1',
                'mountain_bin_1',
                'soc_sum',
                'soc_mean',
                'npp_sum',
            ];
            f = ee.Feature(null).copyProperties(selectedArea, statsCols);
        }
        else {
            // Calculate all statistics required for info panel
            var ftcSampleStats = mdlPrecal.precalculate(
                m.ftcAOI,
                m.bestEffort,
                ['p_lpd',
                    'p_soc_sum',
                    'p_soc_mean',
                    'p_pa_bin',
                    'p_kba_bin',
                    'p_mountain_bin',
                    'p_npp_sum',
                ]);
            f = ftcSampleStats.first();

        }
        c.rp.stats.ge['lblArea'].widgets().get(1).setValue(formatNumber(m.haAOI, 2) + ' ha.');

        m.evalSet["stats"] = true;
        f.evaluate(function (ef, error) {
            delete m.evalSet["stats"];
            if (Object.keys(m.evalSet).length === 0) {
                handleEvaluating(false);
            }
            if (ef) {
                c.rp.stats.ge['lblAreaName'].widgets().get(1).setValue(ef.properties.name);

                var haVegetated = ef.properties.lpd_1 + ef.properties.lpd_2 + ef.properties.lpd_3 + ef.properties.lpd_4 + ef.properties.lpd_5;
                c.rp.stats.ge['lblVegetatedArea'].widgets().get(1).setValue(formatNumber(haVegetated, 2) + " ha."); // Non veg: " + formatNumber(ef.properties.lpd_0, 2)

                var decliningProdTotal = ef.properties.lpd_1 + ef.properties.lpd_2;
                var aux = m.haAOI > 0 ? (decliningProdTotal * 100 / haVegetated) : 0;
                c.rp.stats.ge['lblDecliningProductivity'].widgets().get(1).setValue(formatNumber(decliningProdTotal, 2) + ' ha. (' + aux.toFixed(2) + '%)');

                aux = m.haAOI > 0 ? (ef.properties.lpd_5 * 100 / haVegetated) : 0;
                c.rp.stats.ge['lblIncreasingProductivity'].widgets().get(1).setValue(formatNumber(ef.properties.lpd_5, 2) + ' ha. (' + aux.toFixed(2) + '%)');

                aux = m.haAOI > 0 ? (ef.properties.pa_bin_1 * 100 / m.haAOI) : 0;
                c.rp.stats.ge['lblProtectedArea'].widgets().get(1).setValue(formatNumber(ef.properties.pa_bin_1, 2) + " ha. (" + aux.toFixed(2) + "%)");

                aux = m.haAOI > 0 ? (ef.properties.kba_bin_1 * 100 / m.haAOI) : 0;
                c.rp.stats.ge['lblKeyBiodiversityArea'].widgets().get(1).setValue(formatNumber(ef.properties.kba_bin_1, 2) + " ha. (" + aux.toFixed(2) + "%)");

                aux = m.haAOI > 0 ? (ef.properties.mountain_bin_1 * 100 / m.haAOI) : 0;
                c.rp.stats.ge['lblMountainCoverage'].widgets().get(1).setValue(formatNumber(ef.properties.mountain_bin_1, 2) + " ha. (" + aux.toFixed(2) + "%)");

                c.rp.stats.ge['lblSocSum'].widgets().get(1).setValue(formatNumber(ef.properties.soc_sum, 2) + ' t');
                c.rp.stats.ge['lblSocMean'].widgets().get(1).setValue(formatNumber(ef.properties.soc_mean, 2) + ' t/ha');

                c.rp.stats.ge['lblNPPTotal'].widgets().get(1).setValue(formatNumber(ef.properties.npp_sum / 1000, 2) + '  tC');
            }
            else {
                c.rp.lblMessages.setValue(error);
            }
        });

        // Update AOI Mask
        try {
            c.cp.map.centerObject(m.ftcAOI);
            c.cp.map.layers().set(m.layersNames.indexOf(m.labels.lblSelectedAOI), ui.Map.Layer(m.ftcAOI.style(m.lv.highlight.vis), {}, m.labels.lblSelectedAOI));
            var i = m.layersNames.indexOf(m.labels.lblAOIMask);
            var e = c.cp.map.layers().get(i);
            e.setEeObject(ee.Image(1).updateMask(ee.Image(1).clip(m.ftcAOI).unmask().eq(0)));
            e.setVisParams({ palette: ['white'] });

        } catch (error) {
            c.rp.lblMessages.setValue(error);
        }

        c.cp.map.drawingTools().setSelected(null);

        // Generate all charts for selected area test
        setupGeneralCharts();
        setUpSDGCharts();
        setupMcCharts();
        setupTransitionsCharts();

        clearCombinedLayerAndLegend();

        // Generate combined raster for selected area
        if (mcCategoryChecked()) {
            calculateMultiCriteria();
        }
    };


    var handleChangeLevel2 = function (level2Code) {
        m.levelAoi = m.labels.lblLevel2;
        m.ftcAOI = ftc2.filter(ee.Filter.eq('ADM2_CODE', level2Code));
        m.precalculated = true;
        showInfoSelectedAOI();
    };

    var handleChangeLevel1 = function (level1Code) {
        if (level1Code !== null) {
            m.levelAoi = m.labels.lblLevel1;
            m.ftcAOI = ftc1.filter(ee.Filter.eq('ADM1_CODE', level1Code));
            m.precalculated = true;
            showInfoSelectedAOI();

            // TODO level2_functionality is commented
            /*c.lp.levels.selLevel2.setPlaceholder(m.labels.lblLoadingLevel2);
            c.lp.levels.selLevel2.items().reset([]);

            var namesLevel2 = ftc2.filter(ee.Filter.eq('ADM1_CODE', level1Code)).aggregate_array('ADM2_NAME');
            var codesLevel2 = ftc2.filter(ee.Filter.eq('ADM1_CODE', level1Code)).aggregate_array('ADM2_CODE');

            namesLevel2.getInfo(function (names2) {
                codesLevel2.getInfo(function (codes2) {
                    var siLevel2 = [];
                    for (var i = 0; i < names2.length; i++) {
                        siLevel2.push({
                            label: names2[i],
                            value: codes2[i]
                        });
                    }

                    siLevel2.sort(sortByLabel);

                    c.lp.levels.selLevel2.unlisten();
                    c.lp.levels.selLevel2.setValue(null);
                    c.lp.levels.selLevel2.items().reset(siLevel2);
                    c.lp.levels.selLevel2.setPlaceholder(m.labels.lblSelectLevel2);
                    c.lp.levels.selLevel2.onChange(handleChangeLevel2);

                });
            });*/
        }
    };

    var resetLevelsSelects = function () {

        c.lp.levels.selLevel1.unlisten();
        c.lp.levels.selLevel2.unlisten();

        c.lp.levels.selLevel1.items().reset(m.siLevel1);
        c.lp.levels.selLevel1.setPlaceholder(m.labels.lblSelectLevel1);
        c.lp.levels.selLevel1.setValue(null);
        c.lp.levels.selLevel1.onChange(handleChangeLevel1);

        /* TODO level2_functionality is commented
        c.lp.levels.selLevel2.items().reset([]);
        c.lp.levels.selLevel2.setPlaceholder(m.labels.lblSelectLevel1First);
        c.lp.levels.selLevel2.setValue(null);

        c.lp.levels.selLevel2.onChange(handleChangeLevel2);
        */
    };

    /** Handles value selection in countries/territories dropdown */
    c.lp.levels.selLevel1.onChange(handleChangeLevel1);

    /* Handle click on selected layer */
    c.cp.map.onClick(function (coords, map) {
        c.lp.dt.txtLon.setValue(coords.lon);
        c.lp.dt.txtLat.setValue(coords.lat);

        if (Object.keys(m.evalSet).length === 0 && !c.lp.dt.pnlContainer.style().get('shown')) {
            if (m.ftcClickOn === null) {
                c.rp.pnlMessages.style().set({ shown: true });
                c.rp.lblMessages.setValue(m.labels.lblSelectLayer);
                return;
            }
            c.rp.lblMessages.setValue('');
            c.cp.map.widgets().remove(c.cp.pnlCombinedLegend);

            var ftcCheck = m.ftcClickOn.filterBounds(ee.Geometry.Point(coords.lon, coords.lat));

            ftcCheck.size().getInfo(function (size) {
                if (size > 0) {
                    m.ftcAOI = ftcCheck;
                    resetLevelsSelects();
                    m.precalculated = true;

                    Object.keys(m.assetsClick).forEach(function (key) {
                        if (m.assetsClick[key] === m.ftcClickOn) {
                            m.levelAoi = key;
                        }
                    });
                    showInfoSelectedAOI();
                }
                else {
                    c.rp.pnlMessages.style().set({ shown: true });
                    c.rp.lblMessages.setValue(m.labels.lblNoFeature);
                }

            });

        }
    });


    ['mc', 'tr', 'sdg', 'ldn', 'gl'].forEach(function (section) {
        c.lp[section].btnSection.onClick(function () {
            c.lp[section].pnlContainer.style().set({ shown: !c.lp[section].pnlContainer.style().get('shown') });
        });

    })


    /** Reloads transitions layers according to year and source selected*/
    var resetTransitionsLayers = function (period) {

        var source = mdlPrecal.lcTrSource;
        var pnlLayers = c.lp.tr.pnlLayers;

        //var lcFinalYear = source.lcYears[source.lcYears.length - 1];
        var lcInitialYear = period.substring(0, 4);
        var lcFinalYear = period.substring(5, 9);

        // Update check labels with selected year
        pnlLayers.widgets().get(0).widgets().get(0).setLabel(m.labels.lblLandCover + ' ' + lcInitialYear);
        pnlLayers.widgets().get(1).widgets().get(0).setLabel(m.labels.lblLandCover + ' ' + lcFinalYear);
        pnlLayers.widgets().get(2).widgets().get(0).setLabel(m.labels.lblGains + ' ' + lcInitialYear + '-' + lcFinalYear);
        pnlLayers.widgets().get(3).widgets().get(0).setLabel(m.labels.lblLosses + ' ' + lcInitialYear + '-' + lcFinalYear);
        pnlLayers.widgets().get(4).widgets().get(0).setLabel(m.labels.lblDegradation + ' ' + lcInitialYear + '-' + lcFinalYear);

        // Reload layers
        var imgFrom = source.imgLcAll.select('y' + lcInitialYear).selfMask().clip(ftc0);
        var lyrFrom = ui.Map.Layer(imgFrom.visualize(source.lcStyle.vis), {}, m.labels.lblFromLC, pnlLayers.widgets().get(0).widgets().get(0).getValue());
        c.cp.map.layers().set(m.layersNames.indexOf(m.labels.lblFromLC), lyrFrom);

        var imgFinal = source.imgLcAll.select('y' + lcFinalYear).selfMask().clip(ftc0);
        var lyrfinal = ui.Map.Layer(imgFinal.visualize(source.lcStyle.vis), {}, m.labels.lblCurrentLC, pnlLayers.widgets().get(1).widgets().get(0).getValue());
        c.cp.map.layers().set(m.layersNames.indexOf(m.labels.lblCurrentLC), lyrfinal);

        var imgGains = source.imgLcTransitions.select('lc_gain_' + lcInitialYear + '_' + lcFinalYear).selfMask().clip(ftc0);
        var lyrGains = ui.Map.Layer(imgGains.visualize(source.lcTransitionsStyle.vis), {}, m.labels.lblGains, pnlLayers.widgets().get(2).widgets().get(0).getValue());
        c.cp.map.layers().set(m.layersNames.indexOf(m.labels.lblGains), lyrGains);

        var imgLosses = source.imgLcTransitions.select('lc_loss_' + lcInitialYear + '_' + lcFinalYear).selfMask().clip(ftc0);
        var lyrLosses = ui.Map.Layer(imgLosses.visualize(source.lcTransitionsStyle.vis), {}, m.labels.lblLosses, pnlLayers.widgets().get(3).widgets().get(0).getValue());
        c.cp.map.layers().set(m.layersNames.indexOf(m.labels.lblLosses), lyrLosses);

        var imgDegradation = source.imgLcTransitions.select('lc_degradation_' + lcInitialYear + '_' + lcFinalYear).selfMask().clip(ftc0);
        var lyrDegradation = ui.Map.Layer(imgDegradation.visualize(source.lcDegradationStyle.vis), {}, m.labels.lblDegradation, pnlLayers.widgets().get(4).widgets().get(0).getValue());
        c.cp.map.layers().set(m.layersNames.indexOf(m.labels.lblDegradation), lyrDegradation);

        // Update transitions charts with new selected period                
        setupTransitionsCharts();
    };

    c.lp.tr.selTransitionPeriods.onChange(function (period) {
        resetTransitionsLayers(period);
    });

    /* Handle click on Drawing Tools Section button */
    c.lp.dt.btnSection.onClick(function () {

        c.lp.dt.pnlContainer.style().set({ shown: !c.lp.dt.pnlContainer.style().get('shown') });

        if (!c.lp.dt.pnlContainer.style().get('shown')) {
            c.cp.map.drawingTools().stop();
        }
        else {
            c.lp.boundaries.selBoundariesLayer.setValue(m.labels.lblNone);
        }

        c.cp.map.drawingTools().setShown(c.lp.dt.pnlContainer.style().get('shown'));
        c.cp.map.drawingTools().layers().forEach(function (l) {
            l.setShown(c.lp.dt.pnlContainer.style().get('shown'));
        });
    });

    /** Creates a new layer with custom name in drawing tools */
    c.lp.dt.btnAddLayer.onClick(function () {
        var paletteLayers = ['#ffb6fc', '#b797ff', '#6a5c5c', '#b3d2b6', '#06ffee', '#b63cff', '#9efba8', '#ff4848', '#ffffff'];
        if (c.lp.dt.txbLayerName.getValue().trim() !== '') {
            var gmlNewLayer = ui.Map.GeometryLayer({
                geometries: null,
                name: c.lp.dt.txbLayerName.getValue(),
                color: paletteLayers[c.cp.map.drawingTools().layers().length() % paletteLayers.length]
            });
            c.cp.map.drawingTools().layers().add(gmlNewLayer);
            c.lp.dt.txbLayerName.setValue('');
        }
    });

    /** Selects Country */
    c.cp.btnSelectContainer.onClick(function () {
        resetLevelsSelects();
        m.levelAoi = m.labels.lblSelectContainer;
        m.ftcAOI = ftc0;
        m.precalculated = true;
        c.cp.map.centerObject(m.ftcAOI);
        showInfoSelectedAOI();
        clearCombinedLayerAndLegend();
    });


    /** Removes combined legend widget from map panel and resets combined image*/
    var clearCombinedLayerAndLegend = function () {
        c.cp.map.widgets().remove(c.cp.pnlCombinedLegend);
        c.cp.map.layers().set(m.layersNames.indexOf(m.labels.lblHotspots), ui.Map.Layer(ee.Image(0).selfMask(), {}, m.labels.lblHotspots, false));
        var chk = c.lp.mc.pnlLayers.widgets().get(0).widgets().get(0);
        chk.setValue(false);
    };

    /** Disables or enables checks in hotspots panel, invoked from calculate and reset buttons */
    var handleDisableMcChecks = function (disable) {
        for (var p = 0; p < c.lp.mc.catEntries.length; p++) {
            var widgetsArray = c.lp.mc.pnlEntries.widgets().get(p).widgets().getJsArray();
            for (var i = 1; i < widgetsArray.length; i++) { // 0=panel title
                widgetsArray[i].widgets().get(1).setDisabled(disable);
            }
        }
    };

    /** Function to enable/disable ui components that allows new AOI query */
    var handleEvaluating = function (disable) {

        c.lp.lan.selLanguage.setDisabled(disable);
        c.lp.levels.selLevel1.setDisabled(disable);
        c.lp.levels.selLevel2.setDisabled(disable);

        c.lp.mc.btnReset.setDisabled(disable);
        c.lp.mc.btnCalculate.setDisabled(disable);
        handleDisableMcChecks(disable);

        c.lp.tr.selTransitionPeriods.setDisabled(disable);

        c.lp.dt.btnZonalStats.setDisabled(disable);

        if (m.precalculated)
            c.rp.lblMessages.setValue(disable ? m.labels.lblProcessingArea : '');
        else
            c.rp.lblMessages.setValue(disable ? m.labels.lblProcessing : '');

        c.rp.pnlMessages.style().set({ shown: disable });
        c.cp.btnSelectContainer.setDisabled(disable);

    };

    c.cp.map.drawingTools().onSelect(function (geom, layer) {
        m.gmySelected = geom;
        m.selectedLayerName = layer.getName();

    });

    c.cp.map.drawingTools().onLayerSelect(function (layer) {
        if (layer === null) {
            m.gmySelected = undefined;
        }
    });

    /** If selected drawn-area is contained in region area and smaller than max area call showInfoSelectedAOI to
     * calculate on the fly stats.
     */
    c.lp.dt.btnZonalStats.onClick(function () {

        if (m.gmySelected === undefined) {
            c.rp.lblMessages.setValue(m.labels.lblSelectGeometry);
            c.rp.pnlMessages.style().set({ shown: true });
            return;
        }

        if (m.gmySelected.type().getInfo() === 'Point') {
            c.rp.lblMessages.setValue(m.labels.lblSelectArea);
            c.rp.pnlMessages.style().set({ shown: true });
            return;
        }

        handleCustomFeatureCollection(m.gmySelected, m.labels.lblDrawnFeature + m.selectedLayerName, m.labels.lblDrawingTools);


    });

    var createChart = function (
        chartDataTable,
        chartOptions,
        chartType,
        chartPanel,
        chartOnClick
    ) {
        // Until chart is rendered, display 'Generating chart x' message
        chartPanel.widgets().set(0,
            ui.Label({
                value: m.labels.lblGeneratingCharts + ': ' + chartOptions.title + '...',
                style: s.styleMessage,
            })
        );

        // Add current evaluation to been procesed list
        m.evalSet[chartOptions.title] = true;

        chartDataTable.evaluate(function (dataTable, error) {
            //print(dataTable)
            delete m.evalSet[chartOptions.title];

            if (Object.keys(m.evalSet).length === 0) {
                handleEvaluating(false);
            }

            if (error) {
                chartPanel.widgets().get(0).setValue(m.labels.lblError + ':' + error);
                return;
            }

            var chart = ui
                .Chart(dataTable)
                .setChartType(chartType)
                .setOptions(chartOptions);

            if (typeof chartOnClick !== 'undefined') { chart.onClick(chartOnClick); }


            if (chartType === 'Table') {
                var header = dataTable[0];
                var cols = [];
                var suffixFinalYear = '';
                if (chartOptions.title === m.labels.lblTableLC) {
                    suffixFinalYear = '_' + chartOptions.final;
                }
                for (var c = 0; c < header.length; c++) {
                    cols.push(c === 0 ? ' ' + header[c].label : c + '_' + header[c].label + suffixFinalYear);
                }
                cols.push(header.length + '_Total');

                var list = ee.List([]);
                for (var index = 1; index < dataTable.length; index++) {// values
                    var element = dataTable[index];
                    var f = ee.Feature(null);
                    var rowTotal = 0;
                    for (var j = 0; j < element.length; j++) {
                        var value = element[j];
                        if (j === 0) {
                            value = value + '_' + chartOptions.initial;
                            f = f.set(cols[j], value);
                        }
                        else {
                            rowTotal = rowTotal + parseFloat(value);
                            f = f.set(cols[j], parseFloat(value));
                        }

                    }
                    f = f.set(header.length + '_Total', rowTotal);
                    list = list.add(f);
                }
                // new feature for columns totals
                var fSum = ee.Feature(null).set(cols[0], 'Total');
                var ftcList = ee.FeatureCollection(list);
                var sumColumns = ftcList.reduceColumns({
                    reducer: ee.Reducer.sum().repeat(cols.length - 1),
                    selectors: cols.slice(1), // not first column (cat name)
                });
                sumColumns.get('sum').getInfo(
                    function (sumsList) {
                        for (c = 1; c < cols.length; c++) {
                            fSum = fSum.set(cols[c], sumsList[c - 1]);
                        }
                        list = list.add(fSum);
                        chartPanel.widgets().set(0, ui.Label(chartOptions.title, { margin: '40px 10px 10px 10px', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'pre' }));
                        chartPanel.widgets().set(1, chart);
                        chartPanel.widgets().set(2, ui.Label(m.labels.lblDownloadCsv, { fontSize: '12px' }).setUrl(ee.FeatureCollection(list).getDownloadURL({ format: 'CSV', filename: 'TableData', selectors: cols })));
                    }
                );
            }
            else {
                chartPanel.widgets().set(0, chart); // replace 'Generating...' label with chart
            }
        });
    };

    /** Setup general charts: LC, LPD, Hansen and Anual NDVI*/
    var setupGeneralCharts = function () {

        c.rp.gl.pnlContainer.clear();

        // If custom drawn-area calculate required statistics for charts
        var ftc = m.precalculated ? m.ftcAOI : mdlPrecal.precalculate(
            m.ftcAOI,
            m.bestEffort,
            ['p_lc', 'p_lpd', 'p_hansen', 'p_ndvi_annual', 'p_x2', 'pro_kba']);

        //  LAND COVER PIE CHART
        var lstFeatLC = mdlPrecal.lcSource.colsBaseLC.map(function (pName, i) {
            var lstValues = ee.List([mdlPrecal.lcSource.style.names[i], ftc.first().get(pName)]);
            return ee.Feature(null, { row: lstValues });
        });

        var lstHeaderLC = ee.List([
            [
                { label: 'LC', role: 'domain', type: 'string' },
                { label: 'Value', role: 'data', type: 'number' },
            ],
        ]);

        var optionsLC = {
            title: m.labels.lblLandCover + ' (' + m.labels[mdlPrecal.lcSource.name] + ') ' + mdlPrecal.lcSource.year,
            height: 350,
            legend: { position: 'top', maxLines: 1 },
            colors: mdlPrecal.lcSource.style.vis.palette,
            pieHole: 0.4
        };

        createChart(lstHeaderLC.cat(ee.FeatureCollection(lstFeatLC).aggregate_array('row')), optionsLC, 'PieChart', createChartPanel(c.rp.gl.pnlContainer));


        //  LPD PIE CHART       
        var namesLPD = ['lpd_0', 'lpd_1', 'lpd_2', 'lpd_3', 'lpd_4', 'lpd_5',];
        var lstFeatLPD = namesLPD.slice(1).map(function (pName, i) { // slice(1)=lpd_0
            var lstValues = ee.List([m.lv.lpd.names[i + 1], ftc.first().get(pName)]);
            return ee.Feature(null, { row: lstValues });
        });
        var lstHeaderLPD = ee.List([
            [
                { label: 'LPD', role: 'domain', type: 'string' },
                { label: 'Value', role: 'data', type: 'number' },
            ],
        ]);
        var optionsLPD = {
            title: m.labels.lblLandProductivityDynamics,
            height: 350,
            legend: { position: 'top', maxLines: 1 },
            colors: m.lv.lpd.vis.palette.slice(1),
            pieHole: 0.4
        };
        createChart(lstHeaderLPD.cat(ee.FeatureCollection(lstFeatLPD).aggregate_array('row')), optionsLPD, 'PieChart', createChartPanel(c.rp.gl.pnlContainer));

        //  KBA PROTECTED      
        var lstFeatKBA = ['kba_PA', 'kba_noPA'].map(function (pName, i) {
            var lstValues = ee.List([[m.labels.lblKBAProtected, m.labels.lblKBANonProtected][i], ftc.first().get(pName)]);
            return ee.Feature(null, { row: lstValues });
        });
        var lstHeaderKBA = ee.List([
            [
                { label: 'KBA', role: 'domain', type: 'string' },
                { label: 'Value', role: 'data', type: 'number' },
            ],
        ]);
        var optionsKBA = {
            title: m.labels.lblProtectionKBA,
            height: 350,
            legend: { position: 'top', maxLines: 1 },
            colors: ['green', 'red'],
            pieHole: 0.4
        };

        createChart(lstHeaderKBA.cat(ee.FeatureCollection(lstFeatKBA).aggregate_array('row')), optionsKBA, 'PieChart', createChartPanel(c.rp.gl.pnlContainer));

        // HANSEN Forest loss
        var lstFeatForestLossByYear = mdlPrecal.yearsHansen.map(function (i) {
            var v = ftc.first().get('hansen_' + (2000 + i));
            var lstValues = ee.List([(2000 + i), v]);
            return ee.Feature(null, { row: lstValues });
        });

        var lstHeaderForesLossByYear = ee.List([
            [
                { label: 'Year', role: 'domain', type: 'string' },
                { label: 'Ha', role: 'data', type: 'number' },
            ],
        ]);

        var optionsForestLossByLC = {
            title: m.labels.lblDeforestation,
            legend: { position: 'none' },
        };
        createChart(lstHeaderForesLossByYear.cat(ee.FeatureCollection(lstFeatForestLossByYear).aggregate_array('row')), optionsForestLossByLC, 'ColumnChart', createChartPanel(c.rp.gl.pnlContainer));

        // NDVI ANNUAL TODO update NDVI image
        var lstNDVIByYear = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map(function (i) {
            var v = ftc.first().get('ndvi_' + (2000 + i));
            var lstValues = ee.List([(2000 + i), v]);
            return ee.Feature(null, { row: lstValues });
        });

        var lstHeaderNDVIByYear = ee.List([
            [
                { label: 'Year', role: 'domain', type: 'number' },
                { label: 'NDVI Annual Mean', role: 'data', type: 'number' },

            ],
        ]);

        var optionsNDVIByYear = {
            title: m.labels.lblAnnualNDVI,
            legend: { position: 'none' },
            vAxis: { title: 'NDVI x 10000' },
            hAxis: { title: m.labels.lblYear, format: '####', gridlines: { count: 7 } },
        };
        createChart(lstHeaderNDVIByYear.cat(ee.FeatureCollection(lstNDVIByYear).aggregate_array('row')), optionsNDVIByYear, 'LineChart', createChartPanel(c.rp.gl.pnlContainer));


        // NDVI MENSUAL, for user-drawn features     
        if (!m.precalculated && m.haAOI < m.maxAreaHa) {
            var chtNDVIByMonthYear = ui.Chart.image.series(imcNDVIByMonthYear, ftc, ee.Reducer.mean(), 250);
            chtNDVIByMonthYear.setOptions({
                title: m.labels.lblMonthlyNDVI,
                vAxis: { title: 'NDVI x 10000' },
                hAxis: { title: m.labels.lblCalendarYear, format: 'yyyy', gridlines: { count: 7 } },
            });

            createChartPanel(c.rp.gl.pnlContainer).add(chtNDVIByMonthYear);
        }


    };

    // Set Up SDG Charts
    var setUpSDGCharts = function () {
        c.rp.sdg.pnlContainer.clear();

        // If custom drawn-area calculate required statistics for charts
        var ftc = m.precalculated ? m.ftcAOI : mdlPrecal.precalculate(m.ftcAOI,
            m.bestEffort,
            ['p_sdg_SAO_2015_TE', 'p_sdg_SAO_2019_TE', 'p_sdg_SAO_2023_TE', 'p_sdg_PA_2016_2019_TE', 'p_sdg_PA_2016_2023_TE']);

        var columnsPrefix = ['SAO_2015', 'SAO_2019', 'SAO_2023', 'PA_2016_2019', 'PA_2016_2023'];
        var layerTypes = Object.keys(mdlPrecal.sdgSource.periods).map(function (l) { return m.labels[l] });
        var product = '_TE';

        // SDG 
        var lstFeatCombined = columnsPrefix.map(function (cat, i) {
            var v0 = ftc.first().get('sdg_0_' + cat + product);
            var v1 = ftc.first().get('sdg_1_' + cat + product);
            var v2 = ftc.first().get('sdg_2_' + cat + product);
            var v3 = ftc.first().get('sdg_3_' + cat + product);
            var v4 = ftc.first().get('sdg_4_' + cat + product);

            var lstValues = ee.List([layerTypes[i], v0, v1, v2, v3, v4]);
            return ee.Feature(null, { row: lstValues });
        });
        var lstHeaderCombined = ee.List([
            [
                { label: 'Product', role: 'domain', type: 'string' },
                { label: m.lv.sdg1531.names[0], role: 'data', type: 'number' },
                { label: m.lv.sdg1531.names[1], role: 'data', type: 'number' },
                { label: m.lv.sdg1531.names[2], role: 'data', type: 'number' },
                { label: m.lv.sdg1531.names[3], role: 'data', type: 'number' },
                { label: m.lv.sdg1531.names[4], role: 'data', type: 'number' },
            ],
        ]);

        var optionsCombined = {
            title: mdlPrecal.sdgSource.name,
            width: 600,
            height: 400,
            legend: { position: 'top', maxLines: 3 },
            bar: { groupWidth: '75%' },
            isStacked: 'percent',
            colors: m.lv.sdg1531.vis.palette,
        };
        createChart(lstHeaderCombined.cat(ee.FeatureCollection(lstFeatCombined).aggregate_array('row')), optionsCombined, 'BarChart', createChartPanel(c.rp.sdg.pnlContainer));
    }



    /** Setup combined charts: LPDxLC, SOCxLPD, SOCxLC, SOCxLPDxLC, LCxLPD table*/
    var setupMcCharts = function () {
        c.rp.mc.pnlContainer.clear();

        // If custom drawn-area calculate required statistics for charts
        var ftc = m.precalculated ? m.ftcAOI : mdlPrecal.precalculate(
            m.ftcAOI,
            m.bestEffort,
            ['p_x2', 'p_soc_lpd', 'p_soc_lc', 'p_soc_lc_lpd']);

        // TODO CHEQUEAR CATEGORÍAS DE LC POR DEFECTO
        var catsLCNoWater = mdlPrecal.lcSource.categories.slice(1); //[1, 2, 3, 4, 5, 6];
        var catsLPD = [1, 2, 3, 4, 5];

        var lstFeatCombinedLC = catsLCNoWater.map(function (i) {
            var v1 = ftc.first().get(i + '_1');
            var v2 = ftc.first().get(i + '_2');
            var v3 = ftc.first().get(i + '_3');
            var v4 = ftc.first().get(i + '_4');
            var v5 = ftc.first().get(i + '_5');

            var lstValues = ee.List([mdlPrecal.lcSource.style.names[i - 1], v1, v2, v3, v4, v5]);

            return ee.Feature(null, { row: lstValues });
        });

        var lstHeaderC1 = ee.List([
            [
                { label: 'LC', role: 'domain', type: 'string' },
                { label: m.lv.lpd.names[1], role: 'data', type: 'number' },
                { label: m.lv.lpd.names[2], role: 'data', type: 'number' },
                { label: m.lv.lpd.names[3], role: 'data', type: 'number' },
                { label: m.lv.lpd.names[4], role: 'data', type: 'number' },
                { label: m.lv.lpd.names[5], role: 'data', type: 'number' },
            ],
        ]);


        // Relative
        var optionsC1Rel = {
            title: m.labels.lblLPDperLC,
            width: 600,
            height: 400,
            legend: { position: 'top', maxLines: 3 },
            bar: { groupWidth: '75%' },
            isStacked: 'relative',
            colors: m.lv.lpd.vis.palette.slice(1),
        };
        createChart(lstHeaderC1.cat(ee.FeatureCollection(lstFeatCombinedLC).aggregate_array('row')), optionsC1Rel, 'BarChart', createChartPanel(c.rp.mc.pnlContainer));

        //  SOC by LPD
        var lstFeatSOCbyLPD = catsLPD.map(function (i) {
            var mean = ftc.first().get('soc_mean_lpd_' + i);
            var lstValues = ee.List([m.lv.lpd.names[i], mean, m.lv.lpd.vis.palette[i]]); // palette has non vegetated color entry
            return ee.Feature(null, { row: lstValues });
        });

        var lstHeaderSOCbyLPD = ee.List([
            [
                { label: 'LPD', role: 'domain', type: 'string' },
                { label: 'SOC mean', role: 'data', type: 'number' },
                { label: 'color', role: 'style', type: 'string' },
            ],
        ]);

        var optionsSOCbyLPD = {
            title: m.labels.lblSOCperLPD,
            legend: { position: 'none' },
        };
        createChart(lstHeaderSOCbyLPD.cat(ee.FeatureCollection(lstFeatSOCbyLPD).aggregate_array('row')), optionsSOCbyLPD, 'ColumnChart', createChartPanel(c.rp.mc.pnlContainer));

        //SOC by LC        
        var lstFeatSOCbyLC = catsLCNoWater.map(function (i) {
            var mean = ftc.first().get('soc_mean_lc_' + i);
            var lstValues = ee.List([mdlPrecal.lcSource.style.names[i - 1], mean, mdlPrecal.lcSource.style.vis.palette[i - 1]]);
            return ee.Feature(null, { row: lstValues });
        });

        var lstHeaderSOCbyLC = ee.List([
            [
                { label: 'LC', role: 'domain', type: 'string' },
                { label: 'SOC mean', role: 'data', type: 'number' },
                { label: 'color', role: 'style', type: 'string' },
            ],
        ]);

        var optionsSOCbyLC = {
            title: m.labels.lblSOCperLC,
            legend: { position: 'none' },
        };
        createChart(lstHeaderSOCbyLC.cat(ee.FeatureCollection(lstFeatSOCbyLC).aggregate_array('row')), optionsSOCbyLC, 'ColumnChart', createChartPanel(c.rp.mc.pnlContainer));


        // SOC combochart
        var lstFeatComboChart = catsLCNoWater.map(function (i) {
            var v1 = ftc.first().get('soc_mean_lc_' + i + '_lpd_1');
            var v2 = ftc.first().get('soc_mean_lc_' + i + '_lpd_2');
            var v3 = ftc.first().get('soc_mean_lc_' + i + '_lpd_3');
            var v4 = ftc.first().get('soc_mean_lc_' + i + '_lpd_4');
            var v5 = ftc.first().get('soc_mean_lc_' + i + '_lpd_5');
            var l = ee.List([v1, v2, v3, v4, v5]);

            var mean = ee.Number(l.reduce(ee.Reducer.sum())).divide(5);
            var lstValues = ee.List([mdlPrecal.lcSource.style.names[i - 1], v1, v2, v3, v4, v5, mean]);

            return ee.Feature(null, { row: lstValues });
        });

        var lstHeaderComboChart = ee.List([
            [
                { label: 'LC', role: 'domain', type: 'string' },
                { label: m.lv.lpd.names[1], role: 'data', type: 'number' },
                { label: m.lv.lpd.names[2], role: 'data', type: 'number' },
                { label: m.lv.lpd.names[3], role: 'data', type: 'number' },
                { label: m.lv.lpd.names[4], role: 'data', type: 'number' },
                { label: m.lv.lpd.names[5], role: 'data', type: 'number' },
                { label: 'SOC mean per LC', role: 'data', type: 'number' },
            ],
        ]);
        var optionsComboChart = {
            title: m.labels.lblSOCperLCLPD,
            width: 600,
            height: 400,
            legend: { position: 'top' },
            seriesType: 'bars',
            colors: m.lv.lpd.vis.palette.slice(1),
            series: { 5: { type: 'line', color: 'blue' } },
        };

        createChart(lstHeaderComboChart.cat(ee.FeatureCollection(lstFeatComboChart).aggregate_array('row')), optionsComboChart, 'ColumnChart', createChartPanel(c.rp.mc.pnlContainer));


    };



    /** Setup transition charts, according to source and year selected in transition panel: LC comparison, LC net changes, LCxLC table*/
    var setupTransitionsCharts = function () {

        var source = mdlPrecal.lcTrSource;
        var pnl = c.rp.tr.pnlContainer;
        pnl.clear();

        var catNames = source.lcStyle.labels.map(function (lbl) { return m.labels[lbl] });
        var fromYear = c.lp.tr.selTransitionPeriods.getValue().substring(0, 4);
        var lcFinalYear = c.lp.tr.selTransitionPeriods.getValue().substring(5, 9);

        // If custom drawn-area calculate required statistics for charts
        var ftc = m.precalculated ? m.ftcAOI : mdlPrecal.precalculate(
            m.ftcAOI,
            m.bestEffort,
            ['p_lc_' + fromYear + '_' + source.initials,
            'p_lc_' + lcFinalYear + '_' + source.initials,
            'p_lc_trans_' + source.initials + '_' + fromYear + '_' + lcFinalYear,
            'p_lc_degradation_' + source.initials + '_' + fromYear + '_' + lcFinalYear]);

        var namesLCColumns = [];
        source.categories.forEach(function (cat) { namesLCColumns.push('lc_' + cat) });

        // chartTrans1 Comparison column chart LC
        var lstFeatLCCombo = namesLCColumns.map(function (pName, i) {
            var initialValue = ftc.first().get(pName + '_' + fromYear + '_' + source.initials);
            var finalValue = ftc.first().get(pName + '_' + lcFinalYear + '_' + source.initials);
            var s = 'bar {fill-color:' + source.lcStyle.vis.palette[i] + '; stroke-width: 0.5; stroke-color: #000000}';
            var lstValues = ee.List([catNames[i], initialValue, s, finalValue, s]);

            return ee.Feature(null, { row: lstValues });
        });

        var lstHeaderLCCombo = ee.List([
            [
                { label: 'LC', role: 'domain', type: 'string' },
                { label: fromYear, role: 'data', type: 'number' },
                { label: 'color1', role: 'style', type: 'string' },
                { label: lcFinalYear, role: 'data', type: 'number' },
                { label: 'color2', role: 'style', type: 'string' },
            ],
        ]);

        var optionsLCCombo = {
            title: m.labels.lblLCPieChartChange + ' ' + fromYear + ' - ' + lcFinalYear + ' - ' + m.labels[source.name],
            width: 600,
            height: 400,
            legend: { position: 'none' },
            seriesType: 'bars',
        };

        createChart(lstHeaderLCCombo.cat(ee.FeatureCollection(lstFeatLCCombo)
            .aggregate_array('row')), optionsLCCombo, 'ColumnChart',
            createChartPanel(pnl));


        // charTrans2 LC CANDLESTICK NET GAIN/LOSS CHART
        var lstFeatLCNetChange = namesLCColumns.map(function (pName, i) {
            var initialValue = ftc.first().get(pName + '_' + fromYear + '_' + source.initials);
            var finalValue = ftc.first().get(pName + '_' + lcFinalYear + '_' + source.initials);
            var diff = ee.Number(finalValue).subtract(ee.Number(initialValue)).format('%,.2f');
            var tt = ee.String(m.labels.lblDifference + ' (ha): ').cat(diff);
            var lstValues = ee.List([catNames[i], initialValue, initialValue, finalValue, finalValue, tt]);
            return ee.Feature(null, { row: lstValues });
        });


        var lstHeaderLCNetChange = ee.List([
            [
                { label: 'LC', role: 'domain', type: 'string' },
                { label: 'Low', role: 'data', type: 'number' },
                { label: 'Open', role: 'data', type: 'number' },
                { label: 'Close', role: 'data', type: 'number' },
                { label: 'Final', role: 'data', type: 'number' },
                { role: 'tooltip', p: { html: true } }
            ],
        ]);

        var optionsLCNetChange = {
            title: m.labels.lblNetLCChanges + ' ' + fromYear + ' - ' + lcFinalYear + ' - ' + m.labels[source.name],
            legend: { position: 'none' },
            bar: { groupWidth: '100%' },
            candlestick: {
                fallingColor: { strokeWidth: 0, fill: '#a52714' }, // red
                risingColor: { strokeWidth: 0, fill: '#0f9d58' }   // green
            }
        };

        createChart(lstHeaderLCNetChange.cat(ee.FeatureCollection(lstFeatLCNetChange)
            .aggregate_array('row')), optionsLCNetChange, 'CandlestickChart',
            createChartPanel(pnl));


        // chartTrans3 Table with transitions LC/LC
        var lstFeatLCTransTable = source.categories.map(function (i) {
            var transition = 'lc_trans_' + source.initials + '_' + fromYear + '_' + lcFinalYear + '_' + i;
            var values = source.categories.map(function (c) {
                return ee.Number(ftc.first().get(transition + '_' + c)).format('%.2f');
            });
            var lstValues = ee.List([catNames[i - 1]]).cat(values);
            return ee.Feature(null, { row: lstValues });
        });

        var colsT1 = [{ label: fromYear + '/' + lcFinalYear, role: 'domain', type: 'string' }];
        catNames.forEach(function (lc) {
            colsT1.push({ label: lc, role: 'data', type: 'number' });
        });
        var lstHeaderLCTransTable = ee.List([colsT1]);


        var optionsLCTransTable = {
            title: m.labels.lblTableLC + ' - ' + m.labels[source.name],
            initial: fromYear,
            final: lcFinalYear,
            html: true,
            frozenColumns: 1,

        };

        createChart(lstHeaderLCTransTable.cat(ee.FeatureCollection(lstFeatLCTransTable)
            .aggregate_array('row')), optionsLCTransTable, 'Table',
            createChartPanel(pnl));

        // Degradation state chart
        var lstFeatDeg = [1, 2, 3].map(function (deg, i) {
            var degColumn = 'lc_deg_' + source.initials + '_' + fromYear + '_' + lcFinalYear + '_' + deg;
            var lstValues = ee.List([m.labels[source.lcDegradationStyle.labels[i]], ftc.first().get(degColumn)]);
            return ee.Feature(null, { row: lstValues });
        });

        var lstHeaderDeg = ee.List([
            [
                { label: 'Deg', role: 'domain', type: 'string' },
                { label: 'Value', role: 'data', type: 'number' },
            ],
        ]);

        var optionsDeg = {
            title: m.labels.lblDegradation + ' ' + fromYear + '-' + lcFinalYear + ' (' + m.labels[source.name] + ')',
            height: 350,
            legend: { position: 'top', maxLines: 1 },
            colors: source.lcDegradationStyle.vis.palette,
        };

        createChart(lstHeaderDeg.cat(ee.FeatureCollection(lstFeatDeg)
            .aggregate_array('row')), optionsDeg, 'PieChart',
            createChartPanel(pnl));

    };

    /** Creates combined layer from image adding legend to map panel, invoked from calculateMultiCriteria() and combined chart click */
    var setupCombinedLayer = function (image, legendTitle, legendText) {

        c.cp.pnlCombinedLegend = ui.Panel();
        c.cp.pnlCombinedLegend.add(ui.Label(legendTitle, { margin: '1px 0px', fontSize: '12px', fontWeight: 'bold' }));

        c.cp.pnlCombinedLegend.add(mdlLegends.createCatRow(m.lv.custom.vis.palette[0], legendText, false));
        c.cp.pnlCombinedLegend.style().set({
            position: 'bottom-center'
        });

        var lblDownloadText = ui.Label({
            style: {
                fontSize: '12px',
                margin: '1px 1px 4px 1px',
                padding: '2px',
            },
        });
        c.cp.pnlCombinedLegend.add(lblDownloadText);

        if (image !== null) {
            var options = { region: m.ftcAOI.geometry(), name: legendText };
            image.getDownloadURL(options, function (url, error) {
                // error ie: Pixel grid dimensions (159378x46852) must be less than or equal to 10000.
                lblDownloadText.setValue(m.labels.lblGeneratingDownloadLink);

                if (url !== null) {
                    lblDownloadText.setValue(m.labels.lblDownload);
                    lblDownloadText.setUrl(url);
                }
                else {
                    //lblDownloadText.setValue(labels.lblBigImage);
                    lblDownloadText.setValue('');
                }

            });
        }


        c.cp.map.layers().set(m.layersNames.indexOf(m.labels.lblHotspots), ui.Map.Layer(image, m.lv.custom.vis, m.labels.lblHotspots, false));
        c.cp.map.widgets().add(c.cp.pnlCombinedLegend);

        var chk = c.lp.mc.pnlLayers.widgets().get(0).widgets().get(0);
        chk.setValue(true);

    };

    /** Creates a new image layer and calculate area considering categories selected in multicriteria panel*/
    var calculateMultiCriteria = function () {
        c.rp.lblMessages.setValue(m.labels.lblProcessingArea);
        c.rp.pnlMessages.style().set({ shown: true });

        handleEvaluating(true);
        //clearCombinedLayerAndLegend();

        var totalArea = 0;
        var statsAreaBE;

        var imgCustom = ee.Image(0).selfMask();

        // Function to filter image with categories 
        var getFilteredImage = function (image, categories) {
            var imgFiltered = image.clip(m.ftcAOI).eq(parseInt(categories[0]));
            for (var i = 1; i < categories.length; i++) {
                imgFiltered = imgFiltered.or(image.eq(parseInt(categories[i])));
            }
            return imgFiltered.selfMask();
        };


        // Foreach section panel in hotspots panel check which categories are selected
        var selectedPerSection = [];
        var filteredImages = [];

        c.lp.mc.pnlEntries.widgets().forEach(function (panel, panelIndex) {
            if (panelIndex < c.lp.mc.catEntries.length) {
                var selectedCatNumbers = [];
                panel.widgets().forEach(function (element, index) {
                    if (index > 0) { // title
                        if (element.widgets().get(1).getValue()) {
                            var pidx = c.lp.mc.catEntries[panelIndex].names.indexOf(element.widgets().get(1).getLabel());
                            selectedCatNumbers.push(c.lp.mc.catEntries[panelIndex].categories[pidx]);
                        }
                    }
                });
                selectedPerSection.push(selectedCatNumbers);

                if (selectedCatNumbers.length > 0) {
                    // add filtered image to array 
                    filteredImages.push(getFilteredImage(c.lp.mc.catEntries[panelIndex].image, selectedCatNumbers));
                }


            }
        });

        //print('filteredImages: ', filteredImages);

        var imgProduct = ee.Image(1).clip(m.ftcAOI);
        filteredImages.forEach(function (f) {
            imgProduct = imgProduct.multiply(f);
        });

        imgCustom = imgProduct.clip(m.ftcAOI);

        // Calculate only selected categories
        var imgCombinedCatAreaAdv = imgCustom.eq(1)
            .rename('area')
            .multiply(ee.Image.pixelArea()).divide(10000);

        var be = m.levelAoi === m.labels.lblSelectContainer ? true : false;
        var statsAreaAdv = imgCombinedCatAreaAdv.reduceRegion({
            reducer: ee.Reducer.sum(),
            geometry: m.ftcAOI.geometry().bounds(),
            scale: 100,
            bestEffort: be
        });
        totalArea = statsAreaAdv.get('area');

        statsAreaBE = imgCombinedCatAreaAdv.reduceRegion({
            reducer: ee.Reducer.sum(),
            geometry: m.ftcAOI.geometry().bounds(),
            scale: 100,
            bestEffort: true
        });

        // Compute area sum, when ready set title with total ha and try to create url to download image
        m.evalSet['multicriteria'] = true;
        totalArea.evaluate(function (t, error) {
            var legendTitle;
            if (error) {
                print('totalArea.evaluate error, trying best effort', error);
                // Try with bestEffort=true            
                statsAreaBE.get('area').evaluate(function (t, error) {
                    delete m.evalSet['multicriteria'];
                    if (Object.keys(m.evalSet).length === 0) {
                        handleEvaluating(false);
                    }
                    if (error) {
                        legendTitle = m.labels.lblErrorCalculating;
                    }
                    else {
                        legendTitle = m.labels.lblHotspots + ' Aprox. ' + formatNumber(t, 2) + ' ha.';
                    }
                    setupCombinedLayer(t === 0 ? null : imgCustom, legendTitle, m.labels.lblCombinedCategoriesArea, false);
                });
            }
            else {
                delete m.evalSet['multicriteria'];
                if (Object.keys(m.evalSet).length === 0) {
                    handleEvaluating(false);
                }
                legendTitle = m.labels.lblHotspots + (m.levelAoi === m.labels.lblSelectContainer ? ' Aprox. ' : ' ') + formatNumber(t, 2) + ' ha.';
                setupCombinedLayer(t === 0 ? null : imgCustom, legendTitle, m.labels.lblCombinedCategoriesArea, false);
            }
        });
    }


    /** Returns true if at least one category in hotspots is checked*/
    var mcCategoryChecked = function () {
        for (var p = 0; p < c.lp.mc.catEntries.length; p++) {
            var widgetsArray = c.lp.mc.pnlEntries.widgets().get(p).widgets().getJsArray();
            for (var i = 1; i < widgetsArray.length; i++) { // 0=panel title
                if (widgetsArray[i].widgets().get(1).getValue()) { // 0=colorbox 1=chkbox
                    return true;
                }
            }
        }
        return false;
    };


    /** Reset calcultation and uncheck all multicriteria categories*/
    var handleClickReset = function () {
        clearCombinedLayerAndLegend();
        // unselect combined checks
        for (var p = 0; p < c.lp.mc.catEntries.length; p++) {
            var widgetsArray = c.lp.mc.pnlEntries.widgets().get(p).widgets().getJsArray();
            for (var i = 1; i < widgetsArray.length; i++) { // 0=title
                widgetsArray[i].widgets().get(1).setValue(false);
            }
        }

    };

    /** Recalculate combined layer with selected multicriteria categories */
    c.lp.mc.btnCalculate.onClick(function () {
        clearCombinedLayerAndLegend();
        if (mcCategoryChecked()) {
            calculateMultiCriteria();

        }
    });
    c.lp.mc.btnReset.onClick(handleClickReset);

    // Layers names array ordered as stacked in the map
    c.cp.map.layers().forEach(function (l) {
        m.layersNames.push(l.getName());
    });


    c.cp.map.drawingTools().setDrawModes(['point', 'polygon', 'rectangle']);
    var updateCollection = function () {
        var names = [];
        c.cp.map.drawingTools().layers().forEach(function (l) { return names.push(l.getName()) });

        var ftcDrawn = c.cp.map.drawingTools().toFeatureCollection("layerId");

        ftcDrawn = ftcDrawn.map(function (f) {
            return f
                .set("layerName", ee.List(names).get(f.get("layerId")))
                .set("layerId", f.get("layerId"));
        });

        ftcDrawn.size().evaluate(function (size) {
            if (size > 0) {
                c.lp.dt.lblJson.style().set('shown', true);
                c.lp.dt.lblJson.setValue(m.labels.lblUpdating + '...').setUrl(null);
                c.lp.dt.lblKml.style().set('shown', true);
                c.lp.dt.lblKml.setValue(m.labels.lblUpdating + '...').setUrl(null);


                ftcDrawn.getDownloadURL({
                    format: 'kml',
                    filename: m.labels.lblDownloadFileName,
                    callback: function (url) {
                        c.lp.dt.lblKml.setValue('.kml').setUrl(url);
                        c.lp.dt.lblKml.setUrl(url);
                    },
                });
                ftcDrawn.getDownloadURL({
                    format: 'json',
                    filename: m.labels.lblDownloadFileName,
                    callback: function (url) {
                        c.lp.dt.lblJson.setValue('.json').setUrl(url);
                        c.lp.dt.lblJson.setUrl(url);
                    },
                });
            }
            else {
                c.lp.dt.lblJson.style().set({ shown: false });
                c.lp.dt.lblKml.style().set({ shown: false });
            }
        });
    };

    c.cp.map.drawingTools().onDraw(updateCollection);
    c.cp.map.drawingTools().onEdit(updateCollection);
    c.cp.map.drawingTools().onErase(updateCollection);

    /*******************************************************************************
    * 6-Initialization *
    ******************************************************************************/
    // AOI = Country
    m.ftcAOI = ftc0;
    m.levelAoi = m.labels.lblSelectContainer;
    m.haAOI = 0;
    m.precalculated = true;

    // Countries names for dropdown
    m.names1 = ftc1.aggregate_array('ADM1_NAME').getInfo();
    m.codes1 = ftc1.aggregate_array('ADM1_CODE').getInfo();
    m.siLevel1 = [];
    for (var i = 0; i < m.names1.length; i++) {
        m.siLevel1.push({
            label: m.names1[i],
            value: m.codes1[i]
        });
    }
    m.siLevel1.sort(sortByLabel);
    c.lp.levels.selLevel1.items().reset(m.siLevel1);


    showInfoSelectedAOI(); // on load show info of whole country region
    showFrontLayerLegend(); // on load show the last selected general layer legend

    c.cp.map.setControlVisibility(true, false, true, true, true, true, false);
}

