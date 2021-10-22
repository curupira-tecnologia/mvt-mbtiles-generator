const postgisToGeojson = require('../converters/postgis-to-geojson.js')
const fileExists = require('../converters/file-exists.js')

function checkFile(file, throwError = true, log) {
  log = log ? log : `\nFile ${file} already proceed!`
  if (fileExists(file)) {
    return true
  } else {
    console.info(log)
    if (throwError) {
      throw new Error(log)
    }
    return false
  }
}

module.exports = class vectorRasterVector extends EventEmitter {

  constructor(layerConfig, data_dir) {
    this._layer = layerConfig;
    this.running = false
    this._dataDirectory = data_dir
    this._dataDirectoryTemp = path.resolve(data_dir, '/tmp/', layerConfig.name, '/')



    this._steps = this._createSteps()

  }

  async _createSteps() {

    const steps = [
      {
        name: 'Generate full GeoJSON from Data Source',
        task: '${source}ToGeojson',  // the signature of a function is function( input, output, args, stepObject )
        taskType: 'converter', // [converter, methodName, moduleRequest] converter is the default, but if a method with the name of the task if found, it will be used instead
        args:[], // arguments passed to method
        input: {
          type: Object,
          value: this._layer.dataSource
        },
        output: { 
          type: 'File', 
          value: `${layer.name}_full.geojson`
        },
        dataDir: path.resolve(this._dataDirectory, '/geojson/'),
        stopOnError: true,
        skipOnFileExist: true,
      },
      {
        name: 'Create optimized size Rasters - Geotiffs',
        task: 'geojsonToGeotiff',
        args:[],
        //  input: null,  null or undefined input will get the input from the older source\
        output:{
           type:'FileList',
           args:[]
        },
        dataDir: path.resolve(this._dataDirectoryTemp, '/geotiffs/'),
        stopOnError: true,
        skipOnFileExist: true,
      },
      {
        name: 'Create GeoJSONs from optimized sized Rasters',
        task: 'rastersToGeoJSON',
        input:{
          type:'FileList'
        },
        output:{
          type:'FileList'
        },
        output: path.resolve(this._dataDirectoryTemp, '/geojson/'),
        stopOnError: true,
        skipOnFileExist: true,
      },
      {
        name: 'Create GeoJSONs from optimized sized Rasters',
        task: 'rastersToGeoJSON',
        input:{
          type:'FileList'
        },
        output:{
          type:'FileList'
        },
        output: path.resolve(this._dataDirectoryTemp, '/geojson/'),
        stopOnError: true,
        skipOnFileExist: true,
      },
    ]




  }


  async start() {

     //run steps

    if (checkFile(this._files.finalMbtiles, true, ' Layer Already Proceed!')) {
      return true
    }

    const layer = this._layerConfig
    this.running = true

    if (checkFile(this._files.fullGeoJSON)) {
      if (layer.dataSource.type === 'postgres' || layer.dataSource.type === 'postgis') {
        originalGeoJson = await postgisToGeojson.convert(layer.dataSource, this._files.fullGeoJSON)
      }
    }

    //get layer BBOX
    await geoJSONUtils.addBBoxInfo(originalGeoJson)
    const BBOX = await geoJSONUtils.getExtend(originalGeoJson)

    // GENERATE INTERMERMETIATE TILES
    let outputs = [
      { attr: layer.mainAttr, minzoom: 2, maxzoom: 3 },
      { attr: layer.mainAttr, minzoom: 4, maxzoom: 4 },
      { attr: layer.mainAttr, minzoom: 5, maxzoom: 5 },
      { attr: layer.mainAttr, minzoom: 6, maxzoom: 6 },
      { attr: layer.mainAttr, minzoom: 7, maxzoom: 7 },
      { attr: layer.mainAttr, minzoom: 8, maxzoom: 8 },
      { attr: layer.mainAttr, minzoom: 9, maxzoom: 9 },
      { attr: layer.mainAttr, minzoom: 10, maxzoom: 10 },
      { attr: layer.mainAttr, minzoom: 11, maxzoom: 11 },
    ]

    let filesToMerge = []

    for (let i = 0; i < outputs.length; i++) {
      const { attr, minzoom, maxzoom } = outputs[i];
      const name = layer.name + "z" + minzoom + '_Z' + maxzoom

      let { width, height } = geoUtils.calculateRasteDimensionForBboxInZoom(BBOX, minzoom, 256)
      const ratio = ((((0.4 - 1) / 9) * minzoom) + 1)
      width = width * ratio
      height = height * ratio
      // TODO - make functions receive output file name
      let rasterFromOriginaFile = await converterGeojsonToRaster.convert(originalGeoJson, name, width, height, attr)
      if (!rasterFromOriginaFile) return
      // TODO - make functions receive output file name
      let vectorFromRasterFile = await converterRasterToGeojson.convert(rasterFromOriginaFile, name, attr)
      if (!vectorFromRasterFile) return

      // Now add tippecanoe metadata zoomlevels to features, so in conversion we will utilize just the features with the zoom level
      let geojsonFilesWithAttrs = path.resolve(DATA_DIR_TMP, '' + name + '_with_tippecanoe_metadata.geojson')

      if (!file_exists(geojsonFilesWithAttrs)) {
        const obj = { "tippecanoe": { "maxzoom": maxzoom, "minzoom": minzoom } }
        let metadataAdded = await geoJSONUtils.addProperties(vectorFromRasterFile, obj, 'features', geojsonFilesWithAttrs)
        if (!metadataAdded) {
          console.log('  error adding attributes')
        }
      }
      filesToMerge.push(geojsonFilesWithAttrs)
    }

    // Merging all Geojsons
    let mergedFile = path.resolve(DATA_DIR, '/data/tmp/' + layer.name + '_merged.geojson')
    if (!file_exists(mergedFile)) {
      console.log('    merging files, can take a while...')
      let res = await geoJSONUtils.joinFiles(filesToMerge, mergedFile, true)
      if (!res) {
        console.log('    error merging files')
        return false
      }
      console.log('    Ok')
    }

    // Create mbtile for the optimizeds geojson
    let mbtilesOptimizedGeosFile = path.resolve(DATA_DIR, '/data/tmp/' + layer.name + '_optimized_geos_.mbtiles')
    if (!file_exists(mbtilesOptimizedGeosFile)) {
      console.log('    Creating MBTILE for Optimized generetade files....')
      const res = await geojsonMbtiles.convert(mergedFile, mbtilesOptimizedGeosFile, ['-l', layer.name, '--no-line-simplification', '--no-tiny-polygon-reduction', '-P'])
      if (!res) {
        console.log('    Error')
        return false
      }
      console.log('    Ok')
    }


    // Format original geojson to make it parallems in tippecanoe
    let originalGeoJsonFormated = path.resolve(DATA_DIR, '/data/tmp/' + layer.name + '_origninal_formated.geojson')
    if (!file_exists(originalGeoJsonFormated)) {
      let res = await geoJSONUtils.joinFiles(originalGeoJson, originalGeoJsonFormated, true)
      if (!res) {
        console.log('    error merging files')
        return false
      }

    }

    // Create mbtile for the original
    let mbtilesOriginalFile = path.resolve(DATA_DIR, '/data/tmp/' + layer.name + '_original_geos_.mbtiles')
    if (!file_exists(mbtilesOriginalFile)) {
      console.log('    Creating MBTILE for Original file.... ' + layer.name)
      const minZoom = outputs[outputs.length - 1].maxzoom + 1
      const options = ['-l', layer.name, '-Z', minZoom, '--extend-zooms-if-still-dropping', '-P']
      if (layer.optimizeOriginal === true) {
        options.push('--coalesce-densest-as-needed')
      } else {
        options.push('--no-line-simplification')
        options.push('--no-tiny-polygon-reduction')
      }
      if (layer.topology) options.push('--detect-shared-borders')
      const res = await geojsonMbtiles.convert(originalGeoJsonFormated, mbtilesOriginalFile, options)
      //  const res = await converterGeojsonToMbtiles.convert(mergedFile, layer.name, [`--minimum-zoom=${minzoom}`,`--maximum-zoom=${maxzoom}` ,'--no-line-simplification','--no-tiny-polygon-reduction'])
      if (!res) {
        console.log('    Error')
        return false
      }
      console.log('    Ok')
    }


    // join the 2 mbtiles in the final

    console.log(`===========================================================`)
    console.log(`=======  Finish ${layer.name}  ===========================`)
    console.log(`===========================================================`)
    console.timeEnd(`==== converting layer  ${layer.name} ====`)
  }






}

}