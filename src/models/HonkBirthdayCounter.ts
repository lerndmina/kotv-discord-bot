import { Schema, model } from "mongoose";
import FetchEnvs from "../utils/FetchEnvs";
const env = FetchEnvs();

export default model(
  "HonkBirthdayCounter",
  new Schema({
    guildId: {
      type: String,
      required: true,
    },
    count: {
      type: Number,
      required: true,
    },
  })
);
