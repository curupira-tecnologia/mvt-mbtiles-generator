const { Client } = require('pg');
const QueryStream = require('pg-query-stream');
const JSONStream = require('JSONStream');
const fs = require('fs');
const path = require('path');
const fileExist = require('../helpers/file_exists');
const exec = require('../helpers/execCommand');
const dirCreate = require('../helpers/dir_exists');
require('dotenv').config()

class geojsonMbtiles {
    constructor(filename, dataDirectory) {
        this._error = false;
        this._processing = 0;
        this._dataDirectory = !dataDirectory ? path.dirname(filename) : dataDirectory
        this._filename = filename;
        this._tippecanoe = process.env.TIPPECANOE_BIN_DIR+'tippecanoe'
        if(fileExist(this._tippecanoe) === false){
            console.error('tippecanoe not found. Define a env with TIPPECANOE_BIN_DIR to define the path of gdal')
        }

    }


    static async convert(inputGeojson, outputFilename, options=[] ) {
           //get dir
           const newInstance = new geojsonMbtiles(inputGeojson)
           return newInstance._convert(inputGeojson, outputFilename, options)
    }

    async _convert(inputGeojson, outputFilename, options=[] ) {

       
       
        let output = path.resolve(this._dataDirectory, 'mbtiles/', `${outputFilename}.mbtiles`)
        let outputTemp = path.resolve(this._dataDirectory, 'tmp/', `${outputFilename}.mbtiles`)
        console.log("---------------------------- ")
        console.log("---- Geojson to MBTILES ---- ")
       //  if (fileExist(output)) {
       //      console.log("     file already exist!")
       //      return output
       //  }
        if(!dirCreate(output)){
            console.error(`     output directory ${path.dirname(output)} can not be created!`)   
        }
        if(!dirCreate(outputTemp)){
            console.error(`     output directory ${path.dirname(output)} can not be created!`)   
        }
        
        let cmd = this._tippecanoe 
        let args = [...options]
        

        args.push(`--output=${outputTemp}`)
        // args.push(`--temporary-directory=${tempdir}/temp.mbtiles`)
        args.push(`--progress-interval=30`)
        args.push(`--force`)

       //  args.push(`--layer=${path.basename(outputFilename)}`)
        
        args.push(inputGeojson)
        
        try {
            // TODO - ver de utilizar - https://github.com/stevage/node-tippecanoe/blob/master/index.js
            let res = await exec(cmd, args)
            fs.renameSync(outputTemp, output )
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

module.exports = geojsonMbtiles;




/*
Usage: tippecanoe [options] [file.json ...]
  Output tileset
         --output=output.mbtiles [--output-to-directory=...] [--force]
         [--allow-existing]
  Tileset description and attribution
         [--name=...] [--attribution=...] [--description=...]
  Input files and layer names
         [--layer=...] [--named-layer=...]
  Parallel processing of input
         [--read-parallel]
  Projection of input
         [--projection=...]
  Zoom levels
         [--maximum-zoom=...] [--minimum-zoom=...]
         [--extend-zooms-if-still-dropping] [--one-tile=...]
  Tile resolution
         [--full-detail=...] [--low-detail=...] [--minimum-detail=...]
  Filtering feature attributes
         [--exclude=...] [--include=...] [--exclude-all]
  Modifying feature attributes
         [--attribute-type=...] [--attribute-description=...]
         [--accumulate-attribute=...] [--empty-csv-columns-are-null]
         [--convert-stringified-ids-to-numbers]
         [--use-attribute-for-id=...]
  Filtering features by attributes
         [--feature-filter-file=...] [--feature-filter=...]
  Dropping a fixed fraction of features by zoom level
         [--drop-rate=...] [--base-zoom=...] [--drop-lines]
         [--drop-polygons] [--cluster-distance=...]
  Dropping or merging a fraction of features to keep under tile size limits
         [--drop-densest-as-needed] [--drop-fraction-as-needed]
         [--drop-smallest-as-needed] [--coalesce-densest-as-needed]
         [--coalesce-fraction-as-needed]
         [--coalesce-smallest-as-needed] [--force-feature-limit]
         [--cluster-densest-as-needed]
  Dropping tightly overlapping features
         [--gamma=...] [--increase-gamma-as-needed]
  Line and polygon simplification
         [--simplification=...] [--no-line-simplification]
         [--simplify-only-low-zooms] [--no-tiny-polygon-reduction]
         [--no-simplification-of-shared-nodes]
  Attempts to improve shared polygon boundaries
         [--detect-shared-borders] [--grid-low-zooms]
  Controlling clipping to tile boundaries
         [--buffer=...] [--no-clipping] [--no-duplication]
  Reordering features within each tile
         [--preserve-input-order] [--reorder] [--coalesce]
         [--reverse] [--hilbert]
  Adding calculated attributes
         [--calculate-feature-density] [--generate-ids]
  Trying to correct bad source geometry
         [--detect-longitude-wraparound] [--use-source-polygon-winding]
         [--reverse-source-polygon-winding] [--clip-bounding-box=...]
  Filtering tile contents
         [--prefilter=...] [--postfilter=...]
  Setting or disabling tile size limits
         [--maximum-tile-bytes=...] [--maximum-tile-features=...]
         [--no-feature-limit] [--no-tile-size-limit]
         [--no-tile-compression] [--no-tile-stats]
         [--tile-stats-attributes-limit=...]
         [--tile-stats-sample-values-limit=...] [--tile-stats-values-limit=...]
  Temporary storage
         [--temporary-directory=...]
  Progress indicator
         [--quiet] [--no-progress-indicator] [--progress-interval=...]
         [--version]
*/
