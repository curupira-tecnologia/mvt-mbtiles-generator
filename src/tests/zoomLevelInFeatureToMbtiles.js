const geojsonUtil = require("../helpers/geojson_utils");
var geojsonMerge = require('@mapbox/geojson-merge');
const path = require("path")
const fs = require("fs");
const file_exists = require("../helpers/file_exists");
const geojsonMbtiles = require("../converters/geojson-mbtiles");

const main = async function(){
    console.log('START-----------------')
    const DIR = path.resolve(__dirname,'../tests/data/tilezoom/')

    const mergedGeojson = DIR+'/output/merged.geojson'
    const mbTiles = DIR+'/output/multi_level_zoom_features.mbtiles'
    
    const filesnames = fs.readdirSync(DIR)

    const inputFiles = []
    filesnames.forEach( file=>{
        if(file.match(/json$/)){
            inputFiles.push(DIR+'/'+file)
        }
        }
    )

    console.log(inputFiles)
    
    //merging
    console.time('merging')
    console.log('mergingFiles')
    if(!await geojsonUtil.joinFiles(inputFiles, mergedGeojson)){ 
        throw new Error('not merged')
    }
    console.timeEnd('merging')


    //generatingMbTiles
    console.time('mbtiles')
    console.log('generating mbtiles')
    if(! await geojsonMbtiles.convert(mergedGeojson, mbTiles, ['--clip-bounding-box=-57.9638671875000000,-20.2209657795222988,-42.3632812500000000,-5.8783321096743144'] )  ){ 
        throw new Error('error converting')
    }
    console.timeEnd('mbtiles')


}

main()