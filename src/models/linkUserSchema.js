const { Schema, model } = require("mongoose");

const linkUserSchema = new Schema({
  discordId: {
    type: String,
    required: true,
  },
  planetmen: {
    type: [
      {
        name: String,
        characterId: String,
        outfitId: String,
        inOutfit: Boolean,
      },
    ],
    required: true,
  },
});

module.exports = model("linkUser", linkUserSchema);
