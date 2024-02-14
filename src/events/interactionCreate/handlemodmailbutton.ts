import {
  ButtonBuilder,
  ButtonStyle,
  Client,
  EmbedBuilder,
  MessageComponentInteraction,
} from "discord.js";
import { MODMAIL_BUTTON_ID } from "../../commands/modmail/modmailbutton";
import {
  globalCooldownKey,
  redisClient,
  setCommandCooldown,
  userCooldownKey,
  waitingEmoji,
} from "../../Bot";
import { getCooldown, hasCooldownBypass } from "../../validations/cooldowns";
import { debugMsg } from "../../utils/TinyUtils";
import BasicEmbed from "../../utils/BasicEmbed";
import FetchEnvs from "../../utils/FetchEnvs";
import ButtonWrapper from "../../utils/ButtonWrapper";

export default async (interaction: MessageComponentInteraction, client: Client<true>) => {
  if (!interaction.customId) return;
  if (!interaction.isButton()) return;
  if (!interaction.customId.startsWith(MODMAIL_BUTTON_ID)) return;

  await interaction.reply({ content: waitingEmoji, ephemeral: true });

  const cooldownSeconds = await getCooldown(
    userCooldownKey(interaction.user.id, MODMAIL_BUTTON_ID)
  );
  if (cooldownSeconds && !(await hasCooldownBypass(interaction)))
    return interaction.editReply({
      content: `You're on cooldown for this interaction you will be able to use this interaction <t:${cooldownSeconds}:R>`,
    });

  const user = interaction.user;
  const channel = await user.createDM();
  try {
    await channel.send({
      embeds: [
        BasicEmbed(
          client,
          "Modmail",
          "Hey, please reply with your message and I'll start the process for opening a modmail thread for you."
        ),
      ],
    });
  } catch (error) {
    const env = FetchEnvs();
    return interaction.editReply({
      content: "",
      embeds: [
        BasicEmbed(
          client,
          "Failed!",
          `I was unable to send you a DM, please make sure your dms are open!\n\nIf you don't know how to do this, you can check [this video](https://imgur.com/a/T3VAhb5)\n\nIf you're still having issues, please contact <@${env.OWNER_IDS[0]}>`,
          undefined,
          "DarkRed"
        ),
      ],
    });
  }

  setCommandCooldown(userCooldownKey(interaction.user.id, MODMAIL_BUTTON_ID), 60 * 5);

  const buttons = ButtonWrapper([
    new ButtonBuilder()
      .setURL("https://discord.com/channels/@me/" + channel.id)
      .setLabel("Go to Modmail")
      .setEmoji("💨")
      .setStyle(ButtonStyle.Link),
  ]);

  interaction.editReply({ content: "I've sent you a DM!", components: buttons });
};
