import FetchEnvs from "../FetchEnvs";
const env = FetchEnvs();

const verifyUrl = env.BOT_URL + "/index.php?route=%2Fapi%2Fv2%2Fintegration%2Fverify";

export async function verifyUser(code: string, identifier: string, username: string) {
  console.log(
    `Verifying user ${identifier} with code ${code} on url ${verifyUrl} and username ${username} with api key ${env.NAMELESS_API_KEY}`
  );
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + env.NAMELESS_API_KEY,
      "User-Agent": "Nameless-Custom",
    },
    body: `{"integration":"Discord","code":"${code}","identifier":"${identifier}","username":"${username}"}`,
  };

  try {
    const res = await (await fetch(verifyUrl, options)).json();
    return res;
  } catch (error) {
    return {
      error: `nameless:uncaught_error: ${error}`,
    };
  }
}
