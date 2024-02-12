import { ChannelType, ForumChannel, SlashCommandBuilder, ThreadChannel } from "discord.js";
import BasicEmbed from "../../utils/BasicEmbed";
import Modmail from "../../models/Modmail";
import { waitingEmoji } from "../../Bot";
import { ThingGetter } from "../../utils/TinyUtils";
import Database from "../../utils/cache/database";
import log from "fancy-log";
import { CommandOptions, SlashCommandProps } from "commandkit";

export const data = new SlashCommandBuilder()
  .setName("close")
  .setDescription("Close a modmail thread")
  .setDMPermission(true)
  .addStringOption((option) =>
    option
      .setName("reason")
      .setDescription("The reason for closing the modmail thread")
      .setRequired(false)
  );

export const options: CommandOptions = {
  devOnly: false,
  deleted: false,
  botPermissions: ["Administrator"],
};

export async function run({ interaction, client, handler }: SlashCommandProps) {
  if (!interaction.channel)
    return log.error("Request made to slash command without required values - close.ts");

  const getter = new ThingGetter(client);
  const reason = interaction.options.getString("reason") || "No reason provided";

  var mail = await Modmail.findOne({ forumThreadId: interaction.channel.id });
  if (!mail && interaction.channel.type === ChannelType.DM)
    mail = await Modmail.findOne({ userId: interaction.user.id });
  if (!mail) {
    return interaction.reply({
      embeds: [
        BasicEmbed(client, "‼️ Error", "This channel is not a modmail thread.", undefined, "Red"),
      ],
      ephemeral: true,
    });
  }

  await interaction.reply(waitingEmoji);

  const forumThread = (await getter.getChannel(mail.forumThreadId)) as ThreadChannel;
  try {
    const webhook = await client.fetchWebhook(mail.webhookId, mail.webhookToken);
    webhook.delete();
  } catch (error) {
    log.error("Webhook missing, probably already deleted.");
  }
  const embed = BasicEmbed(
    client,
    "Modmail Closed",
    `This modmail thread has been closed.\n\nReason: ${reason}\n\nYou can open a modmail by sending another message to the bot.`,
    undefined,
    "Red"
  );

  await forumThread.send({
    embeds: [embed],
  });

  (await getter.getUser(mail.userId)).send({
    embeds: [embed],
  });
  forumThread.setArchived(true, reason);

  const db = new Database();
  await db.deleteOne(Modmail, { forumThreadId: forumThread.id });
  await db.cleanCache("Modmail:userId:*");
  await interaction.editReply("🎉 Successfully closed modmail thread!");
}
