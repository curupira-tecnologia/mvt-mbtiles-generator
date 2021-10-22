const { Client } = require('pg');
const QueryStream = require('pg-query-stream');
const JSONStream = require('JSONStream');
const fs = require('fs');
const path = require('path');
const fileExist = require('../helpers/file_exists');
const exec = require('../helpers/execCommand');
const dirCreate = require('../helpers/dir_exists');
require('dotenv').config()

//  gdal_polygonize [-8] [-nomask] [-mask filename] raster_file [-b band|mask]
// [-q] [-f ogr_format] out_file [layer] [fieldname]


class rasterGeojson {
    constructor(filename, dataDirectory) {
        this._error = false;
        this._processing = 0;
        this._dataDirectory = dataDirectory;
        this._filename = filename;
        this._gdal_polygonize = process.env.GDAL_BIN_DIR+'gdal_polygonize.py'
        if(fileExist(this._gdal_polygonize) === false){
            console.error('_gdal_polygonize.py not found. Define a env with GDAL_BIN_DIR to define the path of gdal')
        }

    }


    async convert(inputFileRaster, outputFilename, attrForBand) {
        console.log(" ")
        let output = path.resolve(this._dataDirectory, 'geojson/', `${outputFilename}.geojson`)
        console.log("---------------------------- ")
        console.log("---- Raster to Geojson ---- ")
        console.log("     outfile: "+output)

        if (fileExist(output)) {
            console.log("     file already exist!")
            return output
        }
        if(!dirCreate(output)){
            console.error(`     output directory ${path.dirname(output)} can not be created!`)   
        }
        
        let cmd = this._gdal_polygonize //gdal_polygonize.py /Users/le/uso_cobertura_terra/geofiff-400x400.tif /private/var/folders/73/wjp7shps4v32v_h1sf5f6tgc0000gn/T/processing_npDlub/2da975251d7644f6acb47a8d8cfa28d9/OUTPUT.gpkg -b 1 -f "GPKG" OUTPUT vlr_class
        let args = []
        

        args.push(`${inputFileRaster}`)
        args.push(`${output}`)
        args.push('-b')
        args.push(1)
        args.push('-f')
        args.push('GeoJSON')
        args.push(this._filename) // layer name of raster
        if(attrForBand){
             args.push(attrForBand)
        }
        try {
            let res = await exec(cmd, args)
            console.log(res)
        } catch (e) {
            console.error(e)
            return false
        }
        return output
    }



    getStatus() {
    }


    getFile() {

    }
}

module.exports = rasterGeojson;