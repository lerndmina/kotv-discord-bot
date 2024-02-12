import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import BasicEmbed from "../../utils/BasicEmbed";
import { CommandOptions, SlashCommandProps } from "commandkit";
import { log } from "console";
const permission = PermissionFlagsBits;

export const data = new SlashCommandBuilder()
  .setName("massdelete")
  .setDescription("Deletes X number of messages from the channel.")
  .setDMPermission(false)
  .addIntegerOption((option) =>
    option.setName("number").setDescription("Number of messages to delete").setRequired(true)
  );

export const options: CommandOptions = {
  devOnly: false,
  userPermissions: ["ManageMessages"],
  botPermissions: ["ManageMessages"],
};

export async function run({ interaction, client, handler }: SlashCommandProps) {
  var number = interaction.options.getInteger("number")!;
  if (!number || !interaction.channel || !interaction.inGuild())
    return log("Required interaction parameters are missing.");
  if (number > 100) {
    await interaction.reply({
      content: "You cannot delete more than 100 messages at a time.",
      ephemeral: true,
    });
    return;
  }
  if (number < 1) {
    await interaction.reply({
      content: "You cannot delete less than 1 message at a time.",
      ephemeral: true,
    });
    return;
  }

  // Grab the messages from the channel
  const messages = await interaction.channel.messages.fetch({ limit: number });
  // write them to a text file and upload it to the success message
  var messageString = "";
  messages.forEach((message) => {
    messageString += `${message.author.username}#${message.author.discriminator} (${message.author.id}) - ${message.content}\n`;
  });

  await interaction.channel.bulkDelete(number);
  await interaction.reply({
    embeds: [
      BasicEmbed(
        interaction.client,
        `Purged Mesages`,
        `Deleted ${number} messages in <#${interaction.channel.id}>`
      ),
    ],
    files: [{ attachment: Buffer.from(messageString), name: "purged_messages.txt" }],
    ephemeral: true,
  });
}
