const { SlashCommandBuilder } = require("discord.js");
const log = require("fancy-log");
const fetchAPIReturnCharacter = require("../../utils/fetchAPIReturnCharacter");
const linkUserSchema = require("../../models/linkUserSchema");
const { debugMsg } = require("../../utils/debugMsg");
const BasicEmbed = require("../../utils/BasicEmbed");
const {
  OUTFIT_ID,
  getCommandCooldown,
  setCommandCooldown,
  addCommandCooldown,
} = require("../../Bot");
const COMMAND_NAME = "info";

module.exports = {
  data: new SlashCommandBuilder()
    .setName(COMMAND_NAME)
    .setDescription("Get info on the user's character from the daybreak census API.")
    .addUserOption((option) =>
      option.setName("user").setDescription("The user to lookup").setRequired(false)
    ),
  options: {
    devOnly: false,
    deleted: false,
    guildOnly: true,
  },
  run: async ({ interaction, client, handler }) => {
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

    addCommandCooldown(COOLDOWN_ID, 10_000);
    const character = await fetchAPIReturnCharacter(dbUser.ps2Name);
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

    return interaction.reply({
      embeds: [BasicEmbed(client, "Character Info", character.name.first, fields)],
      ephemeral: false,
    });
  },
};
