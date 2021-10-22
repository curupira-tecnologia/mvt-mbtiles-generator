require('dotenv').config()
require('module-alias/register')
const path = require('path');
const fs = require('fs');
const fileExists = require('./utils/file_exists');



module.exports = class mainController{
    
    constructor(configFile, watchConfig){
        this._configFile = configFile
        this._config = this._loadConfigContent()
        this._watchConfig();
        this._running = false;
        this._DATA_DIR = (process?.env?.DATA_DIR || path.resolve(__dirname, '../data/'))
    }

    _loadConfigContent(){
      let configContent
      try{
        configContent = JSON.parse(fs.readFile(config))
      }catch(e){
        console.error('Error reading config file')
        console.error(e)
        process.exit(2)
      }
      this._config = configContent
      return configContent
    }

    _watchConfig(){
        fs.watchFile(this._configFile,(current,prev)=>{
          this._loadConfigContent()
          this.restart()
        })
    }

    start(){
        if( ! this._running ){
          this._running = true
          this.parseLayers()
        }
    }

    stop(){

    }

    restart(){

    }

    async parseLayers(){
        
      for ( const layer in this._config) {
  
        if(layer.enable === false) continue

        const strategyDriver = layer?.strategy?.driver
        if(strategyDriver){
          const Strategy = require( path.resolve('./strategys/',strategy.driver))
          try{
            await new Strategy(layer, this._DATA_DIR).start()
          }catch(e){
            console.error('Error converting layer:\n'+layer)
          }
        } 
      }
    }




}




