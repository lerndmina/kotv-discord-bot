import type { SlashCommandProps, CommandOptions } from "commandkit";
import { EmbedField, SlashCommandBuilder } from "discord.js";
import { log } from "itsasht-logger";
import BasicEmbed from "../../utils/BasicEmbed";
import { KOTV_PROMOTEME_ROLE } from "../../Bot";
const COMMAND_NAME = "require-promotion";

export const data = new SlashCommandBuilder()
  .setName(COMMAND_NAME)
  .setDescription("Get users who have the promoteme role and have not been promoted yet.")
  .setDMPermission(false);

export const options: CommandOptions = {
  devOnly: false,
  deleted: false,
};

export async function run({ interaction, client, handler }: SlashCommandProps) {
  /**
   * @type {Guild}
   */
  const guild = interaction.guild!;

  /**
   * @type {Role}
   */
  const role = guild.roles.cache.get(KOTV_PROMOTEME_ROLE);
  if (!role)
    return interaction.reply({ content: "KOTV_PROMOTEME_ROLE not found.", ephemeral: true });
  const members = role.members;

  var fields: EmbedField[] = [];

  members.forEach((member) => {
    fields.push({
      name: member.user.username,
      value: `<@${member.user.id}>`,
      inline: true,
    });
  });

  const embed = BasicEmbed(
    client,
    "Promoteme List",
    `${
      fields.length > 0
        ? `Here are the users who have the <@&${KOTV_PROMOTEME_ROLE}> role.`
        : `No users found for promotion.`
    }`,
    fields.length > 0 ? fields : undefined,
    "Green"
  );

  interaction.reply({
    embeds: [embed],
    ephemeral: true,
  });
}
