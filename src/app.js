// import layers from '../config.json'
require('dotenv').config()
const path = require('path');
const geoJSONUtils = require('./helpers/geojson_utils');
const geoUtils = require('./helpers/geo_utils');
const LAYERSCONFIG = require('../config.json');

let postgisToGeojson = require('./converters/postgis-geojson')
let geojsonToRaster = require('./converters/geojson-raster.js');
let rasterToGeojson = require('./converters/raster-geojson.js');
let geojsonToMbtiles = require('./converters/geojson-mbtiles.js');
const file_exists = require('./helpers/file_exists');
const geojsonMbtiles = require('./converters/geojson-mbtiles.js');




(async function(layers){
    const layersArray = Object.keys(layers)
    for (const layerKey of layersArray){
        const layer = layers[layerKey]
        if(layer.enable === false) continue
        if(  layer.strategy === "vector-raster-vector"){
            await vectorRasterVector(layer)
        }
    }
})(LAYERSCONFIG)





async function vectorRasterVector(layer){

    console.time(`==== converting layer  ${layer.name} ====`)

    const DATA_DIR = (process?.env?.DATA_DIR || path.resolve(__dirname,'../data/'))

    // setup converters
    let converterGeojsonToRaster = new geojsonToRaster(layer.name, DATA_DIR)
    let converterRasterToGeojson = new rasterToGeojson(layer.name, DATA_DIR)
    let converterGeojsonToMbtiles = new geojsonToMbtiles(layer.name, DATA_DIR)

    let originalGeoJson
    if(layer.dataSource.type==='postgres' || layer.dataSource.type==='postgis'){
        // TODO - make functions receive output file name
        let converter = new postgisToGeojson(layer.name, DATA_DIR, layer.dataSource)
        originalGeoJson = await converter.convert()
    }

    if(!originalGeoJson) return false

    //get layer BBOX
    await geoJSONUtils.addBBoxInfo(originalGeoJson)
    const BBOX = await geoJSONUtils.getExtend(originalGeoJson)
    
    // GENERATE INTERMERMETIATE TILES
    let outputs = [
        {name:layer.name+'_low_2',attr:layer.mainAttr, minzoom:2, maxzoom:2 },   
        {name:layer.name+'_low_1', attr:layer.mainAttr, minzoom:3, maxzoom:4 },   
        {name:layer.name+'_medium_2', attr:layer.mainAttr, minzoom:5, maxzoom:5 },   
        {name:layer.name+'_medium_1', attr:layer.mainAttr, minzoom:6, maxzoom:6 },   
        {name:layer.name+'_height_2', attr:layer.mainAttr, minzoom:7, maxzoom:7 },   
        {name:layer.name+'_height_1', attr:layer.mainAttr, minzoom:8, maxzoom:8 },   
        {name:layer.name+'_heights_2', attr:layer.mainAttr, minzoom:9, maxzoom:10 },   
    ]
   
    let filesToMerge = []

    //verificar o uso do tile-join disponibilizado no tippecanoe
    for (let i = 0; i < outputs.length; i++) {
        const {name, attr, minzoom, maxzoom } = outputs[i];
        console.log( outputs[i])
        let { width, height } = geoUtils.calculateRasteDimensionForBboxInZoom(BBOX,minzoom,256)
        const ratio = ( (((0.4-1)/9)*minzoom) + 1 )
        width = width*ratio
        height = height*ratio
        // TODO - make functions receive output file name
        let rasterFromOriginaFile = await converterGeojsonToRaster.convert(originalGeoJson, name, width, height, attr)
        if(!rasterFromOriginaFile) return
        // TODO - make functions receive output file name
        let vectorFromRasterFile = await converterRasterToGeojson.convert(rasterFromOriginaFile, name, attr)
        if(!vectorFromRasterFile) return

        // Now add tippecanoe metadata zoomlevels to features, so in conversion we will utilize just the features with the zoom level
        let geojsonFilesWithAttrs = path.resolve(DATA_DIR,'/data/tmp/'+name+'_withAttr.geojson')
        
        if( !file_exists(geojsonFilesWithAttrs) ){
            const obj = { "tippecanoe" : { "maxzoom" : minzoom, "minzoom" : minzoom } } 
            let metadataAdded = await geoJSONUtils.addProperties(vectorFromRasterFile, obj, 'features', geojsonFilesWithAttrs )
            if( ! metadataAdded){
                console.log('  error adding attributes')
            } 
        }
        filesToMerge.push(geojsonFilesWithAttrs)
    }

    // Merging all Geojsons
    let mergedFile = path.resolve(DATA_DIR,'/data/tmp/'+layer.name+'_merged.geojson')
    if( !file_exists(mergedFile) ){
        console.log('    merging files, can take a while...')
        let res = await geoJSONUtils.joinFiles(filesToMerge, mergedFile)
        if(!res){
            console.log('    error merging files')
            return false
        }
        console.log('    Ok')
    }

    // Create mbtile for the optimizeds geojson
    let mbtilesOptimizedGeosFile = path.resolve(DATA_DIR,'/data/tmp/'+layer.name+'_optimized_geos_.mbtiles')
    if( !file_exists(mbtilesOptimizedGeosFile) ){
         console.log('    Creating MBTILE for Optimized generetade files....')
         const res = await geojsonMbtiles.convert(mergedFile, mbtilesOptimizedGeosFile, layer.name, ['--no-line-simplification','--no-tiny-polygon-reduction'])
        //  const res = await converterGeojsonToMbtiles.convert(mergedFile, layer.name, [`--minimum-zoom=${minzoom}`,`--maximum-zoom=${maxzoom}` ,'--no-line-simplification','--no-tiny-polygon-reduction'])
         if(!res){
            console.log('    Error')
            return false
        }
        console.log('    Ok')
    }

    // Create mbtile for the original
    let mbtilesOriginalFile = path.resolve(DATA_DIR,'/data/tmp/'+layer.name+'_original_geos_.mbtiles')
    if( !file_exists(mbtilesOriginalFile) ){
         console.log('    Creating MBTILE for Original file....')
         const minZoom = outputs[outputs.length-1].maxzoom+1
         const options = ['-Z', minZoom, '--coalesce-densest-as-needed', '--extend-zooms-if-still-dropping']
         if(layer.topology) options.push('--detect-shared-borders')
         const res = await geojsonMbtiles.convert(originalGeoJson, mbtilesOriginalFile, layer.name, options)
        //  const res = await converterGeojsonToMbtiles.convert(mergedFile, layer.name, [`--minimum-zoom=${minzoom}`,`--maximum-zoom=${maxzoom}` ,'--no-line-simplification','--no-tiny-polygon-reduction'])
         if(!res){
            console.log('    Error')
            return false
        }
        console.log('    Ok')
    }


    // join the 2 mbtiles in the final

    console.log(`===========================================================`)
    console.log(`=======  Finish ${layer.name }  ===========================`)
    console.log(`===========================================================`)
    console.timeEnd(`==== converting layer  ${layer.name} ====`)
}

