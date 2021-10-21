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

module.exports = class geojsonUtil {

    constructor(fileOrInput) {
        this._geojson = null
        this._content = null
        this._ogr2ogr = process.env.GDAL_BIN_DIR + 'ogr2ogr'
        if (fileExist(this._ogr2ogr) === false) {
            console.error('ogr2ogr not found. Define a env with GDAL_BIN_DIR to define the path of gdal')
        }

        if (fileExist(fileOrInput)) {
            this._filename = fileOrInput
        }
        return this
    }

    _getContent() {
        if (this._content) return this._content
        let fileContent = null
        if (fileExist(this._filename)) {
            console.log('     Open File ....')
            let fileContent = rw.readFileSync(this._filename)
            if (fileContent) {
                fileContent = JSON.parse(fileContent.toString())
            } else {
                console.error(fileContent)
                this._content = null
                return null
            }
            this._content = fileContent
        }

        return this._content
    }


    async _addBBoxInfo() {
        console.log('     Adding BBOX geoJSON info....')
        if (this._getExtendFromBBOXAttr()) {
            console.log('     Already exist!')
            return
        }

        let tempOutput = fs.mkdtempSync(path.join(os.tmpdir(), 'geojsonutils'));
        let tempOutputFile = `${tempOutput}/temp.geojson`
        let args = `-f GeoJSON ${tempOutputFile} ${this._filename} -lco RFC7946=NO -lco WRITE_NAME=NO -lco WRITE_BBOX=YES`
        try {
            await exec(this._ogr2ogr, args.split(' '))
            fs.cpSync(tempOutputFile, this._filename)
        } catch (e) {
            console.log(e)
            return false
        }
        console.log('     OK')
        return true
    }

    static async addBBoxInfo(fileOrInput) {
        let res = await new geojsonUtil(fileOrInput)._addBBoxInfo()
        return res
    }


    // EXTENT
    static async getExtend(fileOrInput) {
        let res = await new geojsonUtil(fileOrInput)._getExtend()
        return res
    }
    async _getExtend() {
        console.log('     Getting geoJSON extent info....')
        let extent = await this._getExtendFromBBOXAttr()
        if (!extent)
            extent = await this._getExtendFromFileAnalyse()
        if (!extent) {
            console.log('     Erro!')
            return null
        }
        console.log('     OK')
        return extent
    }
    async _getExtendFromBBOXAttr() {
        return new Promise((resolve, reject) => {
            console.log('     trying in bbox attribution of FeatureCollection....')
            let bbox = null
            let streamjson = JSONStream.parse('bbox')
            let stremfile = fs.createReadStream(this._filename).pipe(streamjson)
            streamjson
                .on('data', data => {
                    bbox = data
                    console.log('     Found:' + bbox.join(' '))
                    resolve(bbox)
                    streamjson.destroy()
                })
                .on('close', (e) => {
                    resolve(null)
                })
                .on('footer', () => {
                    resolve(null)
                })
                .on('error', (e) => {
                    console.log('error stream')
                    resolve(null)
                });
        })

    }
    async _getExtendFromFileAnalyse() {
        console.log('     trying analyzing files geometry....')
        let bbox = null
        try {
            let content = this._getContent()
            bbox = geojsonExtent(content)
        } catch (e) {
            console.error(e)
        }
        if (!bbox) {
            console.log('     Not found!')
            return null
        }
        console.log('     Found:' + bbox.join(' '))
        return bbox

    }


    static async addProperties(fileOrInput, props, JSONStreamPath = 'features.*.properties', outputFile) {
        let res = await new geojsonUtil(fileOrInput)._addProperties(fileOrInput, props, JSONStreamPath, outputFile)
        return res
    }



    _addProperties(fileOrInput, props = {}, JSONStreamPath = 'features.*.properties', outputFile) {
        outputFile = outputFile ? outputFile : fileOrInput
        return new Promise((resolve, reject) => {
            console.log('     adding attributes to json....')
            let tempOutput = fs.mkdtempSync(path.join(os.tmpdir(), 'geojsonutils'));
            let tempOutputFile = `${tempOutput}/temp-with-attr.geojson`
            const streamOut = fs.createWriteStream(tempOutputFile);
            fs.createReadStream(fileOrInput)
                .pipe(geojsonStream.parse((feature, index) => {
                    const newFeature = lodash.merge(feature, props)
                    return newFeature
                }))
                .pipe(geojsonStream.stringify())
                .pipe(streamOut);

            streamOut
                .on('data', data => {
                    console.log(data)
                    // streamjson.destroy()
                })
                .on('close', (e) => {
                    console.log('closing')
                    fs.cpSync(tempOutputFile, outputFile)
                    resolve(true)
                })
                .on('footer', () => {
                    console.log('footer')
                    // resolve(null)
                })
                .on('error', (e) => {
                    console.log('error stream')
                    resolve(null)
                });
        })
    }



    static async joinFiles(inputFiles=[], outputFile ) {

        return new Promise((resolve, reject) => {
            console.log('           Start streaming files')
            const tempFile = outputFile+'_tmp'
            const streamOut = fs.createWriteStream(tempFile);
            
            // out features adding featuresCollection in output
            const outFeaturesCollectionStream = JSONStream.stringify();
            
            let streams = inputFiles.map(   file=>
                {
                    if(file_exists(file)){
                        return fs.createReadStream(file)
                    }else{
                        console.error(`File ${file} not exist`)
                    }
                }
            )
            if(streams.length === 0) resolve(null)

            let count = 0
            // use indicator
            // process.stdout.write("hello: ");
            let jsonstream = JSONStream.parse('features.*')
            jsonstream.on('data',e=> {
                count++
                process.stdout.write(`\rFeatures merged: ${count}`)
            })
            jsonstream.on('error',e=>console.error('Error in geojsonStream.parse',e))

            new MultiStream(streams)
            .pipe(jsonstream)
            // .pipe(outFeaturesCollectionStream)
            .pipe(geojsonStream.stringify())
            .pipe(streamOut)

            streamOut.on('data',e=>console.log(e.toString()))
            streamOut.on('close',e=>{
                fs.cpSync(tempFile, outputFile)
                console.log('finish streamOut')
                resolve(true)
            })
            streamOut.on('error',e=>{
                console.log('error stream')
                // resolve(null)
            })
        })

    }



    

    addFeaturesInfo(fileOrInput) {

    }

    save() {

    }

}


