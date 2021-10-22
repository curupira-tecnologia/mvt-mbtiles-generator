const fs = require('fs');
const childProcess = require('child_process');

module.exports = function (command, args=[], outputsameline = false) {
    // console.log( process.env.PATH );
    return new Promise(function (resolve, reject) {
        console.log('    running: ')       
        console.log('              ' + command + ' ' + args.join(' '))    
        
        //TODO, verificar a utilização do 
        // https://www.npmjs.com/package/shelljs
        let subprocess = childProcess.spawn(command, args)
        let prefix = outputsameline ? '\r' : ''
        subprocess.stdout.on('data',
            data => process.stdout.write(prefix+data.toString())
        )
        
        subprocess.stderr.on('data',
            data => console.log(data.toString())
        )

        subprocess.on('close', (code) => {
            if (code !== 0) {
                console.log(`              child process exited with code ${code}`);
                reject(code)
            }
            resolve(code)
          });

        subprocess.on('error', (err) => {
            console.error('              Failed to start subprocess.');
            reject(err)
        });

    })

}