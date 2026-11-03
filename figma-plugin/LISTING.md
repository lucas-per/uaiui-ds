# Community listing (draft)

> Not published. This is the listing text to use if the plugin is ever submitted to the Figma Community.

**Name:** Variables to DTCG

**Tagline:** Export your local variables as DTCG design tokens and open a pull request on GitHub.

## Description

Variables to DTCG turns the local variables of a Figma file into design token files in the [Design Tokens Community Group format (2025.10)](https://www.designtokens.org/), and delivers them to your GitHub repository as a pull request or as a .zip download.

Before it changes anything, the plugin shows you a diff against your repository's base branch: tokens added, changed (before → after) and removed, per token and per mode. Errors block the export. They include an unresolved type, a broken alias, a name collision and a type that differs from the one already in the repository.

- **Collections and modes:** a config file in your repository maps each collection to a token file, and each mode to a resolver context (for example, light and dark themes or density levels). Modes you don't export can be ignored on purpose, and the plugin warns you about them.
- **Types:**
  - Colors, dimensions, font weights and font families are typed from the variable's scopes.
  - Aliases inherit the type of their target.
  - Anything the plugin can't decide, such as durations, you choose once. The choice is saved in the config.
- **Conversion:**
  - Colors become sRGB values with components, alpha and hex.
  - Numbers become dimensions or durations in the units you set.
  - Aliases become `{group.token}` references.
  - Descriptions become `$description`.
- **Clean diffs:** the token order and the file metadata in your repository are kept, so an export with no change in Figma produces an empty diff.
- **One pull request per export:** a new branch named `tokens/figma-YYYYMMDD-HHMM`, one commit with the token files and your regenerated build output, and the diff report as the PR description. The plugin never pushes to your base branch and never merges.
- **Snapshot:** you can download the raw variables as JSON to use as a test case.

You need a GitHub fine-grained personal access token limited to the target repository, with Contents and Pull requests set to read and write. Reading a public repository works without a token.

## Privacy

- **Network:** the plugin only talks to `api.github.com`.
  - It reads the files of the repository you configure.
  - It writes to that repository only when you click **Open PR**. It then creates a branch, a commit and a pull request.
  - It makes no other network requests.
  - It has no analytics, tracking or telemetry.
- **Your GitHub token:** it is stored only in Figma's local plugin storage (`figma.clientStorage`) on your computer. It is sent only to `api.github.com`, as the `Authorization` header, and never to any other server. It is never written to a file, a log or an error message. You can replace or delete it at any time from the plugin.
- **Your design data:** variable names and values leave Figma only as the token files committed to the repository you chose, or in the .zip you download. The developer of this plugin does not receive or store any of your data.
- **Stored settings:** the owner, repository, base branch and config path you type are stored in the same local plugin storage.
