# Zenitrox Tasks for VS Code and Antigravity

See the Zenitrox tasks assigned to you without leaving the editor, mark them
done and update their progress.

- **My Tasks** panel in the sidebar, grouped into Overdue, Today, Next 7 days,
  Later and No due date.
- Hover a task to see its project, due date, priority and progress.
- Buttons on each task: ✓ mark done (with Undo), set progress
  (0/25/50/75/100%), open in the browser.
- Status bar count such as `2 overdue · 3 today`. Click it to open the panel.
- The list reloads every 5 minutes and whenever the editor window gets focus.

## Install

1. Download `zenitrox.vsix` from the latest GitHub release.
2. In VS Code or Antigravity open the Extensions view, click `⋯` →
   **Install from VSIX…** and pick the file.
   (Or drag the file onto the Extensions view.)

## Sign in

Click the **Zenitrox** icon in the activity bar → **Sign in**:

1. Confirm the server address (`https://zenitroxteam.onrender.com`).
2. Pick **Username and password** and enter your Zenitrox login. If your
   account has two-factor authentication, you are asked for the code too.

The extension uses your password once to create an access token named
"Visual Studio Code on <computer>" (valid for one year), then forgets the
password. The token is kept in the editor's secret storage and can be revoked
any time in Zenitrox under **Settings → API tokens**. **Zenitrox: Sign Out**
in the command palette removes it from the editor.

### Signing in with an API token instead

Accounts that only log in with Google have no password. Create a token in
Zenitrox under **Settings → API tokens** with these permissions, then pick
**API token** when signing in:

- **tasks**: all
- **projects**: read all
- **other**: user

## Settings

| Setting | Default | |
|---|---|---|
| `zenitrox.url` | `https://zenitroxteam.onrender.com` | Server address |
| `zenitrox.refreshMinutes` | `5` | How often the list reloads |

## Development

```sh
npm install
npm test          # compile and run the unit tests
npm run package   # builds zenitrox.vsix
```

Press F5 in VS Code with this folder open to try the extension in a new
window.
