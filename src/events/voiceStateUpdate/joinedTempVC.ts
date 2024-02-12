import {
  Client,
  ChannelType,
  PermissionsBitField,
  VoiceState,
  VoiceChannel,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import log from "fancy-log";
import GuildNewVC from "../../models/GuildNewVC";
import ActiveTempChannels from "../../models/ActiveTempChannels";
import BasicEmbed from "../../utils/BasicEmbed";
import ButtonWrapper from "../../utils/ButtonWrapper";
import ms from "ms";

/**
 *
 * @param {any} oldState
 * @param {any} newState
 * @param {Client} client
 * @returns
 */

export default async (oldState: VoiceState, newState: VoiceState, client: Client<true>) => {
  if (newState.channelId == null) return;
  const joinedChannelId = newState.channelId;
  const guildId = newState.guild.id;

  const vcList = await GuildNewVC.findOne({ guildID: guildId });

  if (!vcList) return;

  const vc = vcList.guildChannelIDs.find((vc) => vc.channelID === joinedChannelId);

  if (!vc) return;

  const category = newState.guild.channels.cache.get(vc.categoryID!);

  if (!category) return;

  const joinedChannel = newState.guild.channels.cache.get(joinedChannelId) as VoiceChannel;

  if (!joinedChannel) return;
  const maxUsers = joinedChannel.userLimit;
  const bitrate = joinedChannel.bitrate;

  if (!newState.member) return;

  try {
    var newChannel = await newState.guild.channels.create({
      name: `- ${newState.member.displayName}'s VC`,
      type: ChannelType.GuildVoice,
      parent: category.id,
      permissionOverwrites: [
        {
          id: newState.member.id,
          allow: [PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.ManageRoles],
        },
      ],
      userLimit: maxUsers,
      bitrate: bitrate,
    });

    await newState.setChannel(newChannel);

    const buttons = [
      new ButtonBuilder()
        .setCustomId(`tempvc-delete`)
        .setLabel("Delete")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("🗑️"),
      new ButtonBuilder()
        .setCustomId(`tempvc-rename`)
        .setLabel("Rename")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("📝"),
      new ButtonBuilder()
        .setCustomId(`tempvc-invite`)
        .setLabel("Invite")
        .setStyle(ButtonStyle.Success)
        .setEmoji("📨"),
      new ButtonBuilder()
        .setCustomId(`tempvc-ban`)
        .setLabel("Ban")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("🔨"),
      new ButtonBuilder()
        .setCustomId(`tempvc-limit`)
        .setLabel("Limit")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("🔢"),
    ];

    newChannel.send({
      content: `<@${newState.id}>`,
      embeds: [
        BasicEmbed(
          client,
          "Hello! 👋",
          `Welcome to your new channel! \n You can change the channel name and permissions by clicking the settings icon next to the channel name. \n Once the channel is empty, it will be deleted automatically.`,
          [
            {
              name: "Control Menu",
              value: "Please use the buttons below to control the channel you have created.",
              inline: false,
            },
          ]
        ),
      ],
      components: ButtonWrapper(buttons),
    });

    const tempList = await ActiveTempChannels.findOne({ guildID: guildId });

    if (tempList) {
      tempList.channelIDs.push(newChannel.id);
      await tempList.save();
    } else {
      const newTempList = new ActiveTempChannels({
        guildID: newChannel.guild.id,
        channelIDs: [newChannel.id],
      });
      await newTempList.save();
    }
  } catch (error) {
    log.error(error);
  }
};
