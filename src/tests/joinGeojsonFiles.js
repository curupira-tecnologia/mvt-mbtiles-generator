const geojsonUtil = require("../helpers/geojson_utils");
const path = require("path")
const fs = require("fs");
const file_exists = require("../helpers/file_exists");

const main = async function(){
    console.log('START-----------------')
    const fileOut = path.resolve(__dirname,'../../data/tests_output/merged_normal.geojson')
    const fileOutJust = path.resolve(__dirname,'../../data/tests_output/merged_justfeatures.geojson')
    
    if(file_exists(fileOut))
        fs.rmSync(fileOut)
    
    if(file_exists(fileOutJust))
        fs.rmSync(fileOutJust)
    
    let files = []
    files.push( path.resolve(__dirname,'../tests/data/merging/teste.geojson') )
    files.push( path.resolve(__dirname,'../tests/data/merging/teste2.geojson') )
    files.push( path.resolve(__dirname,'../tests/data/merging/teste3.geojson') )
    // files.push( path.resolve(__dirname,'/data/geojson/temperatura_low_2.geojson') )
    // files.push( path.resolve(__dirname,'/data/geojson/temperatura_low_1.geojson') )
    // files.push( path.resolve(__dirname,'/data/geojson/temperatura_medium_2.geojson') )
    // files.push( path.resolve(__dirname,'/data/geojson/temperatura_medium_1.geojson') )
    // files.push( path.resolve(__dirname,'../tests/data/teste2.geojson') )
    // files.push( path.resolve(__dirname,'/data/geojson/temperatura_low_2.geojson') )
    

// var mergedStream = geojsonMerge.mergeFeatureCollectionStream(files)
// mergedStream.pipe(process.stdout);

    let res = await geojsonUtil.joinFiles(files,fileOut, false)
    let res2 = await geojsonUtil.joinFiles(files,fileOutJust, true)
    
    if(res){
        console.log(fs.readFileSync(fileOut).toString())
    }else{
        console.error('algum erro')
    }
    if(res2){
        console.log(fs.readFileSync(fileOutJust).toString())
    }else{
        console.error('algum erro')
    }
}

main()