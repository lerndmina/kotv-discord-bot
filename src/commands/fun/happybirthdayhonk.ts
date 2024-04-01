import type { SlashCommandProps, CommandOptions } from "commandkit";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { log } from "itsasht-logger";
import { globalCooldownKey, setCommandCooldown, userCooldownKey, waitingEmoji } from "../../Bot";
import { ThingGetter, sleep } from "../../utils/TinyUtils";
import FetchEnvs from "../../utils/FetchEnvs";
import Database from "../../utils/data/database";
import HonkBirthdayCounter from "../../models/HonkBirthdayCounter";
import BasicEmbed from "../../utils/BasicEmbed";

const USER_ID = "795726064608608266";

const env = FetchEnvs();

export const data = new SlashCommandBuilder()
  .setName("happybirthdayhonk")
  .setDescription("Wish honk a happy birthday!")
  .setDMPermission(false);

export const options: CommandOptions = {
  devOnly: false,
  deleted: false,
};

export async function run({ interaction, client, handler }: SlashCommandProps) {
  await interaction.reply({ content: waitingEmoji });
  const userId = interaction.user.id;
  const now = Date.now();
  const aprilSecond = new Date("2022-04-02T00:00:00.000Z").getTime();

  if (now < aprilSecond) {
    if (userId != USER_ID && !env.OWNER_IDS.includes(userId))
      return interaction.editReply("<a:PeepoGetfucked:1213269620304126023>");
  }

  setCommandCooldown(globalCooldownKey(interaction.command?.name!), 60);

  const db = new Database();

  let counterData = await db.findOne(HonkBirthdayCounter, { guildId: interaction.guildId });

  if (!counterData || !counterData.count) counterData = { count: 0 };

  let counter = counterData.count + 1;

  await db.findOneAndUpdate(
    HonkBirthdayCounter,
    { guildId: interaction.guild!.id },
    { count: counter }
  );

  setCommandCooldown(userCooldownKey(interaction.user.id, interaction.commandName), 120);

  const getter = new ThingGetter(client);

  const guild = await getter.getGuild(interaction.guildId!);
  if (!guild) return interaction.editReply("Guildonly command ran in non guild context.");

  const member = await getter.getMember(guild, USER_ID);
  if (!guild)
    return interaction.editReply("Member not found in guild, when member ran the command.");

  const messages: string[] = [
    "Happy fish day honk!",
    "Happy Birthday Honk",
    "Happy Birthday Bonk",
    "Happy Birthday honk6969696969696969696969696969",
  ];

  const rand = Math.floor(Math.random() * messages.length);

  // const reply = await interaction.editReply(
  //   `${messages[rand]}` + `\nThis command has been ran ${counter} time(s)\n\n||Blame Schinu...||`
  // );

  interaction.editReply({
    content: "<@1033920199168110602>",
    embeds: [
      BasicEmbed(
        client,
        messages[rand],
        `This command has been ran ${counter} time(s)\n\n||Blame Schinu...||`
      ),
    ],
  });
}
