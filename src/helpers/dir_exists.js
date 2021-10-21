const fs = require('fs');
const path = require('path');

module.exports = function(filename){
    let dir
    if(path.extname(filename)!==''){
        dir = path.dirname(filename)
    }else{
        dir = filename
    }
    if (!fs.existsSync(dir)){
        try{
            fs.mkdirSync(dir, { recursive: true });
            return true;
        }catch(e){
            console.error(e)
            return false
        }
    }
    return true;
  }