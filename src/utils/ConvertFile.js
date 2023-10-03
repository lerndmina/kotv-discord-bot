const ffmpeg = require('fluent-ffmpeg');
const log = require('fancy-log');
const DeleteFile = require('./DeleteFile');

const ConvertFile = async (name, oldType, newType) => {
  return new Promise((resolve, reject) => {
    ffmpeg(`${name}.${oldType}`)
      .toFormat('mp3')
      .on('error', (err) => {
        log.error(`FFMPEG ERR: ${err}`);
        reject(err);
      })
      .on('end', () => {
        resolve();
      })
      .save(`${name}.${newType}`);
  });
};

module.exports = ConvertFile;