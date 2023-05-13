import { config } from "dotenv";
config();

const env = process.env;
export namespace ENV {
  export const token = env.TOKEN;
}
