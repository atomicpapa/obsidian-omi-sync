# Omi Sync for Obsidian

Sync your [Omi](https://omi.me) conversations, memories, and action items directly into your Obsidian vault as markdown notes.

## Features

- 🧠 **Sync Memories** - Import AI-generated insights and facts from your Omi conversations
- 💬 **Sync Conversations** - Full conversation transcripts with AI summaries and speaker identification
- ✅ **Sync Action Items** - Tasks and to-dos extracted from your conversations
- 📁 **Custom Folders** - Configure separate folders for each type of content
- 🔄 **Auto-Sync** - Automatic background syncing at configurable intervals
- ⚡ **Incremental Sync** - Only fetch new items since last sync for faster performance
- 📅 **Daily Note Integration** - Automatically add today's Omi data to your daily note
- 🏷️ **Custom Tags** - Fully customizable tags for each content type with frontmatter support
- 🔗 **Cross-Linking** - Action items link back to their source conversations

## Installation

### From Obsidian Community Plugins (Recommended)

1. Open Obsidian Settings
2. Go to **Community Plugins** and disable **Safe Mode**
3. Click **Browse** and search for "Omi Sync"
4. Install the plugin and enable it

### Manual Installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/yourusername/obsidian-omi-sync/releases/latest)
2. Create a folder in your vault: `<vault>/.obsidian/plugins/omi-sync/`
3. Copy the downloaded files into this folder
4. Reload Obsidian
5. Enable the plugin in Settings → Community Plugins

### For Development

1. Clone this repository into your vault's `.obsidian/plugins/` folder
2. Run `npm install` to install dependencies
3. Run `npm run dev` to start the development build
4. Reload Obsidian to load the plugin

## Setup

### Getting Your Omi API Key

1. Open the **Omi app** on your phone
2. Navigate to **Settings → Developer**
3. Tap **Create Key**
4. **Copy the key immediately** - you won't be able to see it again!
5. Paste it into the plugin settings in Obsidian

### Configuring the Plugin

1. Open Obsidian Settings → Omi Sync
2. Paste your API key
3. Configure your preferred folder locations:
   - **Memories Folder**: Default `Omi/Memories`
   - **Conversations Folder**: Default `Omi/Conversations`
   - **Action Items Folder**: Default `Omi/Action Items`
4. Set your sync preferences (auto-sync, interval, etc.)
5. Click **Test Connection** to verify everything works

## Usage

### Manual Sync

- Click the **refresh icon** in the ribbon (left sidebar)
- Or use the command palette (`Ctrl/Cmd + P`) and search for:
  - "Sync all Omi data"
  - "Sync Omi memories only"
  - "Sync Omi conversations only"
  - "Sync Omi action items only"

### Auto-Sync

Enable auto-sync in settings to automatically pull new data at regular intervals (5-120 minutes).

### Synced Note Structure

#### Memories
Memories are AI-extracted insights and facts from your conversations.

```markdown
---
id: mem_789ghi
type: omi-memory
created: 2024-01-15T10:30:00Z
category: interesting
tags:
  - omi
  - omi/memory
  - interesting
---

# 💡 User prefers dark mode in all applications

## Memory

User prefers dark mode in all applications and mentioned they find it easier on the eyes during late night work sessions.

**Category:** interesting

---
*Synced from Omi on Jan 15, 2024, 10:30 AM*
```

#### Conversations
Conversations include full transcripts with AI-generated summaries and action items.

```markdown
---
id: conv_202
type: omi-conversation
created: 2024-01-15T14:00:00Z
source: omi
category: business
tags:
  - omi
  - omi/conversation
  - business
---

# 💼 Feature Discussion

**Duration:** 20 minutes

## Overview

Brainstorming session for new features with the team.

## Action Items

- [ ] Create mockups for new UI
- [ ] Schedule follow-up meeting

## Transcript

> **You**: Let's discuss the new feature
> **Speaker 1**: I think we should focus on the user interface first
```

#### Action Items
```markdown
---
id: action_101
type: omi-action-item
created: 2024-01-15T10:35:00Z
completed: false
tags:
  - omi
  - omi/action-item
  - todo
  - pending
---

# ⬜ Action Item

- [ ] Schedule follow-up meeting with the team

## Details
- **Created:** Jan 15, 2024, 10:35 AM
- **Related Conversation:** [[Omi/Conversations/2024-01-15 - Feature Discussion]]
```

## Settings

| Setting | Description | Default |
|---------|-------------|---------|
| API Key | Your Omi Developer API key | - |
| Memories Folder | Where to save memories | `Omi/Memories` |
| Conversations Folder | Where to save conversations | `Omi/Conversations` |
| Action Items Folder | Where to save action items | `Omi/Action Items` |
| Sync on Startup | Auto-sync when Obsidian opens | ✅ |
| Auto Sync | Enable background syncing | ❌ |
| Sync Interval | Minutes between auto-syncs | 30 |
| Include Transcript | Include full transcripts | ✅ |
| Memory Tags | Tags for memories (comma-separated) | `omi, omi/memory` |
| Include Category Tag | Add memory category as tag | ✅ |
| Conversation Tags | Tags for conversations | `omi, omi/conversation` |
| Action Item Tags | Base tags for action items | `omi, omi/action-item` |
| Completed Tags | Additional tags for completed items | `completed, done` |
| Pending Tags | Additional tags for pending items | `todo, pending` |
| **Incremental Sync** | | |
| Enable Incremental Sync | Only sync items newer than last sync | ✅ |
| **Daily Note Integration** | | |
| Enable Daily Note Integration | Add synced items to daily note | ❌ |
| Daily Note Folder | Folder for daily notes | (vault root) |
| Daily Note Format | Date format for filenames | `YYYY-MM-DD` |
| Section Header | Header for Omi section | `## Omi Summary` |
| Section Position | Where to add section | End of note |
| Include Memories | Add memories to daily note | ✅ |
| Include Conversations | Add conversations to daily note | ✅ |
| Include Action Items | Add action items to daily note | ✅ |

## Commands

| Command | Description |
|---------|-------------|
| Sync all Omi data | Sync new items (incremental if enabled) |
| Sync all Omi data (full sync) | Re-sync everything, ignoring last sync time |
| Sync Omi memories only | Sync only memories |
| Sync Omi conversations only | Sync only conversations |
| Sync Omi action items only | Sync only action items |
| Sync today's Omi data to daily note | Update today's daily note with Omi data |

## Tips

### Incremental Sync

Incremental sync is enabled by default and dramatically speeds up syncing by only fetching items created since your last sync. You can:
- Use the "Force Full Sync" button or command to re-download everything
- Reset sync timestamps in settings to start fresh
- Disable incremental sync entirely if you prefer full syncs

### Daily Note Integration

When enabled, the plugin automatically adds a summary of today's Omi data to your daily note. The summary includes:
- Links to synced conversations with their AI-generated overview
- Links to memories extracted from your conversations
- Action items as checkboxes

This works great with the [Daily Notes](https://help.obsidian.md/Plugins/Daily+notes) core plugin or [Periodic Notes](https://github.com/liamcain/obsidian-periodic-notes).

### Organizing Your Omi Notes

- Use [Dataview](https://github.com/blacksmithgu/obsidian-dataview) to create dashboards:
  ```dataview
  TABLE created, category
  FROM #omi/conversation
  SORT created DESC
  LIMIT 10
  ```

- Use the Obsidian search to find content across all your Omi notes

### Managing Action Items

- The plugin creates task checkboxes that work with Obsidian's task tracking
- Use plugins like [Tasks](https://github.com/obsidian-tasks-group/obsidian-tasks) for advanced task management
- Action items are cross-linked to their source memories/conversations

## Troubleshooting

### "Invalid API key" Error
- Verify you copied the entire API key
- API keys start with `omi_dev_`
- Generate a new key if the current one isn't working

### Notes Not Syncing
- Check your internet connection
- Verify the API key hasn't been revoked
- Check the Obsidian developer console for errors (Ctrl/Cmd + Shift + I)

### Folder Not Created
- Ensure you have write permissions in your vault
- Check that the folder path doesn't contain invalid characters

## Privacy & Security

- Your API key is stored locally in your Obsidian vault's plugin data
- Data is fetched directly from Omi's servers
- No data is sent to third parties
- Consider using `.gitignore` to exclude plugin data if syncing your vault

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 🐛 [Report a bug](https://github.com/yourusername/obsidian-omi-sync/issues)
- 💡 [Request a feature](https://github.com/yourusername/obsidian-omi-sync/issues)
- 📖 [Omi Documentation](https://docs.omi.me)
- 💬 [Obsidian Discord](https://discord.gg/obsidianmd)

## Acknowledgments

- [Omi](https://omi.me) for the amazing AI wearable and developer API
- [Obsidian](https://obsidian.md) for the powerful note-taking platform
- The Obsidian plugin development community
