const {
  SlashCommandBuilder,
  Channel,
  StringSelectMenuBuilder,
  ActionRowBuilder,
  BaseInteraction,
  Message,
} = require("discord.js");
const log = require("fancy-log");
const BasicEmbed = require("../../utils/BasicEmbed");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("poll")
    .setDescription("Create a poll for people to vote on anonymously.")
    .addStringOption((option) =>
      option
        .setName("content")
        .setDescription("The poll content: question;vote1;vote2;etc")
        .setRequired(true)
        .setMaxLength(100)
    )
    .addIntegerOption((option) =>
      option
        .setName("time")
        .setDescription("The time in seconds for the poll to last.")
        .setRequired(false)
    ),
  options: {
    devOnly: false,
    deleted: false,
    guildOnly: true,
  },
  run: async ({ interaction, client, handler }) => {
    const content = interaction.options.getString("content").replace(/;+$/, "").split(";");
    const time = interaction.options.getInteger("time");

    // check if the content is valid
    if (content.length < 3) {
      await interaction.reply({
        content: "You need at least 2 options to create a poll.",
        ephemeral: true,
      });
      return;
    }

    // get the question
    const question = content[0];

    var POLL_TIME;

    if (time) {
      POLL_TIME = time * 1000;
    } else {
      POLL_TIME = 60000;
    }

    const endTime = Date.now() + POLL_TIME;
    const endTimeSeconds = Math.floor(endTime / 1000);

    const options = content.slice(1);

    const embed = BasicEmbed(
      interaction.client,
      question,
      `Poll will end <t:${endTimeSeconds}:R> \n\n` +
        options.map((option, index) => `${index + 1}. \`${option}\``).join("\n") +
        "\n\n **All votes are anonymous**.",
      "#0099ff"
    );

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("pollMenu")
      .setPlaceholder("Select an option")
      .setMinValues(1)
      .setMaxValues(1);

    options.forEach((option, index) => {
      selectMenu.addOptions({
        label: option,
        value: index.toString(),
      });
    });

    selectMenu.addOptions({
      label: "End Poll",
      value: "end",
    });

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const response = await interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: false,
    });

    // create the collector & filter to listen for responses

    const collectorFilter = (i) => i.user.id === interaction.user.id;
    const collector = response.createMessageComponentCollector({
      filter: collectorFilter,
      time: POLL_TIME,
    });

    const votes = [];

    collector.on("collect", (i) => {
      const vote = i.values[0];
      const userId = i.user.id;

      if (vote == "end" && userId != interaction.user.id) {
        i.reply({
          content: "Only the poll creator can end the poll.",
          ephemeral: true,
        });
        return;
      }

      if (vote == "end") {
        collector.stop("done");
        return;
      }

      if (votes[userId]) {
        i.reply({
          content: "You have already voted.",
          ephemeral: true,
        });
        return;
      }

      votes[userId] = vote;

      i.reply({
        content: `You voted for \`${options[vote]}\``,
        ephemeral: true,
      });
    });

    collector.on("end", (collected, reason) => {
      if (reason == "time" || reason == "done") {
        endVote(interaction, response, options, votes);
      }
    });
  },
};

/**
 *
 * @param {BaseInteraction} voteInteraction
 * @param {Message} response
 * @param {Array} options
 * @param {Map} votes
 */
function endVote(voteInteraction, response, options, votes) {
  // Count all instances of 0, 1, 2, etc

  const voteCounts = {};

  for (const userId in votes) {
    const vote = votes[userId];

    if (!voteCounts[vote]) {
      voteCounts[vote] = 0;
    }

    voteCounts[vote]++;
  }

  const totalVotes = Object.values(voteCounts).reduce((a, b) => a + b, 0);

  const finalEmbed = BasicEmbed(
    voteInteraction.client,
    "Poll Results",
    options
      .map((option, index) => {
        const voteCount = voteCounts[index] || 0;
        const percentage = Math.floor((voteCount / totalVotes) * 100);

        return `${index + 1}. \`${option}\` - ${percentage}% (${voteCount} vote(s))`;
      })
      .join("\n"),
    "#0099ff"
  );

  const editEmbed = BasicEmbed(voteInteraction.client, "Poll Ended", "Results Posted Below");

  try {
    response.edit({
      embeds: [editEmbed],
      components: [],
      ephemeral: false,
    });
  } catch (error) {
    log.error(error);
    log(
      "Poll has ended, but could not edit the original message. It has probably been deleted intentionally."
    );
    return;
  }

  voteInteraction.channel.send({ embeds: [finalEmbed] });
}
