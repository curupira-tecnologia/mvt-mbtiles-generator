const { Client } = require('pg');
const QueryStream = require('pg-query-stream');
const JSONStream = require('JSONStream');
const fs = require('fs');
const path = require('path');
const fileExist = require('../helpers/file_exists');
const dirCreate = require('../helpers/dir_exists');
const geojsonUtils = require('../helpers/geojson_utils');
var rw = require('rw');

const OPTIONS = 
{   
    "type":"postgres",
    "connection":"postgresql://user:pass@host:port/db",
    "schema":"layers_published",
    "tableName":"tb_temperatura",
    "geoColumn":"geom",
    "idColumn":"",
    "propertiesColumns":["vlr_temper"]
}

class postgisGeojson {
    constructor( filename, dataDirectory, options) {
      this._error = false;
      this._processing = 0;
      this._dataDirectory = dataDirectory;
      this._filename = filename;
      this._options = options;
      this._sql = this._createSQL();
      this._db = null
      this._output = path.resolve( dataDirectory,'geojson/',`${filename}_original.geojson`)

     }

     async _connect(){
         //change localhost to docker internal SO WE THINK LOCALHOST REFER TO machine running docker
        if(process.env.DOCKER_RUNNING)
            this._options.connection = this._options.connection.replace(/localhost/,'host.docker.internal')
        
        var client = new Client({
            connectionString: this._options.connection,
        })
        try{
           await client.connect()
        }catch(e){
            console.error(e)
            return false
        }
        return client
     }

     _createSQL() {
         const {
             geoColumn,
             tableName,
             schema,
             idColumn,
             propertiesColumns
         } = this._options

        const cols = Array.isArray(propertiesColumns) ? propertiesColumns.join(', ') : '';
        let SQL =
            `select json_build_object(
                'type', 'FeatureCollection',
                'name': '${this._filename}',
                'features', json_agg(ST_AsGeoJSON(t.*)::json)
            ) as geojson
            FROM (select ${ idColumn!=='' ? idColumn +' as id,' : ''} ${ cols!=='' ? cols+', ' : ' '} ST_Transform(${geoColumn},4326) as geom from ${schema}.${tableName})
            AS t(${ idColumn!=='' ? idColumn+', ' : ''} ${ cols!='' ? cols+', ' : ''} geom);`
        return SQL
     }

     async convert(){
        let output = this._output
        console.log("")
        console.log("---------------------------- ")
        console.log("---- Postgis to GeoJSON ---- ")
        console.log("     outfile: "+output)
        if(fileExist(output)){
            console.log("     file already exist!")
            return output
        }
        if(!dirCreate(output)){
            console.error(`     output directory ${path.dirname(output)} can not be created!`)   
        }

        try{
            this._db = await this._connect()
            // TODO - teste verybig query or progress with stream - https://www.npmjs.com/package/pg-query-stream
            console.log('     executing sql ')
            let res = await this._db.query(this._sql)
            console.log('     salvando geoJSON ')
            rw.writeFileSync(output, JSON.stringify(res.rows[0].geojson), err=>console.log(err));
            geojsonUtils.addBBoxInfo(output)
        }catch(e){
            console.error(e)
            return false
        }
        this._db.end() // close connection
        console.log("     OK")
        return output
     }

     getStatus(){
     }

     
     getFile(){

     }
  }

  module.exports = postgisGeojson; 