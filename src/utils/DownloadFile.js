const https = require('https');
const log = require('fancy-log');
const fs = require('fs');

const DownloadFile = (url, name, type) => {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const path = `${name}.${type}`;
      const writeStream = fs.createWriteStream(path);
    
      res.pipe(writeStream);
    
      writeStream.on("finish", () => {
        writeStream.close();
        resolve();
      });
    }).on("error", (err) => {
      log("Download Failed");
      reject(err);
    });
});
};

module.exports = DownloadFile;