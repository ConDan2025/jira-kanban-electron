# Jira Kanban

A desktop Kanban board for Jira Solution Initiatives, built with Electron, React, and Bootstrap.

## Features

- Visualize Jira initiatives and subtasks in a Kanban board
- Filter by user, project, issue type, and search text
- Personal Access Token (PAT) storage (secure, local)
- Configurable refresh interval and manual refresh
- Responsive, modern UI with sticky headers and expandable subtasks
- Easy switching between users (user list dropdown)

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16+ recommended)
- [Yarn](https://yarnpkg.com/) or [npm](https://www.npmjs.com/)
- [Jira Cloud](https://www.atlassian.com/software/jira) account and a Personal Access Token

### Installation

1. Clone the repository:

   ```sh
   git clone <your-repo-url>
   cd jira-kanban-electron
   ```

2. Install dependencies:

   ```sh
   npm install
   ```

3. Start the app in development mode:

   ```sh
   npm run electron:dev
   ```

   This will launch both the Vite dev server and Electron.

### Building for Production

To build the app for distribution:

```sh
npm run build
```

The packaged app will be in the `dist/` directory.

## Usage

1. Open the app.
2. Click the **Settings** button (⚙️) to configure:
   - Jira URL (e.g., `https://your-domain.atlassian.net`)
   - Project Key (e.g., `DCW`)
   - Issue Type (e.g., `Solution Initiative`)
   - User list (comma-separated usernames)
   - Select a user from the dropdown
   - Enter and save your Jira Personal Access Token (PAT)
   - Set refresh interval and search as needed
3. View your initiatives and subtasks in the Kanban board.

## File Structure

- [`main.js`](main.js): Electron main process, IPC, and Jira API integration
- [`preload.js`](preload.js): Secure API bridge for renderer
- [`src/App.tsx`](src/App.tsx): Main React app and settings panel
- [`src/components/KanbanBoard.tsx`](src/components/KanbanBoard.tsx): Kanban board UI
- [`src/main.tsx`](src/main.tsx): React entry point
- [`index.html`](index.html): HTML entry point

## Security

- PATs are encrypted and stored locally using Electron's `safeStorage`.
- All API calls are made from the main process; the renderer communicates via IPC.

## License

MIT

---

**Note:** This project is not affiliated with Atlassian or Jira. Use at your own risk.