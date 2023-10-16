const { fetchAPlanetman } = require("../Bot");
const { debugMsg } = require("./debugMsg");

module.exports = async function (name) {
  debugMsg(`Fetching ${name} from census API`);
  const startTime = Date.now();
  const data = await fetchAPlanetman(name);
  const endTime = Date.now();
  debugMsg(`Census API took ${endTime - startTime}ms to respond`);
  if (data.returned < 1) {
    return null;
  }
  return data.character_list[0];
};
