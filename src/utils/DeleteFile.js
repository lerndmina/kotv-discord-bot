const fs = require('fs');
const log = require('fancy-log');

const DeleteFile = (name, type) => {
  const filename = `${name}.${type}`;
  if (fs.existsSync(filename)) {
    fs.unlinkSync(filename);
  } else {
    log(`File ${filename} does not exist.`);
  }
};

module.exports = DeleteFile;