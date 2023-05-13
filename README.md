### Prerequisites
- NodeJS
- GitHub App Installation
- Discord Bot

### Setup
1. Install


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