import { SlashCommandProps } from "commandkit";
import { ChannelType, GuildTextBasedChannel, Message, MessageCreateOptions } from "discord.js";
import { debugMsg } from "../../utils/TinyUtils";
import { messageAttachmentProcessor } from "../../commands/utilities/message";

export default async function ({ interaction, client, handler }: SlashCommandProps) {
  const attachment = interaction.options.getAttachment("data");
  const shortLink = interaction.options.getString("short-link");
  const channelOption = interaction.options.getChannel("channel");
  if (!channelOption) throw new Error("No channel provided.");
  const channel = channelOption as GuildTextBasedChannel;
  if (!channelOption) throw new Error("No channel provided.");

  const data = await messageAttachmentProcessor(attachment!, shortLink!);

  interaction.editReply(`Sending message to ${channel.name}...`);
  await channel.send(data as MessageCreateOptions);
}
