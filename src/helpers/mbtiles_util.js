const fileExist = require('../helpers/file_exists');
var geojsonExtent = require('@mapbox/geojson-extent');
var path = require('path');
var rw = require('rw');
var fs = require('fs');
var os = require('os');
var MultiStream = require('multistream')
var JSONStream = require('JSONStream')
const geojsonStream = require('geojson-stream');
const lodash = require('lodash');
// var es = require('event-stream')
const exec = require('./execCommand');
const file_exists = require('../helpers/file_exists');
const detourStream = require('detour-stream')

module.exports = class geojsonUtil {

    static async join(inputs = [], output, options=[]) {
       
        let outputTemp = output+'_temp.mbtiles'
        console.log("---------------------------- ")
        console.log("---- Merging MBTILES ---- ")

        if (!dirCreate(output)) {
            console.error(`     output directory ${path.dirname(output)} can not be created!`)
        }
        if (!dirCreate(outputTemp)) {
            console.error(`     output directory ${path.dirname(output)} can not be created!`)
        }

        this._tileJoin = process.env.TIPPECANOE_BIN_DIR+'tile-join'
        if(fileExist(this._tileJoin) === false){
            console.error('tile-join, utility of tippecanoe not found. Define a env with TIPPECANOE_BIN_DIR to define the path')
        }

        let cmd = this._tileJoin
        let args = [...options]


        args.push(`--output=${outputTemp}`)
        // args.push(`--temporary-directory=${tempdir}/temp.mbtiles`)
        //  args.push(`--progress-interval=30`)
        args.push(`--force`)

        inputs.forEach(file=>args.push(file))
        

        try {
            // TODO - ver de utilizar - https://github.com/stevage/node-tippecanoe/blob/master/index.js
            console.log('              ' + cmd + ' ' + args.join(' '))
            let res = await exec(cmd, args, true)
            // console.log('DISABLING TIPPECANOE TEMPORARY')
            fs.renameSync(outputTemp, output)
            fs.rmSync(outputTemp)
        } catch (e) {
            console.log("     ERROR")
            console.error(e)
            return false
        }
        console.log("     OK")
        return output
    }
}


