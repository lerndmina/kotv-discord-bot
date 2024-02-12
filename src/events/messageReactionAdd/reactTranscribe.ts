import {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  Partials,
  MessageType,
  MessageFlags,
  ActivityType,
  ChannelType,
  MessageReaction,
  User,
  ThreadChannel,
} from "discord.js";
import log from "fancy-log";
import TranscribeMessage from "../../utils/TranscribeMessage";
import FetchEnvs from "../../utils/FetchEnvs";
import BasicEmbed from "../../utils/BasicEmbed";
import DeleteMessage from "../../utils/DeleteMessage";
import logger from "fancy-log";

const env = FetchEnvs();

var alreadyProcessed = false;
export default async function (reaction: MessageReaction, user: User, client: Client<true>) {
  if (reaction.message.channel instanceof ThreadChannel) return; // Ignore threads
  if (reaction.partial) await reaction.fetch(); // Fetch the reaction
  const message = await reaction.message.fetch(); // Fetch the messag

  if (user.bot) return;

  logger(`[MESSAGE REACTION ADD] ${user.tag} reacted ${reaction.emoji} to a message.`);

  if (message.flags.bitfield != MessageFlags.IsVoiceMessage || message.attachments.size != 1)
    return;

  if (reaction.emoji.name != "✍️" && reaction.emoji.name != "❌") {
    reaction.users.remove(user.id);
    return;
  }

  if (user.id != message.author.id) {
    reaction.users.remove(user.id);
    return;
  }

  // if a valid reacion has been added but the bot is not in the list of reactors, stop. As this means the bot has probably already processed the message.
  for (const [reactionString, reactionObj] of message.reactions.cache) {
    if (!reactionObj.me && (reactionString == "✍️" || reactionString == "❌")) {
      alreadyProcessed = true;
    }
  }

  if (alreadyProcessed) {
    const replyMsg = await message.reply({
      embeds: [
        BasicEmbed(client, "Error", "I've already processed this voice message.", undefined, "Red"),
      ],
    });

    DeleteMessage(replyMsg, 5000);
    return;
  }

  if (reaction.emoji.name == "❌") {
    await message.reactions.removeAll();
    return;
  }

  log(`[MESSAGE REACTION ADD] ${user.tag} reacted ${reaction.emoji} to a voice message.`);

  // If the reaction is ✍️ begin transcribing
  if (reaction.emoji.name == "✍️") {
    const resultBool = await TranscribeMessage(client, message, env.OPENAI_API_KEY);
    await message.reactions.removeAll();
    if (!resultBool) return;
    await message.react("✅");
  }
}
