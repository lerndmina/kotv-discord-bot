import { Schema, model } from "mongoose";

export default model(
  "BibiChannels",
  new Schema({
    guildID: {
      type: String,
      required: true,
    },
    channelIDs: {
      type: [String],
      default: [],
    },
  })
);
