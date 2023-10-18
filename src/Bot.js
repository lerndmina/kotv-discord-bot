const { Client, GatewayIntentBits, Partials, REST, Routes } = require("discord.js");
const { CommandKit } = require("commandkit");
const path = require("path");
const log = require("fancy-log");
const mongoose = require("mongoose");
require("dotenv").config();

const env = require("./utils/FetchEnvs")();

module.exports.Start = async () => {
  /**
   * @param {Client} client
   */
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildMembers,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
  });

  // Using CommandKit (https://commandkit.underctrl.io)
  const commandKit = new CommandKit({
    client, // Discord.js client object | Required by default
    commandsPath: path.join(__dirname, "commands"), // The commands directory
    eventsPath: path.join(__dirname, "events"), // The events directory
    validationsPath: path.join(__dirname, "validations"), // Only works if commandsPath is provided
    devGuildIds: env.TEST_SERVERS,
    devUserIds: env.OWNER_IDS,
  });

  log.info(
    `Logging in to Discord with ${commandKit.commands.length} commands and ${
      Object.keys(env).length
    } enviroment variables.`
  );

  await mongoose.connect(env.MONGODB_URI).then(() => {
    log.info("Connected to MongoDB");
    client.login(env.BOT_TOKEN);
  });
};

function sendDebugMessage(msg) {
  if (!this.BOT_DEBUG) return;
  log.info(`DEBUG: ${msg}`);
}

/**
 * @type {string[]}
 * @description Random funny bot messages for a footer.
 */
module.exports.BOT_MESSAGES = [
  "Good luck, have fun, don’t get shot",
  "Become a bot. Join the NSO today!",
  "You can’t spell slaughter without laughter",
  "You couldn't hit a Prowler if it was parked.",
  "Keep trying, soldier... It's adorable!",
  "You're the reason medics earn certs!",
  "Powered by nanites, lovingly created by Nanite Systems",
  "join BHO outfit mate : ) ? we have awsome BHO-teamplay-platoons 5 days out of 7 every week",
  "Don't fear me. I can't hurt you... Yet.",
  "No foot only vehicle",
  "Egg - Schinu",
];

/**
 * @type {string}
 * @description Home url for the bot
 */
module.exports.BOT_URL = "https://kotv.org/";
module.exports.OUTFIT_ID = "37512545478660293";
module.exports.KOTV_LOG_CHANNEL = "699379838322081852";
module.exports.KOTV_VOID_SERVANT_ROLE = "209638552298979328";
module.exports.KOTV_PREACHER_ROLE = "209639437158580225";
module.exports.KOTV_GUEST_ROLE = "218771481054674944";
module.exports.BOT_DEBUG = true;
module.exports.botStartTime = new Date();

/**
 * @param {string} name
 * @returns {Promise<JSON>}
 */
module.exports.fetchAPlanetman = async function (name) {
  const url = `https://census.daybreakgames.com/s:${
    env.CENSUS_KEY
  }/json/get/ps2:v2/character/?name.first_lower=${name.toLowerCase()}&c:join=outfit_member`;

  const response = await fetch(url);

  return response.json();
};

/**
 * @param {string} planetmanId
 * @returns {Promise<JSON>}
 */
module.exports.fetchRealtime = async function (planetmanId) {
  sendDebugMessage("Fetching from realtime API");
  const url = `${env.REALTIME_API}/character/${planetmanId}/honu-data/`;
  sendDebugMessage(`Fetching from ${url}`);
  const response = await fetch(url);
  sendDebugMessage("Fetched from realtime API");
  if (response.status !== 200) {
    sendDebugMessage("Realtime API returned non-200 status code");
    return null;
  }

  return response.json();
};

var _commandCooldown = new Map();

/**
 *
 * @returns {Map}
 */
module.exports.getCommandCooldown = function () {
  return _commandCooldown;
};

/**
 *
 * @param {Map} value
 */
module.exports.setCommandCooldown = function (value) {
  _commandCooldown = value;
};

/**
 * @param {string} key
 * @param {number} value
 */
module.exports.addCommandCooldown = function (key, value) {
  _commandCooldown.set(key, value);
};

this.Start();
