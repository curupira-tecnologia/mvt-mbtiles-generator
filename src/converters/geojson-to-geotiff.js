const { Client } = require('pg');
const QueryStream = require('pg-query-stream');
const JSONStream = require('JSONStream');
const fs = require('fs');
const path = require('path');
const fileExist = require('../helpers/file_exists');
const exec = require('../helpers/execCommand');
const dirCreate = require('../helpers/dir_exists');
const geojsonUtils = require('../helpers/geojson_utils');
require('dotenv').config()

// const OPTIONS = 
// {   
//     "width":4096,
//     "height":4096,
//     ""
// }

class geojsonRaster {
    constructor(filename, dataDirectory) {
        this._error = false;
        this._processing = 0;
        this._dataDirectory = dataDirectory;
        this._filename = filename;
        this._gdal_rasterize = process.env.GDAL_BIN_DIR+'gdal_rasterize'
        if(fileExist(this._gdal_rasterize) === false){
            console.error('gdal_rasterize not found. Define a env with GDAL_BIN_DIR to define the path of gdal')
        }

    }


    async convert(inputFileGeoJson, outputFilename, width = 4096, height = 4096, attrForBand) {
        let output = path.resolve(this._dataDirectory, 'geotiff/', `${outputFilename}.tiff`)
        console.log(" ")
        console.log("---------------------------- ")
        console.log("---- Geojson to Raster ---- ")
        console.log("     outfile: "+output)
         if (fileExist(output)) {
            console.log("     file already exist!")
            return output
        }
        if(!dirCreate(output)){
            console.error(`     output directory ${path.dirname(output)} can not be created!`)   
        }

        let cmd = this._gdal_rasterize //+`  -a ${attrForBand} -ts ${width}.0 ${height}.0 -a_nodata 0.0 -ot Float32 -of GTiff ${inputFileGeoJson} ${output}`
        let args = []
        if(attrForBand){
             args.push('-a')
             args.push(attrForBand)
        }
        args.push(`-ts`) 
        args.push(`${width}`) 
        args.push(`${height}`) 
        args.push(`-a_nodata`) 
        args.push('0.0')
        args.push('-of') 
        args.push('GTiff') 
        args.push(`${inputFileGeoJson}`) 
        args.push(`${output}`) 
        try {
            let res = await exec(cmd, args)
            geojsonUtils.addBBoxInfo(output)
        } catch (e) {
            console.log("     ERROR")
            console.error(e)
            return false
        }
        console.log("     OK")
        return output
    }



    getStatus() {
    }


    getFile() {

    }
}

module.exports = geojsonRaster;