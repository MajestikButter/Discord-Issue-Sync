import * as fs from "fs";

if (!fs.existsSync("./config.json")) throw "No config.json file found";
const config = JSON.parse(`${fs.readFileSync("./config.json")}`);

const ghConf = config.gitHub
if (!ghConf) throw "Missing gitHub config property";
if (!ghConf.appId) throw "Missing gitHub.appId config property";
if (!ghConf.installationId) throw "Missing gitHub.installationId config property";


export namespace Config {
  export const appId: number = ghConf.appId;
  export const installationId: number = ghConf.installationId;
}
