import { SlashCommandBuilder } from "discord.js";
import BasicEmbed from "../../utils/BasicEmbed";
import { userMention } from "discord.js";
import { CommandOptions, SlashCommandProps } from "commandkit";
import { returnMessage } from "../../utils/TinyUtils";

export const data = new SlashCommandBuilder()
  .setName("poke")
  .setDescription("Mention a user")
  .setDMPermission(false)
  .addUserOption((option) =>
    option.setName("user").setDescription("The user to mention").setRequired(true)
  )
  .addStringOption((option) =>
    option.setName("message").setDescription("The message to send").setRequired(false)
  );

export const options: CommandOptions = {
  devOnly: false,
  deleted: false,
};

export async function run({ interaction, client, handler }: SlashCommandProps) {
  const user = interaction.options.getUser("user");
  const text = interaction.options.getString("message");
  if (!user || !text)
    return returnMessage(
      interaction,
      client,
      "Interaction Errror",
      "Please mention a user and provide a message",
      { error: true, firstMsg: true }
    );

  const embed = BasicEmbed(
    client,
    "Poke! 👉",
    `${userMention(interaction.user.id)} poked you! ${text ? `\n\n\`${text}\`` : ""}`,
    undefined,
    "#0099ff"
  );

  await interaction.reply({
    content: `Hello ${userMention(user.id)}`,
    embeds: [embed],
    ephemeral: false,
  });
}
