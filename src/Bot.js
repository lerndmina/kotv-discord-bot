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
  "⚡ Powered by logic, love and a dash of lunacy.",
];

/**
 * @type {string[]}
 * @description Home url for the bot
 */
module.exports.BOT_URL = "https://kotv.org/";
module.exports.OUTFIT_ID = "37512545478660293";
module.exports.KOTV_LOG_CHANNEL = "1158482626059960501";
module.exports.KOTV_VOID_SERVANT_ROLE = "1131268637932658688";
module.exports.KOTV_PREACHER_ROLE = "1159484605959770222";
module.exports.fetchAPlanetman = async function (name) {
  const url = `https://census.daybreakgames.com/s:example/json/get/ps2:v2/character/?name.first_lower=${name.toLowerCase()}&c:join=outfit_member`;

  const response = await fetch(url);

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

this.Start();
