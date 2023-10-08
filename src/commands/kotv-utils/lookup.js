const {
  SlashCommandBuilder,
  CommandInteraction,
  User,
  ModalBuilder,
  TextInputBuilder,
  ActionRowBuilder,
  TextInputStyle,
  ButtonInteraction,
} = require("discord.js");
const log = require("fancy-log");
const BasicEmbed = require("../../utils/BasicEmbed");
const linkUserSchema = require("../../models/linkUserSchema");
const { client } = require("tenorjs");
const {
  fetchRealtime,
  getCommandCooldown,
  OUTFIT_ID,
  KOTV_GUEST_ROLE,
  KOTV_VOID_SERVANT_ROLE,
  fetchAPlanetman,
} = require("../../Bot");
const FetchEnvs = require("../../utils/FetchEnvs")();
const COMMAND_NAME = "lookup";

module.exports = {
  data: new SlashCommandBuilder()
    .setName(COMMAND_NAME)
    .setDescription("lookup a character with the daybreak census api")
    .addUserOption((option) =>
      option.setName("user").setDescription("The user to lookup").setRequired(true)
    )
    .addBooleanOption((option) =>
      option.setName("yeet").setDescription("Delete a user from the DB").setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("add")
        .setDescription("The character to add to this discord user")
        .setRequired(false)
    )
    .addBooleanOption((option) =>
      option.setName("fetch-realtime").setDescription("Fetch realtime data.").setRequired(false)
    ),
  options: {
    devOnly: false,
    deleted: false,
    guildOnly: true,
  },
  run: async ({ interaction, client, handler }) => {
    /** @type {User} */
    const user = interaction.options.getUser("user");

    /** @type {boolean} */
    const yeet = interaction.options.getBoolean("yeet");

    /** @type {string} */
    const add = interaction.options.getString("add");

    if (yeet && add) {
      return await interaction.reply({
        embeds: [
          BasicEmbed(
            client,
            "Error",
            `You cannot use the \`yeet\` and \`add\` options at the same time.`
          ),
        ],
        ephemeral: true,
      });
    }

    if (yeet) {
      return await handleYeet(interaction, user);
    }

    if (add) {
      return await handleAdd(interaction, user, add);
    }

    var usingRealtime = false;

    /** @type {boolean} */
    const fetchRealtime = interaction.options.getBoolean("fetch-realtime");
    if (fetchRealtime) {
      if (getCommandCooldown().has("realtime")) {
        time = getCommandCooldown().get("realtime");

        if (time > Date.now()) {
          return interaction.reply({
            embeds: [
              BasicEmbed(
                client,
                "Command on cooldown",
                `This command uses an API, very kindly provided by honu-bot. I have implemented a ratelimit to prevent hitting their servers too hard. Please wait 5 seconds to use this command again.`,
                "Red"
              ),
            ],
            ephemeral: true,
          });
        }
      }

      getCommandCooldown().set("realtime", Date.now() + 5000);

      usingRealtime = true;
    }

    await interaction.reply({
      embeds: [
        BasicEmbed(
          client,
          "<a:waiting:1160317632420003900> Fetching data",
          `Feching data for user <@${user.id}>`
        ),
      ],
      ephemeral: true,
    });
    await handleUserLookup(interaction, user, usingRealtime);
  },
};

/**
 *
 * @param {ButtonInteraction} interaction
 * @param {User} user
 * @param {boolean} usingRealtime
 */
async function handleUserLookup(interaction, user, usingRealtime) {
  const fetchedUser = await linkUserSchema.findOne({ discordId: user.id });

  if (!fetchedUser) {
    return interaction.editReply({
      embeds: [
        BasicEmbed(
          interaction.client,
          "User not found",
          `User <@${user.id}> \`${user.id}\` is not linked to a Planetside 2 character.`
        ),
      ],
      ephemeral: true,
    });
  }

  var fields = [
    { name: "Character", value: `\`${fetchedUser.ps2Name}\``, inline: false },
    { name: "Character ID", value: `\`${fetchedUser.ps2Id}\``, inline: false },
    { name: "Is in KOTV", value: `\`${fetchedUser.isInKOTV}\``, inline: false },
    { name: "KOTV Rank", value: `\`${fetchedUser.kotvRank}\``, inline: false },
  ];

  if (usingRealtime) {
    const realtimeData = await fetchRealtime(fetchedUser.ps2Id);
    log.info(
      `Got api response for ${fetchedUser.ps2Name} (${fetchedUser.ps2Id}) they last logged in at ${realtimeData.dateLastLogin} this data was updated ${realtimeData.lastUpdated}`
    );

    if (!realtimeData) {
      return interaction.editReply({
        embeds: [
          BasicEmbed(
            interaction.client,
            "Error",
            `There was an error fetching realtime data for user <@${user.id}> \`${user.id}\`. They may have not logged in recently.`
          ),
        ],
        ephemeral: true,
      });
    }

    lastLogin = new Date(realtimeData.lastLogin);

    const timestamp = Math.floor(lastLogin.getTime() / 1000);
    fields.push({
      name: "Last Login",
      value: `<t:${timestamp}:R>`,
      inline: false,
    });

    const realtimeIsInKOTV = realtimeData.outfitID == OUTFIT_ID;

    fields[2] = {
      name: "Is in KOTV",
      value: `\`${realtimeIsInKOTV}\``,
      inline: false,
    };

    if (fetchedUser.isInKOTV != realtimeIsInKOTV) {
      const guildMember = interaction.guild.members.cache.get(interaction.user.id);
      const guestRole = interaction.guild.roles.cache.get(KOTV_GUEST_ROLE);
      const voidServantRole = interaction.guild.roles.cache.get(KOTV_VOID_SERVANT_ROLE);

      var rank = "Guest";

      if (realtimeIsInKOTV) {
        rank = "Void Servant or higher";
        guildMember.roles.add(voidServantRole).catch((error) => {
          log.error("Error adding void servant role");
          log(error);
        });
        guildMember.roles.remove(guestRole).catch((error) => {
          log.error("Error removing guest role");
          log(error);
        });
      } else {
        guildMember.roles.add(guestRole).catch((error) => {
          log.error("Error adding guest role");
          log(error);
        });
        guildMember.roles.remove(voidServantRole).catch((error) => {
          log.error("Error removing void servant role");
          log(error);
        });
      }

      fields.push({
        name: "Data mismatch",
        value: `The data in the database does not match the realtime data. I have updated the database to reflect the realtime data.`,
        inline: false,
      });

      fields[3] = {
        name: "KOTV Rank",
        value: `\`${rank}\``,
        inline: false,
      };

      try {
        await linkUserSchema.findOneAndUpdate(
          { discordId: user.id },
          { isInKOTV: realtimeIsInKOTV, kotvRank: rank }
        );
      } catch (error) {
        log("Error updating user in DB");
        log(error);
      }
    }
  }

  return interaction.editReply({
    embeds: [
      BasicEmbed(
        interaction.client,
        "User found",
        `User <@${user.id}> \`${user.id}\` is linked to a Planetside 2 character.`,
        fields
      ),
    ],
  });
}

/**
 *
 * @param {ButtonInteraction} interaction
 * @param {User} user
 */
async function handleYeet(interaction, user) {
  const MODAL_ID = "yeet-modal" + interaction.user.id;
  const MODAL_INPUT_ID = "yeet-input" + interaction.user.id;

  const modal = new ModalBuilder().setCustomId(MODAL_ID).setTitle("Are you sure?");

  const languageInput = new TextInputBuilder()
    .setCustomId(MODAL_INPUT_ID)
    .setLabel(`Type "yeet" to confirm yeeting.`)
    .setMinLength(1)
    .setMaxLength(4)
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("yeet");

  const actionRow = new ActionRowBuilder().addComponents(languageInput);

  modal.addComponents(actionRow);

  interaction.showModal(modal);

  const filter = (interaction) => interaction.customId == MODAL_ID;

  await interaction
    .awaitModalSubmit({ filter: filter, time: 30000 })
    .then(async (i) => {
      const input = i.fields.getTextInputValue(MODAL_INPUT_ID);

      if (input.toLowerCase() != "yeet") {
        return await i.reply({
          embeds: [
            BasicEmbed(i.client, "Yeet cancelled", `Yeeting <@${user.id}> has been cancelled.`),
          ],
          ephemeral: true,
        });
      }

      await linkUserSchema.findOneAndDelete({ discordId: user.id });

      log.info(`Yeeted user ${user.username} (${user.id}) from the database.`);

      return await i.reply({
        embeds: [
          BasicEmbed(
            i.client,
            "Yeeted",
            `${i.user.username} yeeted <@${user.id}> from the database.`
          ),
        ],
        ephemeral: true,
      });
    })
    .catch(async (error) => {
      return await interaction.reply({
        embeds: [
          BasicEmbed(
            interaction.client,
            "Yeet cancelled",
            `Yeeting ${user.username} has been cancelled.`
          ),
        ],
        ephemeral: true,
      });
    });
}

/**
 *
 * @param {ButtonInteraction} interaction
 * @param {User} user
 * @param {string} add
 */
async function handleAdd(interaction, user, add) {
  const userExists = await linkUserSchema.findOne({ discordId: user.id });

  add = add.toLowerCase();

  if (userExists) {
    return await interaction.reply({
      embeds: [
        BasicEmbed(
          interaction.client,
          "Error",
          `User <@${user.id}> \`${user.id}\` is already linked to a Planetside 2 character.`
        ),
      ],
      ephemeral: true,
    });
  }

  fetchAPlanetman(add).then(async (data) => {
    // The api nicely tells us how many objects were returned
    if (data.returned == 0) {
      await i.editReply({
        content: `Character ${add} does not exist!`,
        ephemeral: true,
      });
      return;
    }
    var character;
    if (data.character_list[0]) {
      character = data.character_list[0];
    } else {
      i.editReply({
        content: `API returned malformed data. Please try again later.`,
        ephemeral: true,
      });
      return;
    }

    const id = character.character_id;
    const fetchedNamePretty = character.name.first;
    const lastLogin = character.times.last_login;
    var isInKOTV;
    if (character.character_id_join_outfit_member) {
      isInKOTV = character.character_id_join_outfit_member.outfit_id === OUTFIT_ID;
    } else {
      isInKOTV = false;
    }
    const guildmember = interaction.guild.members.cache.get(user.id);

    if (!isInKOTV) {
      return await interaction.reply({
        embeds: [
          BasicEmbed(
            interaction.client,
            "Error",
            `This command is intended to add those who are already in KOTV. Guests should use the button interaction.`
          ),
        ],
        ephemeral: true,
      });
    }

    const rank = character.character_id_join_outfit_member.rank;

    const linkUser = new linkUserSchema({
      discordId: user.id,
      ps2Id: id,
      ps2Name: fetchedNamePretty,
      isInKOTV: isInKOTV,
      kotvRank: rank,
    });

    await linkUser.save();

    const voidServantRole = interaction.guild.roles.cache.get(KOTV_VOID_SERVANT_ROLE);

    var errormsg = "";

    guildmember.roles.add(voidServantRole).catch((error) => {
      log.error("Error adding void servant role");
      log(error);
      errormsg = `\n\nError adding void servant role, please contact <@${FetchEnvs.OWNER_IDS[0]}>`;
    });

    interaction.reply({
      embeds: [
        BasicEmbed(
          interaction.client,
          "User added",
          `User <@${user.id}> has been associated with Planetside2 character ${fetchedNamePretty} \`${id}\`` +
            errormsg
        ),
      ],
      ephemeral: true,
    });
  });
}
