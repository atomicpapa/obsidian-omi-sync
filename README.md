# This plugin was 100% coded by Claude AI.  I am not a programmer.  You have been warned!  Use at your own risk!

# Omi Sync for Obsidian

Sync your [Omi](https://omi.me) conversations, memories, and action items directly into your Obsidian vault as markdown notes.

## Features

- 🧠 **Sync Memories** - Import AI-generated insights and facts from your Omi conversations
- 💬 **Sync Conversations** - Full conversation transcripts with AI summaries and speaker identification
- ✅ **Sync Action Items** - Tasks and to-dos extracted from your conversations
- 📁 **Custom Folders** - Configure separate folders for each type of content
- 🗂️ **Category-based Folders** - Automatically organize items into category subfolders (e.g., Omi/Memories/Work/)
- 🎨 **Template Customization** - Define your own Handlebars/Markdown templates for each item type
- 🔄 **Auto-Sync** - Automatic background syncing at configurable intervals
- ⚡ **Incremental Sync** - Only fetch new items since last sync for faster performance
- 📅 **Daily Note Integration** - Automatically add today's Omi data to your daily note
- 🏷️ **Custom Tags** - Fully customizable tags for each content type with frontmatter support
- 🔗 **Cross-Linking** - Action items link back to their source conversations
- 📋 **TaskNotes Integration** - Optional integration with the [TaskNotes](https://github.com/callumalpass/tasknotes) plugin for advanced task management

## Installation

### BRAT Installation

1. Install and Enable BRAT from the Community Store.
2. Open BRAT Settings, scroll down to BETA Plugin List
3. Click Add Beta Plugin
4. Enter "https://github.com/atomicpapa/obsidian-omi-sync"
5. Click Add plugin
6. You can now back out and go to settings for Omi-Sync.      


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

#### Action Items (Standard Format)
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

#### Action Items (TaskNotes Format)
When TaskNotes integration is enabled, action items are created in TaskNotes-compatible format:

```markdown
---
title: "Schedule follow-up meeting with the team"
status: "open"
priority: "medium"
contexts:
  - "omi"
projects: []
tags:
  - "task"
  - "omi"
  - "omi/action-item"
omi-id: "action_101"
omi-source: "omi"
omi-created: "2024-01-15T10:35:00Z"
omi-conversation: "[[Omi/Conversations/2024-01-15 - Feature Discussion]]"
---

Schedule follow-up meeting with the team

## Source

This task was automatically synced from Omi on Jan 15, 2024, 10:35 AM.

**Related Conversation:** [[Omi/Conversations/2024-01-15 - Feature Discussion]]
```

## TaskNotes Integration

Omi Sync includes optional integration with the [TaskNotes](https://github.com/callumalpass/tasknotes) plugin. When enabled, action items from Omi are created in TaskNotes-compatible format, allowing you to manage them alongside your other TaskNotes tasks.

### Enabling TaskNotes Integration

1. Open Obsidian Settings → Omi Sync
2. Scroll to the **TaskNotes Integration** section
3. Enable **Enable TaskNotes Integration**
4. Configure the settings to match your TaskNotes configuration

### Configuration

The integration supports full customization to match your TaskNotes setup:

#### Basic Settings
- **TaskNotes Folder** - Should match the folder where TaskNotes stores tasks
- **Default Status** - Status for new tasks (open, in-progress, todo, next, waiting)
- **Default Priority** - Priority for new tasks (low, medium, high, urgent)
- **Contexts** - Default contexts to apply (comma-separated)

#### Field Mappings
If you've customized property names in TaskNotes' Field Mapping settings, configure the same names here:
- Title, Status, Priority, Due, Scheduled, Contexts, Projects, Tags, Completed

#### Task Identification
TaskNotes identifies tasks either by tag or by a property/value pair. Configure this to match your TaskNotes settings:

**Tag-based identification** (default):
- Set **Identification Method** to "Tag-based"
- Set **Identification Tag** to match your TaskNotes setting (e.g., `task`)

**Property-based identification**:
- Set **Identification Method** to "Property-based"
- Set **Property Name** and **Property Value** to match your TaskNotes settings (e.g., `type: task`)

### Example Configurations

#### Default TaskNotes Setup
If you're using TaskNotes with default settings:
- Enable TaskNotes Integration: ✅
- TaskNotes Folder: `Tasks`
- Identification Method: Tag-based
- Identification Tag: `task`

#### Custom Field Names
If you use `deadline` instead of `due` in TaskNotes:
- Due Date Field: `deadline`

#### Property-based Identification
If TaskNotes identifies tasks by `type: task`:
- Identification Method: Property-based
- Property Name: `type`
- Property Value: `task`

## Template Customization

Omi Sync allows you to fully customize how synced items are formatted using Handlebars-like templates. This gives you complete control over the structure and content of your synced notes.

### Enabling Template Customization

1. Open Obsidian Settings → Omi Sync
2. Scroll to the **Template Customization** section
3. Enable **Enable Template Customization**
4. Edit the templates for memories, conversations, and action items

### Template Syntax

Templates support the following syntax:

- `{{variable}}` - Insert a variable value
- `{{#if variable}}...{{/if}}` - Conditional block (shows content only if variable exists and is truthy)
- `{{#each array}}...{{/each}}` - Loop through array items

### Available Variables

#### Memory Template Variables
- `id`, `type`, `synced`, `syncedFormatted`
- `created`, `updated`, `category`, `visibility`
- `tags` (array), `content`, `title`, `emoji`
- `manually_added` (boolean)

#### Conversation Template Variables
- `id`, `type`, `created`, `source`, `synced`, `syncedFormatted`
- `started`, `finished`, `language`, `category`
- `tags` (array), `title`, `emoji`, `duration`
- `overview`, `transcript`, `includeTranscript` (boolean)
- `actionItems` (array with: `description`, `completed`, `checkbox`)
- `events` (array with: `title`, `description`, `start`, `duration`)

#### Action Item Template Variables
- `id`, `type`, `created`, `createdFormatted`
- `completed` (boolean), `source`, `synced`, `syncedFormatted`
- `completed_at`, `completedFormatted`
- `memory_id`, `conversation_id`, `tags` (array)
- `description`, `statusEmoji`, `checkbox`
- `memoryLink`, `conversationLink`

### Example Templates

#### Minimal Memory Template
```handlebars
---
id: {{id}}
type: omi-memory
---

# {{title}}

{{content}}
```

#### Conversation with Selective Sections
```handlebars
---
id: {{id}}
type: omi-conversation
tags: {{tags}}
---

# {{emoji}} {{title}}

{{#if overview}}
{{overview}}
{{/if}}

{{#if actionItems}}
## Actions
{{#each actionItems}}
- {{checkbox}} {{description}}
{{/each}}
{{/if}}
```

### Resetting Templates

Each template has a **Reset** button that restores the default template. Use this if you want to start over or if your template has errors.

### Important Notes

- Template customization does NOT affect TaskNotes-formatted action items
- Templates are applied when items are synced; existing notes are not automatically updated
- Invalid template syntax may result in malformed notes
- Use the "Force Full Sync" command after changing templates to regenerate all notes

## Category-based Folders

Organize your synced items into category subfolders for better organization. For example:
- `Omi/Memories/Work/`
- `Omi/Memories/Personal/`
- `Omi/Conversations/Business/`
- `Omi/Conversations/Casual/`

### Enabling Category-based Folders

1. Open Obsidian Settings → Omi Sync
2. Scroll to the **Category-based Folders** section
3. Enable **Enable Category-based Folders**
4. Choose which item types should use category folders:
   - **Use Categories for Memories** - Organize memories by category
   - **Use Categories for Conversations** - Organize conversations by category
   - **Use Categories for Action Items** - Organize action items by category (if available)

### How Categories Work

- Categories come from Omi's AI categorization of your content
- Common categories include: Work, Personal, Business, Health, Education, etc.
- Items without categories are saved to the base folder
- Category names are automatically sanitized for use in folder paths

### Examples

With category-based folders enabled:

**Without categories:**
- `Omi/Memories/2024-01-15 - Project update.md`
- `Omi/Conversations/2024-01-15 - Team meeting.md`

**With categories:**
- `Omi/Memories/Work/2024-01-15 - Project update.md`
- `Omi/Conversations/Business/2024-01-15 - Team meeting.md`
- `Omi/Memories/Personal/2024-01-15 - Weekend plans.md`

### Important Notes

- Existing files are NOT moved when you enable this feature
- Category-based folders apply to new syncs only
- Use "Force Full Sync" to regenerate all notes with category folders
- If a category changes in Omi, the file will be created in the new category folder on next sync

## Settings

| Setting | Description | Default |
|---------|-------------|---------|
| API Key | Your Omi Developer API key | - |
| Memories Folder | Where to save memories | `Omi/Memories` |
| Conversations Folder | Where to save conversations | `Omi/Conversations` |
| Action Items Folder | Where to save action items (when TaskNotes disabled) | `Omi/Action Items` |
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
| **TaskNotes Integration** | | |
| Enable TaskNotes Integration | Create action items in TaskNotes format | ❌ |
| TaskNotes Folder | Folder where TaskNotes stores tasks | `Tasks` |
| Default Status | Default status for new tasks | `open` |
| Default Priority | Default priority for new tasks | `medium` |
| Contexts | Default contexts (comma-separated) | `omi` |
| **TaskNotes Field Mappings** | | |
| Title Field | Property name for task title | `title` |
| Status Field | Property name for task status | `status` |
| Priority Field | Property name for task priority | `priority` |
| Due Date Field | Property name for due date | `due` |
| Scheduled Date Field | Property name for scheduled date | `scheduled` |
| Contexts Field | Property name for contexts | `contexts` |
| Projects Field | Property name for projects | `projects` |
| Tags Field | Property name for tags | `tags` |
| Completed Date Field | Property name for completion date | `completed` |
| **TaskNotes Task Identification** | | |
| Identification Method | How TaskNotes identifies tasks | Tag-based |
| Identification Tag | Tag that marks a note as a task | `task` |
| Identification Property Name | Property name for identification | `type` |
| Identification Property Value | Property value for identification | `task` |
| **Template Customization** | | |
| Enable Template Customization | Use custom templates for synced items | ❌ |
| Memory Template | Handlebars template for memory notes | (default template) |
| Conversation Template | Handlebars template for conversation notes | (default template) |
| Action Item Template | Handlebars template for action item notes | (default template) |
| **Category-based Folders** | | |
| Enable Category-based Folders | Organize items into category subfolders | ❌ |
| Use Categories for Memories | Apply category folders to memories | ✅ |
| Use Categories for Conversations | Apply category folders to conversations | ✅ |
| Use Categories for Action Items | Apply category folders to action items | ❌ |

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

### TaskNotes Integration

When using TaskNotes integration:
- Action items are automatically created in TaskNotes-compatible format
- Tasks appear in TaskNotes views (Calendar, Kanban, Task List, etc.)
- Omi metadata is preserved in custom fields (`omi-id`, `omi-source`, `omi-conversation`)
- Links to source conversations are maintained for context

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
- Use plugins like [Tasks](https://github.com/obsidian-tasks-group/obsidian-tasks) or [TaskNotes](https://github.com/callumalpass/tasknotes) for advanced task management
- Action items are cross-linked to their source memories/conversations

### Using Template Customization

Template customization is powerful for adapting Omi Sync to your workflow:

- **Minimalist templates**: Remove sections you don't use (e.g., if you never need transcripts)
- **Add custom sections**: Include your own markdown sections in templates
- **Match your vault style**: Adjust formatting to match your existing notes
- **Dataview integration**: Add custom frontmatter fields for use with Dataview queries

Example use cases:
- Add a `reviewed: false` field to track which items you've processed
- Include custom CSS classes for styling
- Add links to related project notes
- Create templates optimized for mobile viewing

### Using Category-based Folders

Category-based folders help keep your Omi content organized:

- **Find related content**: All work-related items in one place
- **Use folder notes**: Create index notes in category folders to summarize content
- **Apply folder-specific templates**: Use the Templater plugin with folder-based templates
- **Archive by category**: Easily move old categories to an archive folder

Example workflows:
- Keep a `Work/` folder for professional content and `Personal/` for everything else
- Use categories to separate different projects or life areas
- Create Dataview dashboards filtered by category folders
- Set up different sync schedules for different categories (manual workflow)

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

### TaskNotes Not Recognizing Tasks
- Verify that TaskNotes Integration is enabled
- Check that Task Identification settings match your TaskNotes configuration
- Ensure the TaskNotes Folder setting matches where TaskNotes expects tasks
- Try a Force Full Sync to regenerate action items with the correct format

### Template Errors or Malformed Notes
- Check your template syntax for typos (e.g., unclosed `{{#if}}` blocks)
- Ensure all `{{#if}}` blocks have matching `{{/if}}` tags
- Ensure all `{{#each}}` blocks have matching `{{/each}}` tags
- Use the Reset button to restore the default template if you're stuck
- Test your template changes with a Force Full Sync on a small number of items first

### Category Folders Not Created
- Verify that Enable Category-based Folders is enabled
- Check that the specific item type toggle is enabled (e.g., Use Categories for Memories)
- Ensure items have category information (not all items may have categories)
- Category folders are only created for new syncs, not for existing files
- Try a Force Full Sync to regenerate all items with category folders

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

- 🐛 [Report a bug](https://github.com/atomicpapa/obsidian-omi-sync/issues)
- 💡 [Request a feature](https://github.com/atomicpapa/obsidian-omi-sync/issues)
- 📖 [Omi Documentation](https://docs.omi.me)
- 💬 [Obsidian Discord](https://discord.gg/obsidianmd)

## Acknowledgments

- [Omi](https://omi.me) for the amazing AI wearable and developer API
- [Obsidian](https://obsidian.md) for the powerful note-taking platform
- [TaskNotes](https://github.com/callumalpass/tasknotes) for the excellent task management plugin
- The Obsidian plugin development community
