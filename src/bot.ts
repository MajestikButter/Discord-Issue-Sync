import { Client, GatewayIntentBits } from "discord.js";

export namespace Discord {
  export const bot = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessages],
  });
}
