const logger = require("fancy-log");
const { BOT_DEBUG } = require("../Bot");

module.exports.debugMsg = function (msg) {
  if (!BOT_DEBUG) return;
  logger.info(`DEBUG: ${msg}`);
};
