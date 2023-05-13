# Discord Issue Sync

## Setup
### NodeJS Script
1. Install [NodeJS](https://nodejs.org/en/download)
2. Download a release zip from the [Releases](https://github.com/MajestikButter/Discord-Issue-Sync/releases) page
3. Extract the contents to a new directory
4. Open a terminal in the new directory
5. Run `npm install` to install package dependencies

### GitHub App
1. Create a [GitHub App](https://docs.github.com/en/apps/creating-github-apps/setting-up-a-github-app/creating-a-github-app)
    - Webhook can be disabled
    - Under `Repository permissions`, allow `Read and write` for `Issues`
2. Generate a [private key](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/managing-private-keys-for-github-apps#generating-private-keys) for your GitHub App
3. Move the private key `.pem` file to your script's directory
4. Rename the `.pem` file to `private-key.pem`
5. Install the the GitHub App on your organization or account
6. Set the `appId` and `installationId` properties in `config.json` to point to your GitHub App
    - The `appId` can be found on your app's `About`/`General` page
    - The `installationId` can be found in the url when viewing the app installation

### Discord Bot
1. Create a [Discord Bot](https://discordpy.readthedocs.io/en/stable/discord.html)
2. Copy the token to the `TOKEN` variable in the `.env` file

### Channels
1. Open the `channels.json` file in a text editor
2. Add any relevant channels to the json file
3. Each entry much have the key set as the discord forum channel id and its value must be an object with a `repoInfo` property
    - An optional `label` property is also supported to only sync channels that have a specific label to and from a channel

## Running
1. Open a terminal in your script's directory
2. Run `npm run start`

## JSON Files

### config.json
```json
{
  "gitHub": {
    "appId": 1234,
    "installationId": 567890
  }
}
```

### channels.json
```json
{
  "<discord-forum-id_1>": {
    "repoInfo": {
      "owner": "<github-repo-owner>",
      "repo": "<github-repo-name>"
    }
  },
  "<discord-forum-id_2>": {
    "repoInfo": {
      "owner": "<github-repo-owner>",
      "repo": "<github-repo-name>"
    },
    "label": "bug"
  }
}
```
