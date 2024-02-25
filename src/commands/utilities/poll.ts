import {
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  ActionRowBuilder,
  SlashCommandIntegerOption,
  SlashCommandStringOption,
  MessageComponentInteraction,
  BaseInteraction,
  Message,
  StringSelectMenuInteraction,
  CacheType,
  Snowflake,
  InteractionResponse,
  APIEmbed,
  EmbedBuilder,
  Client,
} from "discord.js";
import BasicEmbed from "../../utils/BasicEmbed";
import { debugMsg, sleep } from "../../utils/TinyUtils";
import { CommandOptions, SlashCommandProps } from "commandkit";
import log from "fancy-log";
import ms from "ms";

export const data = new SlashCommandBuilder()
  .setName("poll")
  .setDescription("Create a poll for people to vote on anonymously.")
  .addStringOption((option: SlashCommandStringOption) =>
    option
      .setName("content")
      .setDescription("The poll content: question;vote1;vote2;etc")
      .setRequired(true)
      .setMaxLength(100)
  )
  .addStringOption((option: SlashCommandStringOption) =>
    option
      .setName("time")
      .setDescription("The time for the poll to last. (1m, 1h, 1d, 1w, 1mo etc.)")
      .setRequired(true)
  );

export const options: CommandOptions = {
  devOnly: false,
  deleted: false,
  dm_permissions: false,
};

export async function run({ interaction, client, handler }: SlashCommandProps) {
  const content = interaction.options.getString("content")!.replace(/;+$/, "").split(";");
  const timeString = interaction.options.getString("time");
  if (!timeString) return; // Discord should always give us a time string
  const timeStringArr = timeString!.split(" ");

  var time = 0;

  for (const timeStr of timeStringArr) {
    time += ms(timeStr);

    debugMsg(`Adding ${timeStr} to time. Total: ${time}`);
  }

  time = Math.round(time / 1000);

  console.log(`TimeString: ${timeString} translated to ${time} seconds`);

  if (time > 2592000) {
    await interaction.reply({
      content: "",
      embeds: [BasicEmbed(client, "Poll Time Limit", "The maximum time limit is 30 days.")],
      ephemeral: true,
    });
    return;
  }

  // check if the content is valid
  if (content.length < 3) {
    await interaction.reply({
      content: "You need at least 2 options to create a poll.",
      ephemeral: true,
    });
    return;
  }

  // Create a unique interaction ID for this poll
  const pollId = `${interaction.user.id}-${Date.now()}`;

  // get the question
  const question = content[0];

  const POLL_TIME = time * 1000;

  const endTime = Date.now() + POLL_TIME;
  const endTimeSeconds = Math.floor(endTime / 1000);

  const options = content.slice(1);

  const embedDescriptionArray = [
    `Poll will end <t:${endTimeSeconds}:R>`,
    `Total Votes - 0`,
    `\n${options.map((option, index) => `${index + 1}. \`${option}\``).join("\n")}`,
    "\n **All votes are anonymous**.",
  ];

  const embed = BasicEmbed(interaction.client, question, embedDescriptionArray.join("\n"));

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(pollId)
    .setPlaceholder("Select an option")
    .setMinValues(1)
    .setMaxValues(1);

  options.forEach((option, index) => {
    selectMenu.addOptions({
      label: option,
      value: index.toString(),
    });
  });

  const END_OPTION = options.length;

  selectMenu.addOptions({
    label: "End Poll",
    value: END_OPTION.toString(),
  });

  const row = new ActionRowBuilder().addComponents(selectMenu);

  const response = await interaction.reply({
    embeds: [embed],
    components: [row as any],
    ephemeral: false,
  });

  // create the collector & filter to listen for responses

  const collectorFilter = (i: MessageComponentInteraction) => i.customId === pollId;
  const collector = response.createMessageComponentCollector({
    filter: collectorFilter,
    time: POLL_TIME,
  });

  // const voteHandler: ProxyHandler<Map<string, number>> = {
  //   get: function (target: Map<string, number>, key: string) {
  //     if (key === "set") {
  //       return function (key: string, value: number) {
  //         console.log(`Vote set: ${key} = ${value}`);
  //         target.set(key, value);
  //         updateResponse(client, response, embed, embedDescriptionArray, row, votes);
  //         return true;
  //       };
  //     }
  //     if (key === "size") return target.size;
  //     if (typeof key === "string" && ["get", "has", "delete", "clear"].includes(key)) {
  //       // @ts-ignore
  //       return target[key].bind(target);
  //     }
  //     console.log(`Getting vote: ${key}`);
  //     return target.get(key);
  //   },
  // };

  const votes: Map<Snowflake, number> = new Map();

  collector.on("collect", async (i: StringSelectMenuInteraction<CacheType>) => {
    await i.deferReply({ ephemeral: true });

    const vote = Number.parseInt(i.values[0]);

    const userId = i.user.id as Snowflake;

    if (vote === END_OPTION && userId != interaction.user.id) {
      await i.editReply({
        content: "Only the poll creator can end the poll.",
      });
      return;
    }

    if (vote === END_OPTION) {
      collector.stop("done");
      i.editReply({
        content: "Ending the poll.",
      });
      return;
    }

    if (votes.get(userId) != undefined) {
      await i.editReply({
        content: "You have already voted.",
      });
      return;
    }

    votes.set(userId, vote);
    updateResponse(client, response, embed, embedDescriptionArray, row, votes);

    await i.editReply({
      content: `You voted for \`${options[vote]}\``,
    });
  });

  collector.on("end", (collected, reason) => {
    if (reason == "time" || reason == "done") {
      endVote(interaction, response, options, votes, question);
    }
  });
}

function updateResponse(
  client: Client<true>,
  response: InteractionResponse,
  embed: EmbedBuilder,
  embedDescriptionArray: string[],
  components: any,
  votes: Map<Snowflake, number>
) {
  const totalVotes = votes.size.toString();

  embedDescriptionArray[1] = `Total Votes - ${totalVotes}`;

  const newEmbed = BasicEmbed(client, embed.data.title!, embedDescriptionArray.join("\n"));

  response.edit({
    embeds: [newEmbed],
    components: [components],
  });
}

function endVote(
  voteInteraction: BaseInteraction,
  response: InteractionResponse,
  options: string[],
  votes: Map<Snowflake, number>,
  question: string
) {
  debugMsg("Ending vote");
  debugMsg(options);

  var voteTally = new Map<number, number>();

  for (const option in options) {
    voteTally.set(Number.parseInt(option), 0);
  }

  var totalVotes = 0;

  for (const vote of votes) {
    debugMsg(vote);
    const voteValue = vote[1];
    const voteCount = voteTally.get(voteValue)!;
    voteTally.set(voteValue, voteCount + 1);
    totalVotes++;
  }

  debugMsg(voteTally);

  const resultString =
    `**${question}**\n\n` +
    options
      .map((option, index) => {
        const voteCount = voteTally.get(index)!;
        const percent = Math.round((voteCount / totalVotes) * 100);
        return `${index + 1}. \`${option}\` - ${voteCount} ${
          voteCount == 1 ? "vote" : "votes"
        } (${percent}%)`;
      })
      .join("\n") +
    `\n\nTotal Votes: ${totalVotes}`;

  const finalEmbed = BasicEmbed(
    voteInteraction.client,
    "Poll Results",
    resultString,
    undefined,
    "#0099ff"
  );

  const editEmbed = BasicEmbed(voteInteraction.client, "Poll Ended", "Results Posted Below");

  try {
    response.edit({
      embeds: [editEmbed],
      components: [],
    });
    voteInteraction.channel!.send({ embeds: [finalEmbed] });
  } catch (error) {
    log.error(error);
    log(
      "Poll has ended, but could not edit the original message. It has probably been deleted intentionally."
    );
    return;
  }
}
