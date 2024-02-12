import { SlashCommandBuilder } from "discord.js";
import log from "fancy-log";
import BasicEmbed from "../../utils/BasicEmbed";
import { CommandOptions, SlashCommandProps } from "commandkit";

export const data = new SlashCommandBuilder()
  .setName("therules")
  .setDescription("Tell someone to read the rules.")
  .setDMPermission(true);

export const options: CommandOptions = {
  devOnly: false,
};

export async function run({ interaction, client, handler }: SlashCommandProps) {
  interaction.reply("https://therules.fyi/");
}
