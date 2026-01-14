import {
	App,
	Editor,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TFolder,
	requestUrl,
	RequestUrlParam,
	normalizePath,
} from "obsidian";

// ============================================================================
// Types & Interfaces
// ============================================================================

interface OmiSyncSettings {
	apiKey: string;
	memoriesFolder: string;
	conversationsFolder: string;
	actionItemsFolder: string;
	autoSync: boolean;
	syncIntervalMinutes: number;
	lastSyncTimestamp: number;
	syncOnStartup: boolean;
	includeTranscript: boolean;
	// Custom tags for each item type (comma-separated)
	memoryTags: string;
	conversationTags: string;
	actionItemTags: string;
	actionItemCompletedTags: string;
	actionItemPendingTags: string;
	// Whether to include category as a tag for memories
	includeCategoryTag: boolean;
	// Incremental sync settings
	enableIncrementalSync: boolean;
	lastMemorySyncTime: string;
	lastConversationSyncTime: string;
	lastActionItemSyncTime: string;
	// Daily note integration settings
	enableDailyNoteIntegration: boolean;
	dailyNoteFolder: string;
	dailyNoteFormat: string;
	dailyNoteSectionHeader: string;
	dailyNoteIncludeMemories: boolean;
	dailyNoteIncludeConversations: boolean;
	dailyNoteIncludeActionItems: boolean;
	dailyNotePosition: "append" | "prepend";
}

const DEFAULT_SETTINGS: OmiSyncSettings = {
	apiKey: "",
	memoriesFolder: "Omi/Memories",
	conversationsFolder: "Omi/Conversations",
	actionItemsFolder: "Omi/Action Items",
	autoSync: false,
	syncIntervalMinutes: 30,
	lastSyncTimestamp: 0,
	syncOnStartup: true,
	includeTranscript: true,
	memoryTags: "omi, omi/memory",
	conversationTags: "omi, omi/conversation",
	actionItemTags: "omi, omi/action-item",
	actionItemCompletedTags: "completed, done",
	actionItemPendingTags: "todo, pending",
	includeCategoryTag: true,
	// Incremental sync defaults
	enableIncrementalSync: true,
	lastMemorySyncTime: "",
	lastConversationSyncTime: "",
	lastActionItemSyncTime: "",
	// Daily note defaults
	enableDailyNoteIntegration: false,
	dailyNoteFolder: "",
	dailyNoteFormat: "YYYY-MM-DD",
	dailyNoteSectionHeader: "## Omi Summary",
	dailyNoteIncludeMemories: true,
	dailyNoteIncludeConversations: true,
	dailyNoteIncludeActionItems: true,
	dailyNotePosition: "append",
};

// Omi API Response Types
interface OmiMemory {
	id: string;
	content: string;
	category?: string;
	created_at?: string;
	updated_at?: string;
	visibility?: string;
	tags?: string[];
	manually_added?: boolean;
	scoring?: string;
}

interface OmiConversation {
	id: string;
	created_at: string;
	started_at?: string;
	finished_at?: string;
	language?: string;
	source?: string;
	structured?: StructuredData;
	transcript_segments?: TranscriptSegment[];
	discarded?: boolean;
	deleted?: boolean;
}

interface StructuredData {
	title?: string;
	overview?: string;
	emoji?: string;
	category?: string;
	action_items?: ActionItemSummary[];
	events?: EventSummary[];
}

interface TranscriptSegment {
	id?: string;
	text: string;
	speaker?: string;
	speaker_id?: number;
	is_user?: boolean;
	start?: number;
	end?: number;
}

interface ActionItemSummary {
	description: string;
	completed?: boolean;
	created_at?: string;
	updated_at?: string;
	due_at?: string;
	completed_at?: string;
}

interface EventSummary {
	title: string;
	description?: string;
	start?: string;
	duration?: number;
}

interface OmiActionItem {
	id: string;
	description: string;
	created_at: string;
	completed?: boolean;
	completed_at?: string;
	deleted?: boolean;
	source?: string;
	memory_id?: string;
	conversation_id?: string;
}

interface SyncResult {
	memories: number;
	conversations: number;
	actionItems: number;
	errors: string[];
}

// ============================================================================
// Main Plugin Class
// ============================================================================

export default class OmiSyncPlugin extends Plugin {
	settings: OmiSyncSettings;
	private syncInterval: number | null = null;

	async onload() {
		await this.loadSettings();

		// Add ribbon icon
		this.addRibbonIcon("refresh-cw", "Sync Omi Data", async () => {
			await this.syncAll();
		});

		// Add commands
		this.addCommand({
			id: "sync-all-omi",
			name: "Sync all Omi data",
			callback: async () => {
				await this.syncAll();
			},
		});

		this.addCommand({
			id: "sync-all-omi-full",
			name: "Sync all Omi data (full sync, ignore last sync time)",
			callback: async () => {
				await this.syncAll(false, true);
			},
		});

		this.addCommand({
			id: "sync-omi-memories",
			name: "Sync Omi memories only",
			callback: async () => {
				await this.syncMemories();
			},
		});

		this.addCommand({
			id: "sync-omi-conversations",
			name: "Sync Omi conversations only",
			callback: async () => {
				await this.syncConversations();
			},
		});

		this.addCommand({
			id: "sync-omi-action-items",
			name: "Sync Omi action items only",
			callback: async () => {
				await this.syncActionItems();
			},
		});

		this.addCommand({
			id: "sync-omi-to-daily-note",
			name: "Sync today's Omi data to daily note",
			callback: async () => {
				await this.syncToDailyNote();
			},
		});

		// Add settings tab
		this.addSettingTab(new OmiSyncSettingTab(this.app, this));

		// Setup auto-sync if enabled
		if (this.settings.autoSync) {
			this.startAutoSync();
		}

		// Sync on startup if enabled
		if (this.settings.syncOnStartup && this.settings.apiKey) {
			// Delay startup sync slightly to let Obsidian fully initialize
			setTimeout(async () => {
				new Notice("Omi Sync: Starting initial sync...");
				await this.syncAll();
			}, 3000);
		}
	}

	onunload() {
		this.stopAutoSync();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	// ============================================================================
	// Auto-Sync Management
	// ============================================================================

	startAutoSync() {
		this.stopAutoSync();
		const intervalMs = this.settings.syncIntervalMinutes * 60 * 1000;
		this.syncInterval = window.setInterval(async () => {
			console.log("Omi Sync: Auto-sync triggered");
			await this.syncAll(true); // silent mode for auto-sync
		}, intervalMs);
		this.registerInterval(this.syncInterval);
	}

	stopAutoSync() {
		if (this.syncInterval !== null) {
			window.clearInterval(this.syncInterval);
			this.syncInterval = null;
		}
	}

	// ============================================================================
	// API Communication
	// ============================================================================

	private async apiRequest<T>(endpoint: string, params?: Record<string, string>): Promise<T | null> {
		if (!this.settings.apiKey) {
			new Notice("Omi Sync: Please configure your API key in settings");
			return null;
		}

		const baseUrl = "https://api.omi.me/v1/dev";
		let url = `${baseUrl}${endpoint}`;

		if (params) {
			const searchParams = new URLSearchParams(params);
			url += `?${searchParams.toString()}`;
		}

		const requestParams: RequestUrlParam = {
			url: url,
			method: "GET",
			headers: {
				Authorization: `Bearer ${this.settings.apiKey}`,
				"Content-Type": "application/json",
			},
		};

		try {
			const response = await requestUrl(requestParams);
			return response.json as T;
		} catch (error) {
			console.error(`Omi Sync API Error (${endpoint}):`, error);
			throw error;
		}
	}

	private async fetchMemories(limit = 100, offset = 0): Promise<OmiMemory[]> {
		const memories = await this.apiRequest<OmiMemory[]>("/user/memories", {
			limit: limit.toString(),
			offset: offset.toString(),
		});
		return memories || [];
	}

	private async fetchConversations(limit = 100, offset = 0, startDate?: string): Promise<OmiConversation[]> {
		const params: Record<string, string> = {
			limit: limit.toString(),
			offset: offset.toString(),
			include_transcript: "true",
		};
		
		if (startDate) {
			params.start_date = startDate;
		}
		
		const conversations = await this.apiRequest<OmiConversation[]>("/user/conversations", params);
		return conversations || [];
	}

	private async fetchActionItems(limit = 100, offset = 0, startDate?: string): Promise<OmiActionItem[]> {
		const params: Record<string, string> = {
			limit: limit.toString(),
			offset: offset.toString(),
		};
		
		if (startDate) {
			params.start_date = startDate;
		}
		
		const actionItems = await this.apiRequest<OmiActionItem[]>("/user/action-items", params);
		return actionItems || [];
	}

	// ============================================================================
	// Folder Management
	// ============================================================================

	private async ensureFolderExists(folderPath: string): Promise<void> {
		const normalizedPath = normalizePath(folderPath);
		const folder = this.app.vault.getAbstractFileByPath(normalizedPath);

		if (!folder) {
			await this.app.vault.createFolder(normalizedPath);
		}
	}

	// ============================================================================
	// Daily Note Integration
	// ============================================================================

	private formatDate(date: Date, format: string): string {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const day = String(date.getDate()).padStart(2, "0");
		
		return format
			.replace("YYYY", String(year))
			.replace("YY", String(year).slice(-2))
			.replace("MM", month)
			.replace("M", String(date.getMonth() + 1))
			.replace("DD", day)
			.replace("D", String(date.getDate()));
	}

	private getDailyNotePath(date: Date): string {
		const fileName = this.formatDate(date, this.settings.dailyNoteFormat);
		const folder = this.settings.dailyNoteFolder.trim();
		
		if (folder) {
			return normalizePath(`${folder}/${fileName}.md`);
		}
		return normalizePath(`${fileName}.md`);
	}

	private async getOrCreateDailyNote(date: Date): Promise<string> {
		const path = this.getDailyNotePath(date);
		const existingFile = this.app.vault.getAbstractFileByPath(path);
		
		if (existingFile) {
			return await this.app.vault.read(existingFile as any);
		}
		
		// Create folder if needed
		if (this.settings.dailyNoteFolder.trim()) {
			await this.ensureFolderExists(this.settings.dailyNoteFolder);
		}
		
		// Create new daily note with basic content
		const dateStr = date.toLocaleDateString("en-US", { 
			weekday: "long", 
			year: "numeric", 
			month: "long", 
			day: "numeric" 
		});
		const initialContent = `# ${dateStr}\n\n`;
		await this.app.vault.create(path, initialContent);
		return initialContent;
	}

	private async updateDailyNote(
		date: Date,
		memories: OmiMemory[],
		conversations: OmiConversation[],
		actionItems: OmiActionItem[]
	): Promise<void> {
		if (!this.settings.enableDailyNoteIntegration) return;
		
		// Filter items to only include those from the specified date
		const dateStr = date.toISOString().split("T")[0];
		
		const todaysMemories = memories.filter((m) => {
			if (!m.created_at) return false;
			return m.created_at.startsWith(dateStr);
		});
		
		const todaysConversations = conversations.filter((c) => {
			return c.created_at.startsWith(dateStr);
		});
		
		const todaysActionItems = actionItems.filter((a) => {
			return a.created_at.startsWith(dateStr);
		});
		
		// Skip if nothing to add
		if (todaysMemories.length === 0 && todaysConversations.length === 0 && todaysActionItems.length === 0) {
			return;
		}
		
		const path = this.getDailyNotePath(date);
		let content = await this.getOrCreateDailyNote(date);
		
		// Generate the Omi section content
		let omiSection = `\n${this.settings.dailyNoteSectionHeader}\n\n`;
		
		// Add conversations summary
		if (this.settings.dailyNoteIncludeConversations && todaysConversations.length > 0) {
			omiSection += `### Conversations (${todaysConversations.length})\n\n`;
			for (const conv of todaysConversations) {
				const title = conv.structured?.title || "Untitled Conversation";
				const emoji = conv.structured?.emoji || "💬";
				const fileName = this.generateFileName(conv, "conversation");
				omiSection += `- ${emoji} [[${this.settings.conversationsFolder}/${fileName}|${title}]]\n`;
				
				if (conv.structured?.overview) {
					const shortOverview = conv.structured.overview.substring(0, 150);
					omiSection += `  - ${shortOverview}${conv.structured.overview.length > 150 ? "..." : ""}\n`;
				}
			}
			omiSection += "\n";
		}
		
		// Add memories summary
		if (this.settings.dailyNoteIncludeMemories && todaysMemories.length > 0) {
			omiSection += `### Memories (${todaysMemories.length})\n\n`;
			for (const memory of todaysMemories) {
				const emoji = this.getCategoryEmoji(memory.category);
				const fileName = this.generateFileName(memory, "memory");
				const shortContent = memory.content.substring(0, 100);
				omiSection += `- ${emoji} [[${this.settings.memoriesFolder}/${fileName}|${shortContent}${memory.content.length > 100 ? "..." : ""}]]\n`;
			}
			omiSection += "\n";
		}
		
		// Add action items
		if (this.settings.dailyNoteIncludeActionItems && todaysActionItems.length > 0) {
			omiSection += `### Action Items (${todaysActionItems.length})\n\n`;
			for (const item of todaysActionItems) {
				const checkbox = item.completed ? "[x]" : "[ ]";
				const fileName = this.generateFileName(item, "action-item");
				omiSection += `- ${checkbox} [[${this.settings.actionItemsFolder}/${fileName}|${item.description}]]\n`;
			}
			omiSection += "\n";
		}
		
		// Check if section already exists and update it, or add new section
		const sectionRegex = new RegExp(
			`${this.escapeRegex(this.settings.dailyNoteSectionHeader)}[\\s\\S]*?(?=\\n## |\\n# |$)`,
			"g"
		);
		
		if (content.match(sectionRegex)) {
			// Replace existing section
			content = content.replace(sectionRegex, omiSection.trim());
		} else {
			// Add new section
			if (this.settings.dailyNotePosition === "prepend") {
				// Find the end of the first heading and insert after
				const firstHeadingEnd = content.indexOf("\n\n");
				if (firstHeadingEnd !== -1) {
					content = content.slice(0, firstHeadingEnd + 2) + omiSection + content.slice(firstHeadingEnd + 2);
				} else {
					content = content + omiSection;
				}
			} else {
				// Append to end
				content = content + omiSection;
			}
		}
		
		// Write updated content
		const file = this.app.vault.getAbstractFileByPath(path);
		if (file) {
			await this.app.vault.modify(file as any, content);
		}
	}

	private escapeRegex(string: string): string {
		return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	}

	// ============================================================================
	// Content Generation
	// ============================================================================

	private parseTags(tagString: string): string[] {
		if (!tagString || tagString.trim() === "") {
			return [];
		}
		return tagString
			.split(",")
			.map((tag) => tag.trim())
			.filter((tag) => tag.length > 0);
	}

	private generateMemoryContent(memory: OmiMemory): string {
		const frontmatter: Record<string, unknown> = {
			id: memory.id,
			type: "omi-memory",
			synced: new Date().toISOString(),
		};

		if (memory.created_at) frontmatter.created = memory.created_at;
		if (memory.updated_at) frontmatter.updated = memory.updated_at;
		if (memory.category) frontmatter.category = memory.category;
		if (memory.visibility) frontmatter.visibility = memory.visibility;

		// Use custom tags from settings
		const tags: string[] = this.parseTags(this.settings.memoryTags);
		
		// Optionally add category as a tag
		if (this.settings.includeCategoryTag && memory.category) {
			const categoryTag = memory.category.toLowerCase().replace(/\s+/g, "-");
			if (!tags.includes(categoryTag)) {
				tags.push(categoryTag);
			}
		}

		// Add any tags from the memory itself
		if (memory.tags && memory.tags.length > 0) {
			for (const tag of memory.tags) {
				if (!tags.includes(tag)) {
					tags.push(tag);
				}
			}
		}
		
		if (tags.length > 0) {
			frontmatter.tags = tags;
		}

		let content = this.generateFrontmatter(frontmatter);

		// Title - generate from first line of content or use category
		const contentLines = memory.content.split("\n");
		const firstLine = contentLines[0].substring(0, 60);
		const title = firstLine.length > 50 ? firstLine.substring(0, 50) + "..." : firstLine;
		const emoji = this.getCategoryEmoji(memory.category);
		content += `# ${emoji} ${title}\n\n`;

		// Main content
		content += `## Memory\n\n${memory.content}\n\n`;

		// Metadata
		if (memory.category) {
			content += `**Category:** ${memory.category}\n`;
		}
		if (memory.manually_added) {
			content += `**Manually Added:** Yes\n`;
		}

		content += "\n";

		// Metadata footer
		content += `---\n`;
		content += `*Synced from Omi on ${new Date().toLocaleString()}*\n`;

		return content;
	}

	private getCategoryEmoji(category?: string): string {
		if (!category) return "🧠";
		
		const emojiMap: Record<string, string> = {
			"interesting": "💡",
			"system": "⚙️",
			"manual": "📝",
			"personal": "👤",
			"work": "💼",
			"business": "📊",
			"health": "🏥",
			"finance": "💰",
			"travel": "✈️",
			"food": "🍽️",
			"entertainment": "🎬",
			"education": "📚",
			"social": "👥",
		};
		
		return emojiMap[category.toLowerCase()] || "🧠";
	}

	private generateConversationContent(conversation: OmiConversation): string {
		const frontmatter: Record<string, unknown> = {
			id: conversation.id,
			type: "omi-conversation",
			created: conversation.created_at,
			source: conversation.source || "unknown",
			synced: new Date().toISOString(),
		};

		if (conversation.started_at) frontmatter.started = conversation.started_at;
		if (conversation.finished_at) frontmatter.finished = conversation.finished_at;
		if (conversation.language) frontmatter.language = conversation.language;
		if (conversation.structured?.category) frontmatter.category = conversation.structured.category;

		// Use custom tags from settings
		const tags: string[] = this.parseTags(this.settings.conversationTags);
		
		// Optionally add category as a tag
		if (this.settings.includeCategoryTag && conversation.structured?.category) {
			const categoryTag = conversation.structured.category.toLowerCase().replace(/\s+/g, "-");
			if (!tags.includes(categoryTag)) {
				tags.push(categoryTag);
			}
		}
		
		if (tags.length > 0) {
			frontmatter.tags = tags;
		}

		let content = this.generateFrontmatter(frontmatter);

		// Title - use structured title if available
		const title = conversation.structured?.title || this.generateConversationTitle(conversation);
		const emoji = conversation.structured?.emoji || "💬";
		content += `# ${emoji} ${title}\n\n`;

		// Duration if available
		if (conversation.started_at && conversation.finished_at) {
			const start = new Date(conversation.started_at);
			const end = new Date(conversation.finished_at);
			const durationMs = end.getTime() - start.getTime();
			const durationMins = Math.round(durationMs / 60000);
			content += `**Duration:** ${durationMins} minutes\n\n`;
		}

		// Overview
		if (conversation.structured?.overview) {
			content += `## Overview\n\n${conversation.structured.overview}\n\n`;
		}

		// Action Items from structured data
		if (conversation.structured?.action_items && conversation.structured.action_items.length > 0) {
			content += `## Action Items\n\n`;
			for (const item of conversation.structured.action_items) {
				const checkbox = item.completed ? "[x]" : "[ ]";
				content += `- ${checkbox} ${item.description}\n`;
			}
			content += "\n";
		}

		// Events
		if (conversation.structured?.events && conversation.structured.events.length > 0) {
			content += `## Events\n\n`;
			for (const event of conversation.structured.events) {
				content += `### ${event.title}\n`;
				if (event.description) content += `${event.description}\n`;
				if (event.start) content += `- **Start:** ${event.start}\n`;
				if (event.duration) content += `- **Duration:** ${event.duration} minutes\n`;
				content += "\n";
			}
		}

		// Transcript
		if (this.settings.includeTranscript) {
			if (conversation.transcript_segments && conversation.transcript_segments.length > 0) {
				content += `## Transcript\n\n`;
				for (const segment of conversation.transcript_segments) {
					const speaker = segment.is_user ? "**You**" : segment.speaker || `Speaker ${segment.speaker_id ?? ""}`;
					content += `> ${speaker}: ${segment.text}\n>\n`;
				}
				content += "\n";
			} else {
				content += `## Transcript\n\n*No transcript available for this conversation.*\n\n`;
			}
		}

		// Metadata footer
		content += `---\n`;
		content += `*Synced from Omi on ${new Date().toLocaleString()}*\n`;

		return content;
	}

	private generateConversationTitle(conversation: OmiConversation): string {
		const date = new Date(conversation.created_at);
		return `Conversation - ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
	}

	private generateActionItemContent(actionItem: OmiActionItem): string {
		const frontmatter: Record<string, unknown> = {
			id: actionItem.id,
			type: "omi-action-item",
			created: actionItem.created_at,
			completed: actionItem.completed || false,
			source: actionItem.source || "unknown",
			synced: new Date().toISOString(),
		};

		if (actionItem.completed_at) frontmatter.completed_at = actionItem.completed_at;
		if (actionItem.memory_id) frontmatter.memory_id = actionItem.memory_id;
		if (actionItem.conversation_id) frontmatter.conversation_id = actionItem.conversation_id;

		// Use custom tags from settings
		const tags: string[] = this.parseTags(this.settings.actionItemTags);
		
		// Add completed or pending tags based on status
		if (actionItem.completed) {
			const completedTags = this.parseTags(this.settings.actionItemCompletedTags);
			tags.push(...completedTags.filter((t) => !tags.includes(t)));
		} else {
			const pendingTags = this.parseTags(this.settings.actionItemPendingTags);
			tags.push(...pendingTags.filter((t) => !tags.includes(t)));
		}
		
		if (tags.length > 0) {
			frontmatter.tags = tags;
		}

		let content = this.generateFrontmatter(frontmatter);

		// Title
		const status = actionItem.completed ? "✅" : "⬜";
		content += `# ${status} Action Item\n\n`;

		// Task checkbox
		const checkbox = actionItem.completed ? "[x]" : "[ ]";
		content += `- ${checkbox} ${actionItem.description}\n\n`;

		// Details
		content += `## Details\n\n`;
		content += `- **Created:** ${new Date(actionItem.created_at).toLocaleString()}\n`;
		if (actionItem.completed && actionItem.completed_at) {
			content += `- **Completed:** ${new Date(actionItem.completed_at).toLocaleString()}\n`;
		}

		// Links to related content
		if (actionItem.memory_id) {
			const memoryFileName = this.sanitizeFileName(`memory-${actionItem.memory_id}`);
			content += `- **Related Memory:** [[${this.settings.memoriesFolder}/${memoryFileName}]]\n`;
		}
		if (actionItem.conversation_id) {
			const convFileName = this.sanitizeFileName(`conversation-${actionItem.conversation_id}`);
			content += `- **Related Conversation:** [[${this.settings.conversationsFolder}/${convFileName}]]\n`;
		}

		content += "\n";

		// Metadata footer
		content += `---\n`;
		content += `*Synced from Omi on ${new Date().toLocaleString()}*\n`;

		return content;
	}

	private generateFrontmatter(data: Record<string, unknown>): string {
		let frontmatter = "---\n";
		for (const [key, value] of Object.entries(data)) {
			if (Array.isArray(value)) {
				frontmatter += `${key}:\n`;
				for (const item of value) {
					frontmatter += `  - ${item}\n`;
				}
			} else if (typeof value === "object" && value !== null) {
				frontmatter += `${key}: ${JSON.stringify(value)}\n`;
			} else {
				frontmatter += `${key}: ${value}\n`;
			}
		}
		frontmatter += "---\n\n";
		return frontmatter;
	}

	private sanitizeFileName(name: string): string {
		// Remove or replace characters that are invalid in file names
		return name
			.replace(/[\\/:*?"<>|]/g, "-")
			.replace(/\s+/g, " ")
			.trim()
			.substring(0, 100); // Limit length
	}

	private generateFileName(item: OmiMemory | OmiConversation | OmiActionItem, type: string): string {
		let dateStr = "";
		
		if (type === "memory") {
			const memory = item as OmiMemory;
			const date = memory.created_at ? new Date(memory.created_at) : new Date();
			dateStr = date.toISOString().split("T")[0];
		} else if (type === "conversation") {
			const conv = item as OmiConversation;
			const date = new Date(conv.created_at);
			dateStr = date.toISOString().split("T")[0];
		} else {
			const action = item as OmiActionItem;
			const date = new Date(action.created_at);
			dateStr = date.toISOString().split("T")[0];
		}

		let title = "";
		if (type === "memory") {
			const memory = item as OmiMemory;
			// Use first line of content as title
			const firstLine = memory.content.split("\n")[0];
			title = firstLine.substring(0, 50);
		} else if (type === "conversation") {
			const conv = item as OmiConversation;
			// Use structured title if available
			title = conv.structured?.title || item.id.substring(0, 8);
		} else if (type === "action-item") {
			title = (item as OmiActionItem).description.substring(0, 50);
		} else {
			title = item.id.substring(0, 8);
		}

		const sanitizedTitle = this.sanitizeFileName(title);
		return `${dateStr} - ${sanitizedTitle}`;
	}

	// ============================================================================
	// Sync Operations
	// ============================================================================

	async syncAll(silent = false, forceFullSync = false): Promise<SyncResult> {
		if (!this.settings.apiKey) {
			new Notice("Omi Sync: Please configure your API key in settings");
			return { memories: 0, conversations: 0, actionItems: 0, errors: ["No API key configured"] };
		}

		if (!silent) {
			const syncType = this.settings.enableIncrementalSync && !forceFullSync ? "incremental" : "full";
			new Notice(`Omi Sync: Starting ${syncType} sync...`);
		}

		const result: SyncResult = {
			memories: 0,
			conversations: 0,
			actionItems: 0,
			errors: [],
		};

		// Collect synced items for daily note integration
		const syncedMemories: OmiMemory[] = [];
		const syncedConversations: OmiConversation[] = [];
		const syncedActionItems: OmiActionItem[] = [];

		try {
			// Sync memories
			const { count: memoriesCount, items: memories } = await this.syncMemoriesWithItems(true, forceFullSync);
			result.memories = memoriesCount;
			syncedMemories.push(...memories);

			// Sync conversations
			const { count: conversationsCount, items: conversations } = await this.syncConversationsWithItems(true, forceFullSync);
			result.conversations = conversationsCount;
			syncedConversations.push(...conversations);

			// Sync action items
			const { count: actionItemsCount, items: actionItems } = await this.syncActionItemsWithItems(true, forceFullSync);
			result.actionItems = actionItemsCount;
			syncedActionItems.push(...actionItems);

			// Update last sync timestamp
			this.settings.lastSyncTimestamp = Date.now();
			await this.saveSettings();

			// Update daily note if enabled
			if (this.settings.enableDailyNoteIntegration) {
				await this.updateDailyNote(new Date(), syncedMemories, syncedConversations, syncedActionItems);
			}

			if (!silent) {
				new Notice(
					`Omi Sync complete!\n` +
						`📝 ${result.memories} memories\n` +
						`💬 ${result.conversations} conversations\n` +
						`✅ ${result.actionItems} action items`
				);
			}
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			result.errors.push(errorMsg);
			new Notice(`Omi Sync error: ${errorMsg}`);
		}

		return result;
	}

	async syncMemories(silent = false, forceFullSync = false): Promise<number> {
		const { count } = await this.syncMemoriesWithItems(silent, forceFullSync);
		return count;
	}

	private async syncMemoriesWithItems(silent = false, forceFullSync = false): Promise<{ count: number; items: OmiMemory[] }> {
		if (!this.settings.apiKey) {
			if (!silent) new Notice("Omi Sync: Please configure your API key");
			return { count: 0, items: [] };
		}

		try {
			await this.ensureFolderExists(this.settings.memoriesFolder);

			// Memories API doesn't support date filtering, so we fetch all and filter client-side
			const memories = await this.fetchMemories();
			let syncedCount = 0;
			const syncedItems: OmiMemory[] = [];

			// Filter for incremental sync (client-side since API doesn't support it)
			const lastSync = this.settings.lastMemorySyncTime;
			const filteredMemories = this.settings.enableIncrementalSync && !forceFullSync && lastSync
				? memories.filter((m) => m.created_at && m.created_at > lastSync)
				: memories;

			for (const memory of filteredMemories) {
				// Skip empty memories
				if (!memory.content || memory.content.trim() === "") continue;

				const fileName = this.generateFileName(memory, "memory");
				const filePath = normalizePath(`${this.settings.memoriesFolder}/${fileName}.md`);

				// Check if file already exists
				const existingFile = this.app.vault.getAbstractFileByPath(filePath);

				const content = this.generateMemoryContent(memory);

				if (existingFile) {
					// Update existing file
					await this.app.vault.modify(existingFile as any, content);
				} else {
					// Create new file
					await this.app.vault.create(filePath, content);
				}

				syncedCount++;
				syncedItems.push(memory);
			}

			// Update last sync time
			this.settings.lastMemorySyncTime = new Date().toISOString();
			await this.saveSettings();

			if (!silent) {
				new Notice(`Omi Sync: Synced ${syncedCount} memories`);
			}

			return { count: syncedCount, items: syncedItems };
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			new Notice(`Omi Sync error (memories): ${errorMsg}`);
			console.error("Omi Sync memories error:", error);
			return { count: 0, items: [] };
		}
	}

	async syncConversations(silent = false, forceFullSync = false): Promise<number> {
		const { count } = await this.syncConversationsWithItems(silent, forceFullSync);
		return count;
	}

	private async syncConversationsWithItems(silent = false, forceFullSync = false): Promise<{ count: number; items: OmiConversation[] }> {
		if (!this.settings.apiKey) {
			if (!silent) new Notice("Omi Sync: Please configure your API key");
			return { count: 0, items: [] };
		}

		try {
			await this.ensureFolderExists(this.settings.conversationsFolder);

			// Use incremental sync if enabled
			const startDate = this.settings.enableIncrementalSync && !forceFullSync && this.settings.lastConversationSyncTime
				? this.settings.lastConversationSyncTime
				: undefined;

			const conversations = await this.fetchConversations(100, 0, startDate);
			let syncedCount = 0;
			const syncedItems: OmiConversation[] = [];

			for (const conversation of conversations) {
				// Skip discarded/deleted conversations
				if (conversation.discarded || conversation.deleted) continue;

				const fileName = this.generateFileName(conversation, "conversation");
				const filePath = normalizePath(`${this.settings.conversationsFolder}/${fileName}.md`);

				const existingFile = this.app.vault.getAbstractFileByPath(filePath);
				const content = this.generateConversationContent(conversation);

				if (existingFile) {
					await this.app.vault.modify(existingFile as any, content);
				} else {
					await this.app.vault.create(filePath, content);
				}

				syncedCount++;
				syncedItems.push(conversation);
			}

			// Update last sync time
			this.settings.lastConversationSyncTime = new Date().toISOString();
			await this.saveSettings();

			if (!silent) {
				new Notice(`Omi Sync: Synced ${syncedCount} conversations`);
			}

			return { count: syncedCount, items: syncedItems };
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			new Notice(`Omi Sync error (conversations): ${errorMsg}`);
			console.error("Omi Sync conversations error:", error);
			return { count: 0, items: [] };
		}
	}

	async syncActionItems(silent = false, forceFullSync = false): Promise<number> {
		const { count } = await this.syncActionItemsWithItems(silent, forceFullSync);
		return count;
	}

	private async syncActionItemsWithItems(silent = false, forceFullSync = false): Promise<{ count: number; items: OmiActionItem[] }> {
		if (!this.settings.apiKey) {
			if (!silent) new Notice("Omi Sync: Please configure your API key");
			return { count: 0, items: [] };
		}

		try {
			await this.ensureFolderExists(this.settings.actionItemsFolder);

			// Use incremental sync if enabled
			const startDate = this.settings.enableIncrementalSync && !forceFullSync && this.settings.lastActionItemSyncTime
				? this.settings.lastActionItemSyncTime
				: undefined;

			const actionItems = await this.fetchActionItems(100, 0, startDate);
			let syncedCount = 0;
			const syncedItems: OmiActionItem[] = [];

			for (const actionItem of actionItems) {
				if (actionItem.deleted) continue;

				const fileName = this.generateFileName(actionItem, "action-item");
				const filePath = normalizePath(`${this.settings.actionItemsFolder}/${fileName}.md`);

				const existingFile = this.app.vault.getAbstractFileByPath(filePath);
				const content = this.generateActionItemContent(actionItem);

				if (existingFile) {
					await this.app.vault.modify(existingFile as any, content);
				} else {
					await this.app.vault.create(filePath, content);
				}

				syncedCount++;
				syncedItems.push(actionItem);
			}

			// Update last sync time
			this.settings.lastActionItemSyncTime = new Date().toISOString();
			await this.saveSettings();

			if (!silent) {
				new Notice(`Omi Sync: Synced ${syncedCount} action items`);
			}

			return { count: syncedCount, items: syncedItems };
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			new Notice(`Omi Sync error (action items): ${errorMsg}`);
			console.error("Omi Sync action items error:", error);
			return { count: 0, items: [] };
		}
	}

	async syncToDailyNote(): Promise<void> {
		if (!this.settings.apiKey) {
			new Notice("Omi Sync: Please configure your API key in settings");
			return;
		}

		if (!this.settings.enableDailyNoteIntegration) {
			new Notice("Omi Sync: Daily note integration is disabled. Enable it in settings first.");
			return;
		}

		new Notice("Omi Sync: Fetching today's data for daily note...");

		try {
			const today = new Date();
			const todayStr = today.toISOString().split("T")[0];

			// Fetch today's data
			const memories = await this.fetchMemories();
			const conversations = await this.fetchConversations(100, 0, todayStr);
			const actionItems = await this.fetchActionItems(100, 0, todayStr);

			// Filter memories client-side (API doesn't support date filtering)
			const todaysMemories = memories.filter((m) => m.created_at && m.created_at.startsWith(todayStr));

			// Update daily note
			await this.updateDailyNote(today, todaysMemories, conversations, actionItems);

			const totalItems = todaysMemories.length + conversations.length + actionItems.length;
			new Notice(`Omi Sync: Added ${totalItems} items to today's daily note`);
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			new Notice(`Omi Sync error: ${errorMsg}`);
		}
	}
}

// ============================================================================
// Settings Tab
// ============================================================================

class OmiSyncSettingTab extends PluginSettingTab {
	plugin: OmiSyncPlugin;

	constructor(app: App, plugin: OmiSyncPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// Header
		containerEl.createEl("h1", { text: "Omi Sync Settings" });

		// API Configuration Section
		containerEl.createEl("h2", { text: "API Configuration" });

		new Setting(containerEl)
			.setName("API Key")
			.setDesc(
				"Your Omi Developer API key. Get it from Settings → Developer → Create Key in the Omi app."
			)
			.addText((text) =>
				text
					.setPlaceholder("omi_dev_your_key_here")
					.setValue(this.plugin.settings.apiKey)
					.onChange(async (value) => {
						this.plugin.settings.apiKey = value;
						await this.plugin.saveSettings();
					})
			);

		// Test Connection Button
		new Setting(containerEl)
			.setName("Test Connection")
			.setDesc("Verify your API key is working correctly")
			.addButton((button) =>
				button.setButtonText("Test").onClick(async () => {
					if (!this.plugin.settings.apiKey) {
						new Notice("Please enter an API key first");
						return;
					}

					button.setButtonText("Testing...");
					button.setDisabled(true);

					try {
						const result = await this.plugin.syncMemories(true);
						new Notice(`Connection successful! Found memories in your Omi account.`);
					} catch (error) {
						new Notice(`Connection failed: ${error}`);
					} finally {
						button.setButtonText("Test");
						button.setDisabled(false);
					}
				})
			);

		// Folder Configuration Section
		containerEl.createEl("h2", { text: "Folder Configuration" });

		new Setting(containerEl)
			.setName("Memories Folder")
			.setDesc("Where to save synced memories (relative to vault root)")
			.addText((text) =>
				text
					.setPlaceholder("Omi/Memories")
					.setValue(this.plugin.settings.memoriesFolder)
					.onChange(async (value) => {
						this.plugin.settings.memoriesFolder = value || DEFAULT_SETTINGS.memoriesFolder;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Conversations Folder")
			.setDesc("Where to save synced conversations (relative to vault root)")
			.addText((text) =>
				text
					.setPlaceholder("Omi/Conversations")
					.setValue(this.plugin.settings.conversationsFolder)
					.onChange(async (value) => {
						this.plugin.settings.conversationsFolder = value || DEFAULT_SETTINGS.conversationsFolder;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Action Items Folder")
			.setDesc("Where to save synced action items/tasks (relative to vault root)")
			.addText((text) =>
				text
					.setPlaceholder("Omi/Action Items")
					.setValue(this.plugin.settings.actionItemsFolder)
					.onChange(async (value) => {
						this.plugin.settings.actionItemsFolder = value || DEFAULT_SETTINGS.actionItemsFolder;
						await this.plugin.saveSettings();
					})
			);

		// Sync Options Section
		containerEl.createEl("h2", { text: "Sync Options" });

		new Setting(containerEl)
			.setName("Sync on Startup")
			.setDesc("Automatically sync when Obsidian starts")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.syncOnStartup).onChange(async (value) => {
					this.plugin.settings.syncOnStartup = value;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("Auto Sync")
			.setDesc("Automatically sync at regular intervals")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.autoSync).onChange(async (value) => {
					this.plugin.settings.autoSync = value;
					await this.plugin.saveSettings();

					if (value) {
						this.plugin.startAutoSync();
						new Notice(`Auto-sync enabled (every ${this.plugin.settings.syncIntervalMinutes} minutes)`);
					} else {
						this.plugin.stopAutoSync();
						new Notice("Auto-sync disabled");
					}
				})
			);

		new Setting(containerEl)
			.setName("Sync Interval")
			.setDesc("How often to sync (in minutes) when auto-sync is enabled")
			.addSlider((slider) =>
				slider
					.setLimits(5, 120, 5)
					.setValue(this.plugin.settings.syncIntervalMinutes)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.syncIntervalMinutes = value;
						await this.plugin.saveSettings();

						// Restart auto-sync with new interval if enabled
						if (this.plugin.settings.autoSync) {
							this.plugin.startAutoSync();
						}
					})
			);

		// Content Options Section
		containerEl.createEl("h2", { text: "Content Options" });

		new Setting(containerEl)
			.setName("Include Transcript")
			.setDesc("Include full transcript in memory and conversation notes")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.includeTranscript).onChange(async (value) => {
					this.plugin.settings.includeTranscript = value;
					await this.plugin.saveSettings();
				})
			);

		// Tag Configuration Section
		containerEl.createEl("h2", { text: "Tag Configuration" });
		
		containerEl.createEl("p", {
			text: "Customize the tags applied to each type of synced item. Use comma-separated values (e.g., 'tag1, tag2, nested/tag').",
			cls: "setting-item-description",
		});

		new Setting(containerEl)
			.setName("Memory Tags")
			.setDesc("Tags to apply to all synced memories")
			.addText((text) =>
				text
					.setPlaceholder("omi, omi/memory")
					.setValue(this.plugin.settings.memoryTags)
					.onChange(async (value) => {
						this.plugin.settings.memoryTags = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Include Category as Tag")
			.setDesc("Automatically add the memory category (e.g., 'meeting', 'personal') as a tag")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.includeCategoryTag).onChange(async (value) => {
					this.plugin.settings.includeCategoryTag = value;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("Conversation Tags")
			.setDesc("Tags to apply to all synced conversations")
			.addText((text) =>
				text
					.setPlaceholder("omi, omi/conversation")
					.setValue(this.plugin.settings.conversationTags)
					.onChange(async (value) => {
						this.plugin.settings.conversationTags = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Action Item Tags")
			.setDesc("Base tags to apply to all synced action items")
			.addText((text) =>
				text
					.setPlaceholder("omi, omi/action-item")
					.setValue(this.plugin.settings.actionItemTags)
					.onChange(async (value) => {
						this.plugin.settings.actionItemTags = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Completed Action Item Tags")
			.setDesc("Additional tags to apply when an action item is completed")
			.addText((text) =>
				text
					.setPlaceholder("completed, done")
					.setValue(this.plugin.settings.actionItemCompletedTags)
					.onChange(async (value) => {
						this.plugin.settings.actionItemCompletedTags = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Pending Action Item Tags")
			.setDesc("Additional tags to apply when an action item is not yet completed")
			.addText((text) =>
				text
					.setPlaceholder("todo, pending")
					.setValue(this.plugin.settings.actionItemPendingTags)
					.onChange(async (value) => {
						this.plugin.settings.actionItemPendingTags = value;
						await this.plugin.saveSettings();
					})
			);

		// Incremental Sync Section
		containerEl.createEl("h2", { text: "Incremental Sync" });

		new Setting(containerEl)
			.setName("Enable Incremental Sync")
			.setDesc("Only fetch items newer than the last sync time. Disable to always do a full sync.")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.enableIncrementalSync).onChange(async (value) => {
					this.plugin.settings.enableIncrementalSync = value;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("Reset Sync History")
			.setDesc("Clear last sync timestamps to force a full sync on next run")
			.addButton((button) =>
				button.setButtonText("Reset").setWarning().onClick(async () => {
					this.plugin.settings.lastMemorySyncTime = "";
					this.plugin.settings.lastConversationSyncTime = "";
					this.plugin.settings.lastActionItemSyncTime = "";
					await this.plugin.saveSettings();
					new Notice("Sync history cleared. Next sync will be a full sync.");
				})
			);

		// Show last sync times
		if (this.plugin.settings.lastMemorySyncTime || this.plugin.settings.lastConversationSyncTime || this.plugin.settings.lastActionItemSyncTime) {
			const syncInfoDiv = containerEl.createDiv({ cls: "setting-item-description" });
			syncInfoDiv.createEl("p", { text: "Last sync times:" });
			const syncList = syncInfoDiv.createEl("ul");
			if (this.plugin.settings.lastMemorySyncTime) {
				syncList.createEl("li", { text: `Memories: ${new Date(this.plugin.settings.lastMemorySyncTime).toLocaleString()}` });
			}
			if (this.plugin.settings.lastConversationSyncTime) {
				syncList.createEl("li", { text: `Conversations: ${new Date(this.plugin.settings.lastConversationSyncTime).toLocaleString()}` });
			}
			if (this.plugin.settings.lastActionItemSyncTime) {
				syncList.createEl("li", { text: `Action Items: ${new Date(this.plugin.settings.lastActionItemSyncTime).toLocaleString()}` });
			}
		}

		// Daily Note Integration Section
		containerEl.createEl("h2", { text: "Daily Note Integration" });

		new Setting(containerEl)
			.setName("Enable Daily Note Integration")
			.setDesc("Automatically add synced items to your daily note")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.enableDailyNoteIntegration).onChange(async (value) => {
					this.plugin.settings.enableDailyNoteIntegration = value;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("Daily Note Folder")
			.setDesc("Folder where daily notes are stored (leave empty for vault root)")
			.addText((text) =>
				text
					.setPlaceholder("Daily Notes")
					.setValue(this.plugin.settings.dailyNoteFolder)
					.onChange(async (value) => {
						this.plugin.settings.dailyNoteFolder = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Daily Note Format")
			.setDesc("Date format for daily note filenames (YYYY=year, MM=month, DD=day)")
			.addText((text) =>
				text
					.setPlaceholder("YYYY-MM-DD")
					.setValue(this.plugin.settings.dailyNoteFormat)
					.onChange(async (value) => {
						this.plugin.settings.dailyNoteFormat = value || "YYYY-MM-DD";
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Section Header")
			.setDesc("Markdown header to use for the Omi section in daily notes")
			.addText((text) =>
				text
					.setPlaceholder("## Omi Summary")
					.setValue(this.plugin.settings.dailyNoteSectionHeader)
					.onChange(async (value) => {
						this.plugin.settings.dailyNoteSectionHeader = value || "## Omi Summary";
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Section Position")
			.setDesc("Where to add the Omi section in the daily note")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("append", "End of note")
					.addOption("prepend", "After first heading")
					.setValue(this.plugin.settings.dailyNotePosition)
					.onChange(async (value: "append" | "prepend") => {
						this.plugin.settings.dailyNotePosition = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Include Memories")
			.setDesc("Add memories to daily note")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.dailyNoteIncludeMemories).onChange(async (value) => {
					this.plugin.settings.dailyNoteIncludeMemories = value;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("Include Conversations")
			.setDesc("Add conversations to daily note")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.dailyNoteIncludeConversations).onChange(async (value) => {
					this.plugin.settings.dailyNoteIncludeConversations = value;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("Include Action Items")
			.setDesc("Add action items to daily note")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.dailyNoteIncludeActionItems).onChange(async (value) => {
					this.plugin.settings.dailyNoteIncludeActionItems = value;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("Sync to Daily Note Now")
			.setDesc("Manually add today's Omi data to your daily note")
			.addButton((button) =>
				button.setButtonText("Update Daily Note").onClick(async () => {
					await this.plugin.syncToDailyNote();
				})
			);

		// Manual Sync Section
		containerEl.createEl("h2", { text: "Manual Sync" });

		new Setting(containerEl)
			.setName("Sync Now")
			.setDesc("Sync new Omi data (uses incremental sync if enabled)")
			.addButton((button) =>
				button.setButtonText("Sync All").setCta().onClick(async () => {
					await this.plugin.syncAll();
				})
			);

		new Setting(containerEl)
			.setName("Force Full Sync")
			.setDesc("Re-sync all data regardless of last sync time")
			.addButton((button) =>
				button.setButtonText("Full Sync").setWarning().onClick(async () => {
					await this.plugin.syncAll(false, true);
				})
			);

		new Setting(containerEl)
			.setName("Sync Memories Only")
			.addButton((button) =>
				button.setButtonText("Sync Memories").onClick(async () => {
					await this.plugin.syncMemories();
				})
			);

		new Setting(containerEl)
			.setName("Sync Conversations Only")
			.addButton((button) =>
				button.setButtonText("Sync Conversations").onClick(async () => {
					await this.plugin.syncConversations();
				})
			);

		new Setting(containerEl)
			.setName("Sync Action Items Only")
			.addButton((button) =>
				button.setButtonText("Sync Action Items").onClick(async () => {
					await this.plugin.syncActionItems();
				})
			);

		// Last Sync Info
		if (this.plugin.settings.lastSyncTimestamp > 0) {
			const lastSync = new Date(this.plugin.settings.lastSyncTimestamp);
			containerEl.createEl("p", {
				text: `Last sync: ${lastSync.toLocaleString()}`,
				cls: "setting-item-description",
			});
		}

		// Help Section
		containerEl.createEl("h2", { text: "Help" });

		containerEl.createEl("p", {
			text: "To get your API key:",
		});

		const helpList = containerEl.createEl("ol");
		helpList.createEl("li", { text: "Open the Omi app on your phone" });
		helpList.createEl("li", { text: "Go to Settings → Developer" });
		helpList.createEl("li", { text: "Tap 'Create Key'" });
		helpList.createEl("li", { text: "Copy the key immediately (you won't see it again!)" });
		helpList.createEl("li", { text: "Paste it in the API Key field above" });

		containerEl.createEl("p", {
			text: "For more information, visit the Omi documentation at docs.omi.me",
		});
	}
}
