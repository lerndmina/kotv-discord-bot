import { ContextMenuCommandBuilder, ApplicationCommandType } from "discord.js";
import BasicEmbed from "../../utils/BasicEmbed";
import FetchEnvs from "../../utils/FetchEnvs";
import { MessageContextMenuCommandProps } from "commandkit";
import ParseTimeFromMessage from "../../utils/ParseTimeFromMessage";
const env = FetchEnvs();

export const data = new ContextMenuCommandBuilder()
  .setName("Add Timestamps to Message")
  .setType(ApplicationCommandType.Message)
  .setDMPermission(false);

export const options = {
  devOnly: false,
};

export async function run({ interaction, client, handler }: MessageContextMenuCommandProps) {
  const content = interaction.targetMessage.content;

  const data = ParseTimeFromMessage(content);

  if (!data.success) {
    return interaction.reply({
      content: "I couldn't find a time in that message.",
      ephemeral: true,
    });
  }
  return interaction.reply({
    content: `Converted to timestamp: ⏰ <t:${data.seconds}:F>\n\nUse this in your own message: \`\`\`<t:${data.seconds}:F>\`\`\``,
  });
}
