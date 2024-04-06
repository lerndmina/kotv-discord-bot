import { SlashCommandProps } from "commandkit";
import { ChannelType, GuildTextBasedChannel } from "discord.js";
import { debugMsg } from "../../utils/TinyUtils";
import { messageAttachmentProcessor } from "../../commands/utilities/message";

export default async function ({ interaction, client, handler }: SlashCommandProps) {
  const attachment = interaction.options.getAttachment("data");
  const channelOption = interaction.options.getChannel("channel");
  if (!channelOption) throw new Error("No channel provided.");
  if (channelOption.type !== ChannelType.GuildText) throw new Error("Invalid channel type.");
  const channel = channelOption as GuildTextBasedChannel;
  if (!attachment) throw new Error("No data provided.");
  if (!channelOption) throw new Error("No channel provided.");

  const data = await messageAttachmentProcessor(attachment);

  interaction.editReply(data);
}
