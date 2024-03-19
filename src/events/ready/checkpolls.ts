import { ChannelType, Message, type Client } from "discord.js";
import type { CommandKit } from "commandkit";
import PollsSchema, { PollsType } from "../../models/PollsSchema";
import Database from "../../utils/data/database";
import { ThingGetter, debugMsg, sleep } from "../../utils/TinyUtils";
import { log } from "itsasht-logger";
import { endPoll } from "../interactionCreate/poll-interaction";
/**
 *
 * @param {Client} c
 * @param {Client} client
 */
export default async (c: Client<true>, client: Client<true>, handler: CommandKit) => {
  await sleep(500);

  const db = new Database();
  const getter = new ThingGetter(client);
  const polls = await PollsSchema.find();
  if (!polls) return log.info("No polls found in the database.");

  for (const poll of polls) {
    if (!poll) continue;
    if (poll.hasFinished) {
      purgeStalePoll(poll, db, client);
      continue;
    }
    if (new Date(poll.endsAt).getTime() < Date.now()) {
      poll.hasFinished = true;
      await db.findOneAndUpdate(PollsSchema, { pollId: poll.pollId }, poll);
    } else waitForPollEnd(poll, db, client, getter);
  }
  return;
};

async function purgeStalePoll(poll: PollsType, db: Database, client: Client<true>) {
  const ONE_DAY = 1000 * 60 * 60 * 24;
  const pollEndTime = new Date(poll.endsAt).getTime();
  if (pollEndTime + ONE_DAY < Date.now()) {
    log.info(`Purging stale poll: ${poll.question} - ${poll.pollId}`);
    db.findOneAndDelete(PollsSchema, { pollId: poll.pollId });
  }
}

export async function waitForPollEnd(
  poll: PollsType,
  db: Database,
  client: Client<true>,
  getter: ThingGetter
) {
  const pollEndTime = new Date(poll.endsAt).getTime();

  log.info(
    `Waiting for poll to end: ${poll.question} - ${poll.pollId} - ${pollEndTime - Date.now()}`
  );
  const channel = await getter.getChannel(poll.channelId);
  if (!channel || channel.type !== ChannelType.GuildText)
    return log.error(`Channel not found: ${poll.channelId}, unable to end poll.`);

  let message: Message;
  try {
    message = await channel.messages.fetch(poll.messageId);
  } catch (error) {
    log.error(`Message not found: ${poll.messageId}, unable to end poll.`);
    return;
  }
  await new Promise((resolve) => {
    setTimeout(async () => {
      endPoll(client, poll.pollId, message, db);
      resolve(true);
    }, pollEndTime - Date.now());
  });
}
