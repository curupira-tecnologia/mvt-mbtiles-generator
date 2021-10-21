const geojsonUtil = require("../helpers/geojson_utils");
var geojsonMerge = require('@mapbox/geojson-merge');
const path = require("path")
const fs = require("fs");
const file_exists = require("../helpers/file_exists");

const main = async function(){
    console.log('START-----------------')
    const fileOut = path.resolve(__dirname,'../tests/data/merged.geojson')
    
    if(file_exists(fileOut))
        fs.rmSync(fileOut)
    

    let files = []
    // files.push( path.resolve(__dirname,'../tests/data/teste.geojson') )
    files.push( path.resolve(__dirname,'/data/geojson/temperatura_low_2.geojson') )
    files.push( path.resolve(__dirname,'/data/geojson/temperatura_low_1.geojson') )
    files.push( path.resolve(__dirname,'/data/geojson/temperatura_medium_2.geojson') )
    files.push( path.resolve(__dirname,'/data/geojson/temperatura_medium_1.geojson') )
    // files.push( path.resolve(__dirname,'../tests/data/teste2.geojson') )
    // files.push( path.resolve(__dirname,'/data/geojson/temperatura_low_2.geojson') )
    

// var mergedStream = geojsonMerge.mergeFeatureCollectionStream(files)
// mergedStream.pipe(process.stdout);

    let res = await geojsonUtil.joinFiles(files,fileOut)
    
    if(res){
        console.log(fs.readFileSync(fileOut).toString())
    }else{
        console.error('algum erro')
    }
}

main()