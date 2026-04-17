const http = require("http");
const { Plugin, PluginSettingTab, Setting, Notice, normalizePath, TFile } = require("obsidian");

const DEFAULT_SETTINGS = {
  port: 27124,
  captureFolder: "Web Clippings",
  sharedSecret: ""
};

function slugify(input) {
  return String(input || "")
    .toLowerCase()
    .replace(/https?:\/\//g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function stableHash(input) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash).toString(36);
}

function sanitizeText(input, maxLength = 12000) {
  return String(input || "")
    .replace(/\r\n/g, "\n")
    .replace(/\u0000/g, "")
    .trim()
    .slice(0, maxLength);
}

function toBlockquote(text) {
  return text
    .split("\n")
    .map((line) => (line ? `> ${line}` : ">"))
    .join("\n");
}

function formatLocalDateTime(isoString) {
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

class NotedownBridgePlugin extends Plugin {
  async onload() {
    await this.loadSettings();

    this.statusBar = this.addStatusBarItem();
    this.setStatus(`Notedown: starting ${this.settings.port}`);

    this.addCommand({
      id: "restart-notedown-server",
      name: "Restart Notedown local server",
      callback: async () => {
        await this.restartServer();
        new Notice(`Notedown server restarted on 127.0.0.1:${this.settings.port}`);
      }
    });

    this.addCommand({
      id: "show-notedown-status",
      name: "Show Notedown server status",
      callback: () => {
        new Notice(`Notedown listening on 127.0.0.1:${this.settings.port}`);
      }
    });

    this.addSettingTab(new NotedownSettingTab(this.app, this));

    try {
      await this.startServer();
    } catch (error) {
      console.error("[Notedown] Failed to start server", error);
      this.setStatus("Notedown: failed");
      new Notice(`Notedown server failed to start: ${error.message}`);
    }
  }

  async onunload() {
    await this.stopServer();
  }

  setStatus(text) {
    if (this.statusBar) {
      this.statusBar.setText(text);
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async restartServer() {
    await this.stopServer();
    await this.startServer();
  }

  async startServer() {
    if (this.server) {
      return;
    }

    const server = http.createServer((request, response) => {
      this.handleRequest(request, response).catch((error) => {
        console.error("[Notedown] Request failed", error);
        this.sendJson(response, 500, { ok: false, error: error.message || "Internal error" });
      });
    });

    const initialErrorHandler = (error) => {
      rejectStart(error);
    };

    let rejectStart;

    try {
      await new Promise((resolve, reject) => {
        rejectStart = reject;
        server.once("error", initialErrorHandler);
        server.listen(this.settings.port, "127.0.0.1", () => {
          server.off("error", initialErrorHandler);
          this.server = server;
          resolve();
        });
      });
    } catch (error) {
      server.off("error", initialErrorHandler);
      throw error;
    }

    server.on("error", (error) => {
      console.error("[Notedown] Server error", error);
      this.setStatus("Notedown: error");
      new Notice(`Notedown server error: ${error.message}`);
    });

    this.setStatus(`Notedown: 127.0.0.1:${this.settings.port}`);
  }

  async stopServer() {
    if (!this.server) {
      return;
    }

    const server = this.server;
    this.server = null;

    if (!server.listening) {
      this.setStatus("Notedown: stopped");
      return;
    }

    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });

    this.setStatus("Notedown: stopped");
  }

  async handleRequest(request, response) {
    this.applyCorsHeaders(response);

    if (request.method === "OPTIONS") {
      response.writeHead(204);
      response.end();
      return;
    }

    if (!this.isAuthorized(request)) {
      this.sendJson(response, 401, { ok: false, error: "Unauthorized" });
      return;
    }

    if (request.method === "GET" && request.url === "/health") {
      this.sendJson(response, 200, {
        ok: true,
        port: this.settings.port,
        captureFolder: this.settings.captureFolder
      });
      return;
    }

    if (request.method === "POST" && request.url === "/capture") {
      const payload = await this.readJson(request);
      const result = await this.captureSelection(payload);
      this.sendJson(response, 200, {
        ok: true,
        filePath: result.filePath,
        created: result.created
      });
      return;
    }

    this.sendJson(response, 404, { ok: false, error: "Not found" });
  }

  isAuthorized(request) {
    if (!this.settings.sharedSecret) {
      return true;
    }

    return request.headers["x-notedown-token"] === this.settings.sharedSecret;
  }

  applyCorsHeaders(response) {
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Notedown-Token");
    response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.setHeader("Content-Type", "application/json; charset=utf-8");
  }

  sendJson(response, statusCode, payload) {
    response.writeHead(statusCode);
    response.end(JSON.stringify(payload));
  }

  async readJson(request) {
    const body = await new Promise((resolve, reject) => {
      let chunks = "";

      request.on("data", (chunk) => {
        chunks += chunk;
        if (chunks.length > 200000) {
          reject(new Error("Payload too large"));
          request.destroy();
        }
      });

      request.on("end", () => resolve(chunks));
      request.on("error", reject);
    });

    try {
      return JSON.parse(body || "{}");
    } catch (error) {
      throw new Error("Invalid JSON payload");
    }
  }

  async captureSelection(rawPayload) {
    const title = sanitizeText(rawPayload.title || "", 300) || "Untitled Article";
    const selection = sanitizeText(rawPayload.selection || "", 12000);
    const note = sanitizeText(rawPayload.note || "", 12000);
    const capturedAt = rawPayload.capturedAt || new Date().toISOString();

    if (!rawPayload.url) {
      throw new Error("Missing url");
    }

    if (!selection) {
      throw new Error("Missing selection");
    }

    const url = new URL(String(rawPayload.url));
    const filePath = this.buildFilePath(url, title);
    const articleContent = this.buildArticleContent({
      title,
      url: url.toString(),
      selection,
      note,
      capturedAt
    });

    await this.ensureFolder(this.settings.captureFolder);

    const existing = this.app.vault.getAbstractFileByPath(filePath);
    let created = false;

    if (!existing) {
      created = true;
      await this.app.vault.create(filePath, articleContent.initialContent);
    } else if (existing instanceof TFile) {
      await this.app.vault.append(existing, articleContent.appendContent);
    } else {
      throw new Error(`Path already exists and is not a file: ${filePath}`);
    }

    new Notice(`Notedown saved to ${filePath}`);

    return {
      filePath,
      created
    };
  }

  buildFilePath(url, title) {
    const host = slugify(url.hostname.replace(/^www\./, "")) || "web";
    const titleSlug = slugify(title) || "untitled";
    const hash = stableHash(url.toString());
    return normalizePath(`${this.settings.captureFolder}/${host}-${titleSlug}-${hash}.md`);
  }

  buildArticleContent(payload) {
    const entry = this.buildEntry(payload);
    const header = [
      `# ${payload.title}`,
      "",
      `- Source: [${payload.title}](${payload.url})`,
      `- Created: ${payload.capturedAt}`,
      "- Saved by: Notedown",
      "",
      "---",
      "",
      entry,
      ""
    ].join("\n");

    return {
      initialContent: header,
      appendContent: `\n\n${entry}\n`
    };
  }

  buildEntry(payload) {
    const parts = [
      `## ${formatLocalDateTime(payload.capturedAt)}`,
      "",
      toBlockquote(payload.selection)
    ];

    if (payload.note) {
      parts.push("", "### 问题 / 想法", "", payload.note);
    }

    return parts.join("\n");
  }

  async ensureFolder(folderPath) {
    const normalized = normalizePath(folderPath);
    if (!normalized) {
      return;
    }

    const segments = normalized.split("/");
    let currentPath = "";

    for (const segment of segments) {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      const existing = this.app.vault.getAbstractFileByPath(currentPath);
      if (!existing) {
        await this.app.vault.createFolder(currentPath);
      }
    }
  }
}

class NotedownSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Notedown Bridge" });

    new Setting(containerEl)
      .setName("Listen Port")
      .setDesc("Chrome 扩展会把摘录发送到这个本地端口。")
      .addText((text) => {
        text.setPlaceholder("27124").setValue(String(this.plugin.settings.port));
        text.inputEl.type = "number";
        text.inputEl.addEventListener("change", async () => {
          const value = text.inputEl.value;
            const port = Number.parseInt(value, 10);
          if (!Number.isInteger(port) || port < 1024 || port > 65535) {
            text.setValue(String(this.plugin.settings.port));
            return;
          }

          this.plugin.settings.port = port;
          await this.plugin.saveSettings();
          await this.plugin.restartServer();
        });
      });

    new Setting(containerEl)
      .setName("Capture Folder")
      .setDesc("所有网页摘录会保存在这个 Vault 目录下。")
      .addText((text) => {
        text
          .setPlaceholder("Web Clippings")
          .setValue(this.plugin.settings.captureFolder)
          .onChange(async (value) => {
            this.plugin.settings.captureFolder = value.trim() || DEFAULT_SETTINGS.captureFolder;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Shared Secret")
      .setDesc("可选但建议设置。Chrome 扩展里需要填写同样的值。")
      .addText((text) => {
        text
          .setPlaceholder("local-secret")
          .setValue(this.plugin.settings.sharedSecret)
          .onChange(async (value) => {
            this.plugin.settings.sharedSecret = value.trim();
            await this.plugin.saveSettings();
          });
      });
  }
}

module.exports = NotedownBridgePlugin;
