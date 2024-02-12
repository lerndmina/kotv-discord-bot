import type { SlashCommandProps, CommandOptions } from "commandkit";
import { ButtonBuilder, ButtonStyle, SlashCommandBuilder, TextChannel } from "discord.js";
import log from "fancy-log";
import {
  KOTV_GUEST_ROLE,
  KOTV_VOID_SERVANT_ROLE,
  globalCooldownKey,
  setCommandCooldown,
  waitingEmoji,
} from "../../Bot";
import BasicEmbed from "../../utils/BasicEmbed";
import ButtonWrapper from "../../utils/ButtonWrapper";
const COMMAND_NAME = "post-vs-message";

export const data = new SlashCommandBuilder()
  .setName(COMMAND_NAME)
  .setDescription("lookup a character with the daybreak census api")
  .addChannelOption((option) =>
    option.setName("channel").setDescription("The channel to post the message in").setRequired(true)
  )
  .setDMPermission(false);

export const options: CommandOptions = {
  devOnly: false,
  deleted: false,

  botPermissions: ["ManageRoles"],
};

export async function run({ interaction, client, handler }: SlashCommandProps) {
  await interaction.reply({ content: waitingEmoji, ephemeral: true });
  setCommandCooldown(globalCooldownKey(COMMAND_NAME), 60);

  const channel = interaction.options.getChannel("channel")! as TextChannel;
  // @ts-ignore
  if (!channel.isText()) return interaction.editReply({ content: "Invalid channel" });

  const buttons = [
    new ButtonBuilder()
      .setCustomId("kotv-link")
      .setLabel("I'm in KOTV!")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("<:KOTV:1152263254656159816>"),
    new ButtonBuilder()
      .setCustomId("kotv-link-guest")
      .setLabel("I'm a guest!")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("<:pinkheart:1160313955848290304>"),
  ];

  const embed = BasicEmbed(
    client,
    "Get your role!",
    `Hello recruit! Click the button below and link your PlanetSide 2 account.\n\nIf you are in KOTV, you will be given the <@&${KOTV_VOID_SERVANT_ROLE}> role.\n\nGuests are welcome too! If you are a guest, link your account and you will be given the <@&${KOTV_GUEST_ROLE}> role.`
  );

  channel.send({ embeds: [embed], components: ButtonWrapper(buttons) });

  interaction.editReply({
    embeds: [BasicEmbed(client, "Success!", "Message sent!")],
  });
}
