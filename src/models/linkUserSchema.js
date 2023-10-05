const { Schema, model } = require("mongoose");

const linkUserSchema = new Schema({
  discordId: {
    type: String,
    required: true,
  },
  ps2Characters: {
    type: Map,
    required: true,
  },
});

module.exports = model("linkUser", linkUserSchema);
