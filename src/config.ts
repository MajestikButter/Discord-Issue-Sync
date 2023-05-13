import * as fs from "fs";

if (!fs.existsSync("./config.json")) throw "No config.json file found";
const config = JSON.parse(`${fs.readFileSync("./config.json")}`);

if (!config.gitHub) throw "Missing gitHub config property";
if (!config.appId) throw "Missing gitHub.appId config property";
if (!config.installationId) throw "Missing gitHub.installationId config property";

export namespace Config {
  export const appId: number = config.gitHub.appId;
  export const installationId: number = config.gitHub.installationId;
}
