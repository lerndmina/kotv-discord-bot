import { SlashCommandBuilder } from "discord.js";
import { log } from "itsasht-logger";
import linkUserSchema from "../../models/linkUserSchema";
import BasicEmbed from "../../utils/BasicEmbed";
import { fetchApiReturnCharacter, debugMsg } from "../../utils/TinyUtils";
import { OUTFIT_ID } from "../../Bot";
import { CommandOptions, SlashCommandProps } from "commandkit";
const COMMAND_NAME = "info";

export const data = new SlashCommandBuilder()
  .setName(COMMAND_NAME)
  .setDescription("Get info on the user's character from the daybreak census API.")
  .addUserOption((option) =>
    option.setName("user").setDescription("The user to lookup").setRequired(false)
  )
  .setDMPermission(false);

export const options: CommandOptions = {
  devOnly: false,
  deleted: false,
};

export async function run({ interaction, client, handler }: SlashCommandProps) {
  const COOLDOWN_ID = `${COMMAND_NAME}${interaction.user.id}`;
  var user = interaction.options.getUser("user");
  if (!user) {
    user = interaction.user;
  }

  const dbUser = await linkUserSchema.findOne({ discordId: user.id });

  if (!dbUser) {
    interaction.reply({
      content: "This user is not linked to a character.",
      ephemeral: true,
    });
    return;
  }

  await interaction.reply({
    embeds: [
      BasicEmbed(
        client,
        "Fetching Character Info",
        "This may take a few seconds...\n\nIf this takes longer than 30 seconds I've probably crashed or the API is being dog slow. Please try again later.",
        undefined,
        "Yellow"
      ),
    ],
    ephemeral: false,
  });
  const character = await fetchApiReturnCharacter(dbUser.ps2Name);
  if (!character) {
    return interaction.editReply({
      embeds: [
        BasicEmbed(
          client,
          "Api Response Error",
          "The API just returned an invalid response. This happens a lot. Please try again later.",
          undefined,
          "Red"
        ),
      ],
    });
  }
  const inKotv = character.character_id_join_outfit_member.outfit_id == OUTFIT_ID;
  const factionString =
    character.faction_id == 1
      ? "<:vanu:813469839485960222> VS"
      : character.faction_id == 2
      ? "<:nc:813469147010170900> NC"
      : character.faction_id == 3
      ? "<:tr:813469583515189259> TR"
      : "NS";
  const minsPlayed = Math.floor(character.times.minutes_played / 60);

  const fields = [
    {
      name: "Battle Rank",
      value: `Rank: ${character.battle_rank.value}${
        character.prestige_level > 0 ? `, Prestige: ${character.prestige_level}` : ""
      }`,
      inline: false,
    },
    { name: "Faction", value: factionString, inline: false },
    {
      name: "Certs (Lifetime)",
      value: `Balance: \`${character.certs.available_points}\`\nEarned: \`${character.certs.earned_points}\`\nGifted: \`${character.certs.gifted_points}\`\nSpent: \`${character.certs.spent_points}\``,
      inline: false,
    },
    { name: "Playtime", value: `${minsPlayed} hour${minsPlayed > 1 ? "s" : ""}`, inline: false },
    { name: "Times Played", value: `${character.times.login_count}`, inline: false },

    {
      name: "In KOTV?",
      value: inKotv ? `Yes (${character.character_id_join_outfit_member.rank})` : "No",
      inline: false,
    },
  ];

  return interaction.editReply({
    embeds: [BasicEmbed(client, "Character Info", character.name.first, fields)],
  });
}
