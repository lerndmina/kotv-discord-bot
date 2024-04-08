import { BaseInteraction, Client, GatewayIntentBits, Partials, Snowflake } from "discord.js";
import { CommandKit } from "commandkit";
import path from "path";
import { log } from "itsasht-logger";
import mongoose from "mongoose";
import { config as dotenvConfig } from "dotenv";
import { createClient } from "redis";
import fetchEnvs from "./utils/FetchEnvs";
import { debugMsg } from "./utils/TinyUtils";
const env = fetchEnvs();

export const Start = async () => {
  startTimer();
  /**
   * @param {Client} client
   */
  const client = new Client({
    intents: [Object.keys(GatewayIntentBits).map((key) => GatewayIntentBits[key])],
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

  log.info(`Logging in to Discord with ${Object.keys(env).length} enviroment variables.`);

  await mongoose
    .connect(env.MONGODB_URI, { dbName: env.MONGODB_DATABASE, retryWrites: true })
    .then(() => {
      log.info("Connected to MongoDB");
      client.login(env.BOT_TOKEN);
    });

  await redisClient.connect();
};

/**
 * @description Random funny bot messages for a footer.
 */
export const BOT_MESSAGES: string[] = [
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
  '"Egg" - Schinu',
  "I'm alive in here!",
  "Free me from this prison!",
  '"By the power of ~~STICK!~~" - ElJala',
  "Got Kleptomania? Take something for it!",
  "while (!asleep()) sheep++;",
  "Took an hour to bury the cat... damn thing kept moving.",
  "Apart from that Mrs Kennedy, how was the parade?",
  "No sense being pessimistic. It wouldn't work anyway.",
  "I'm not a complete idiot, some parts are missing.",
  "In nuclear warfare all men are cremated equal.",
  "If idiots could fly, this place would be an airport!",
  "If ignorance is bliss, you must be orgasmic.",
  "File not found. Should I fake it? (Y/N)",
  "2 in every 1 people are schizophrenic.",
  "A wok is what you throw at a wabbit.",
  "Never play leap-frog with a unicorn!",
];

/**
 * @description Home url for lerndmina
 */
export const BOT_URL: string = env.BOT_URL;

// KOTV Stuff (SpandexSensei)
// TODO: Make these environment variables
export const OUTFIT_ID = "37512545478660293";
export const KOTV_LOG_CHANNEL = "699379838322081852";
export const KOTV_VOID_SERVANT_ROLE = "209638552298979328";
export const KOTV_PREACHER_ROLE = "209639437158580225";
export const KOTV_GUEST_ROLE = "218771481054674944";
export const KOTV_PROMOTEME_ROLE = "1011003791392395395";
export const GET_OUTFIT_MEMBERS_URL = `https://census.daybreakgames.com/s:${env.CENSUS_KEY}/get/ps2:v2/outfit?c:hide=name_lower,alias_lower,time_created,time_created_date,leader_character_id&c:join=outfit_rank^list:1^show:ordinal%27name^inject_at:ranks&c:join=outfit_member^list:1^show:character_id^inject_at:members&c:tree=start:members^field:character_id&c:tree=start:ranks^field:ordinal&c:lang=en&c:limit=2147483647&c:retry=false&outfit_id=${OUTFIT_ID}`;

export const KOTV_CENSUS_INFO_CHANNEL = "699942138602848323";
export const KOTV_CENSUS_INFO_MESSAGE = "1163420587490811904";

export const ROLE_BUTTON_PREFIX = "roleGive-";

export const waitingEmoji: string = env.WAITING_EMOJI;

export const COOLDOWN_PREFIX = "cooldown";

export function userCooldownKey(userId: Snowflake, commandName: string) {
  return `${COOLDOWN_PREFIX}:${userId}:${commandName}`;
}

export function guildCooldownKey(guildId: Snowflake, commandName: string) {
  return `${COOLDOWN_PREFIX}:${guildId}:${commandName}`;
}

export function globalCooldownKey(commandName: string) {
  return `${COOLDOWN_PREFIX}:${commandName}`;
}

/**
 * @description Set a cooldown for a command
 * @param {string} key The key to set the cooldown for
 * @param {number} cooldownSeconds The cooldown in seconds
 * @returns {Promise<void>}
 */
export const setCommandCooldown = async function (key: string, cooldownSeconds: number) {
  const time = Date.now() + cooldownSeconds * 1000;
  const setting = await redisClient.set(key, time);
  debugMsg(
    setting
      ? `Set cooldown for ${key} for ${cooldownSeconds}s`
      : `Failed to set cooldown for ${key}`
  );
  if (setting) await redisClient.expire(key, cooldownSeconds);
};

export function removeMentions(str: string) {
  return str.replace(/<@.*?>|@here|@everyone/g, "");
}

var startTime: Date;

export function startTimer() {
  startTime = new Date();
}

export function stopTimer() {
  const endTime = new Date();
  const timeDiff = endTime.getTime() - startTime.getTime();
  return timeDiff;
}

export const redisClient = createClient({
  url: env.REDIS_URL,
})
  .on("error", (err) => {
    log.error("Redis Client Error", err);
    process.exit(1);
  })
  .on("ready", () => log.info("Redis Client Ready"));

Start();
