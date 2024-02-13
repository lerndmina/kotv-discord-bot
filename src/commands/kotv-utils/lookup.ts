import { CommandOptions, SlashCommandProps } from "commandkit";
import {
  ActionRowBuilder,
  ButtonInteraction,
  ChatInputCommandInteraction,
  ModalBuilder,
  ModalSubmitInteraction,
  SlashCommandBuilder,
  SlashCommandIntegerOption,
  TextInputBuilder,
  TextInputStyle,
  User,
} from "discord.js";
import BasicEmbed from "../../utils/BasicEmbed";
import linkUserSchema from "../../models/linkUserSchema";
import { ThingGetter, fetchApiUrl, fetchRealtime } from "../../utils/TinyUtils";
import { log } from "itsasht-logger";
import {
  KOTV_GUEST_ROLE,
  KOTV_VOID_SERVANT_ROLE,
  OUTFIT_ID,
  globalCooldownKey,
  setCommandCooldown,
} from "../../Bot";
import FetchEnvs from "../../utils/FetchEnvs";

const COMMAND_NAME = "lookup";

export const data = new SlashCommandBuilder()
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
  )
  .setDMPermission(true);

export const options: CommandOptions = {
  devOnly: false,
  deleted: false,
};

export async function run({ interaction, client, handler }: SlashCommandProps) {
  const user = interaction.options.getUser("user")!;

  const yeet = interaction.options.getBoolean("yeet");

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

  const fetchRealtime = interaction.options.getBoolean("fetch-realtime");
  if (fetchRealtime) {
    setCommandCooldown(globalCooldownKey(interaction.commandName), 60);

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
}

async function handleUserLookup(
  interaction: ChatInputCommandInteraction,
  user: User,
  usingRealtime: boolean
) {
  if (!interaction.guild)
    return log.error("No guild found in interaction that can only be ran from a guild.");

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

    if (!realtimeData) {
      return interaction.editReply({
        embeds: [
          BasicEmbed(
            interaction.client,
            "Error",
            `There was an error fetching realtime data for user <@${user.id}> \`${user.id}\`. They may have not logged in recently.`
          ),
        ],
      });
    }
    // var newDate = new Date();
    // const lastUpdate = realtimeData.latestEventTimestamp;
    // const lastUpdateForLog = newDate.toUTCString();

    log.info(
      `Got api response for ${fetchedUser.ps2Name} (${fetchedUser.ps2Id}) they last logged in at ${realtimeData.lastLogin}.`
    );

    const lastLogin = new Date(realtimeData.lastLogin);

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
      const getter = new ThingGetter(interaction.client);
      const guildMember = await getter.getMember(interaction.guild, user.id);
      const guestRole = interaction.guild.roles.cache.get(KOTV_GUEST_ROLE);
      const voidServantRole = interaction.guild.roles.cache.get(KOTV_VOID_SERVANT_ROLE);

      const env = FetchEnvs();

      if (!guestRole || !voidServantRole) {
        return interaction.editReply({
          embeds: [
            BasicEmbed(
              interaction.client,
              "Error",
              `Could not find the guest or void servant role. Please contact <@${env.OWNER_IDS[0]}>`
            ),
          ],
        });
      }

      var rank = "Guest";

      if (realtimeIsInKOTV) {
        rank = "Void Servant or higher";
        guildMember.roles.add(voidServantRole).catch((error) => {
          log.error("Error adding void servant role");
          log.info(error);
        });
        guildMember.roles.remove(guestRole).catch((error) => {
          log.error("Error removing guest role");
          log.info(error);
        });
      } else {
        guildMember.roles.add(guestRole).catch((error) => {
          log.error("Error adding guest role");
          log.info(error);
        });
        guildMember.roles.remove(voidServantRole).catch((error) => {
          log.error("Error removing void servant role");
          log.info(error);
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
        log.info("Error updating user in DB");
        log.info(error);
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

async function handleYeet(interaction: ChatInputCommandInteraction, user: User) {
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

  modal.addComponents(actionRow as any);

  interaction.showModal(modal);

  const filter = (interaction: ModalSubmitInteraction) => interaction.customId == MODAL_ID;

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

async function handleAdd(interaction: ChatInputCommandInteraction, user: User, add: string) {
  const dbUser = await linkUserSchema.findOne({ discordId: user.id });

  if (!interaction.guild)
    return log.error("No guild found in interaction that can only be ran from a guild.");

  add = add.toLowerCase();

  if (dbUser) {
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

  fetchApiUrl(add).then(async (data) => {
    // The api nicely tells us how many objects were returned
    if (data.returned == 0) {
      interaction.reply({
        content: `Character ${add} does not exist!`,
        ephemeral: true,
      });
      return;
    }
    var character;
    if (data.character_list[0]) {
      character = data.character_list[0];
    } else {
      interaction.reply({
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

    const getter = new ThingGetter(interaction.client);

    const guildmember = await getter.getMember(interaction.guild!, user.id);

    if (!isInKOTV) {
      return interaction.reply({
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

    const voidServantRole = interaction.guild!.roles.cache.get(KOTV_VOID_SERVANT_ROLE)!;

    var errormsg = "";

    guildmember.roles.add(voidServantRole).catch((error) => {
      const env = FetchEnvs();
      log.error("Error adding void servant role");
      log.info(error);
      errormsg = `\n\nError adding void servant role, please contact <@${env.OWNER_IDS[0]}>`;
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
