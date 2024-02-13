import { Client, EmbedBuilder, MessageComponentInteraction } from "discord.js";
import { MODMAIL_BUTTON_ID } from "../../commands/modmail/modmailbutton";
import {
  globalCooldownKey,
  redisClient,
  setCommandCooldown,
  userCooldownKey,
  waitingEmoji,
} from "../../Bot";
import { getCooldown } from "../../validations/cooldowns";
import { debugMsg } from "../../utils/TinyUtils";
import BasicEmbed from "../../utils/BasicEmbed";
import FetchEnvs from "../../utils/FetchEnvs";

export default async (interaction: MessageComponentInteraction, client: Client<true>) => {
  debugMsg("Handling modmail button interaction " + interaction.customId);

  if (!interaction.customId) return;
  if (!interaction.isButton()) return;
  if (!interaction.customId.startsWith(MODMAIL_BUTTON_ID)) return;

  await interaction.reply({ content: waitingEmoji, ephemeral: true });

  const cooldownSeconds = await getCooldown(
    userCooldownKey(interaction.user.id, MODMAIL_BUTTON_ID)
  );
  if (cooldownSeconds)
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

  interaction.editReply({ content: "I've sent you a DM! Click the button above to go to it." });
};
