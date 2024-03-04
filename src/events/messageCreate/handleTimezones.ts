import { ButtonBuilder, ButtonStyle, ChannelType, Client, Message, MessageType } from "discord.js";
import log from "fancy-log";
import ParseTimeFromMessage from "../../utils/ParseTimeFromMessage";
import BasicEmbed from "../../utils/BasicEmbed";
import { ThingGetter, sleep } from "../../utils/TinyUtils";
import ButtonWrapper from "../../utils/ButtonWrapper";

export default async function (message: Message, client: Client<true>) {
  if (message.author.bot) return;
  if (message.channel.type != ChannelType.GuildText) return;
  if (
    message.type === MessageType.Reply &&
    !message.author.bot &&
    message.mentions.has(client.user.id)
  )
    handleReplyTrigger(message, client);
  const colonMatches = (message.content.match(/:/g) || []).length;
  const slashMatches = (message.content.match(/\//g) || []).length;
  if (!(colonMatches === 1 && slashMatches === 2)) return;
  if (message.content.includes("http")) return;

  log.info("Processing message for time. . .");

  const data = ParseTimeFromMessage(message);

  if (!data.success) {
    return false;
  }

  log("We found a time! Parsed time: " + data.date);

  // const embed = BasicEmbed(
  //   client,
  //   "Found Time!",
  //   // prettier-ignore
  //   `This looks like a time! I've parsed it as: <t:${data.seconds}:F> \nIf you want to send timestamps yourself, you can!\n Just use \`/getTime\` and I'll return you a discord timestamp from your message. \n\nI'll remove the embed in 60s and leave the timestamp.\n\nHere's some more details about this, in case something is wrong. . .\n\`\`\`json\n${JSON.stringify(data, null ,2)}\`\`\``
  // );

  const buttons = ButtonWrapper([
    new ButtonBuilder()
      .setCustomId("deleteMe-" + message.author.id)
      .setLabel("Delete Me")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("🗑️"),
    new ButtonBuilder()
      .setURL("https://hammertime.cyou/en-GB?t=" + data.seconds)
      .setLabel("Edit this timestamp")
      .setStyle(ButtonStyle.Link),
  ]);

  const content = `Converted to timestamp: ⏰ <t:${data.seconds}:F>\n\nUse this in your own message: \`\`\`<t:${data.seconds}:F>\`\`\``;

  await message.reply({ content, components: buttons });

  // sleep(60 * 1000).then(() => {
  //   try {
  //     reply.edit({ content, embeds: [] });
  //   } catch (error) {
  //     // We don't care if this fails, it's just a cleanup.
  //   }
  // });

  return false;
}

async function handleReplyTrigger(reply: Message, client: Client<true>) {
  if (reply.channel.type != ChannelType.GuildText) return;
  console.log("Mentions: ", reply.mentions.users.size);
  const messageId = reply.reference?.messageId;
  if (!messageId) return;
  const originalMessage = await reply.channel.messages.fetch(messageId);
  if (!originalMessage) return;
  if (originalMessage.author.bot) return;

  console.log("Original message: ", originalMessage.content);

  const data = ParseTimeFromMessage(originalMessage);

  if (!data.success) {
    return false;
  }

  originalMessage.reply({
    content: `⏰ <t:${data.seconds}:F>\n\nRequested by <@${reply.author.id}>`,
    allowedMentions: { repliedUser: false },
  });

  try {
    await reply.delete();
  } catch (error) {
    // We don't care if this fails, it's just a cleanup.
  }
}
