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
  if (userId != USER_ID && !env.OWNER_IDS.includes(userId))
    return interaction.editReply("<a:PeepoGetfucked:1213269620304126023>");

  const db = new Database();

  const counterData = await db.findOne(HonkBirthdayCounter, { guildId: interaction.guildId });

  let counter = counterData.count + 1;

  await db.findOneAndUpdate(
    HonkBirthdayCounter,
    { guildId: interaction.guild!.id },
    { count: counter }
  );

  setCommandCooldown(userCooldownKey(interaction.user.id, interaction.commandName), 120);

  const getter = new ThingGetter(client);

  const member = await getter.getMember(await getter.getGuild(interaction.guildId!), USER_ID);

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
    content: "",
    embeds: [
      BasicEmbed(
        client,
        messages[rand],
        `This command has been ran ${counter} time(s)\n\n||Blame Schinu...||`
      ),
    ],
  });
}
