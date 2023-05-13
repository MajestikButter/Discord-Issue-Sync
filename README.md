### Prerequisites
- NodeJS
- GitHub App Installation
- Discord Bot

### Setup
1. Install [NodeJS](https://nodejs.org/en/download)
2. Create a [GitHub App](https://docs.github.com/en/apps/creating-github-apps/setting-up-a-github-app/creating-a-github-app)
3. Generate a [private key](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/managing-private-keys-for-github-apps#generating-private-keys) for your GitHub App
4. 
5. Create a [Discord Bot](https://discordpy.readthedocs.io/en/stable/discord.html)
6. 


### JSON Configuration Files

#### config.json
```json
{
  "gitHub": {
    "appId": 1234,
    "installationId": 567890
  }
}
```

#### channels.json
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