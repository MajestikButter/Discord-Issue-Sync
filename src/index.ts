import * as fs from "fs";
import * as dotenv from "dotenv";

import { Octokit } from "octokit";
import { createAppAuth } from "@octokit/auth-app";
import { Client } from "discord.js";

dotenv.config();

// Connect Octokit to GitHub app installation
const pem = fs.readFileSync("private-key.pem");
const octo = new Octokit({
  authStrategy: createAppAuth,
  auth: {
    appId: 327191,
    privateKey: `${pem}`,
    installationId: 37079650,
  },
});

const issues = await octo.request("GET /repos/{owner}/{repo}/issues", {
  owner: "Buttered-Toast-Productions",
  repo: "Dungeon-Game",
  headers: {
    "X-GitHub-Api-Version": "2022-11-28",
  },
});

console.log(issues);

const bot = new Client({ intents: ["GuildMessages"] });
bot.login(process.env.TOKEN)
bot.on("threadCreate", (channel, newlyCreated) => {
  if (!newlyCreated) return console.log("thread is not new");
});
bot.on("messageCreate", (msg) => {
  
})
