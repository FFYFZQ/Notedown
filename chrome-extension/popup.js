const DEFAULT_OPTIONS = {
  serverUrl: "http://127.0.0.1:27124",
  sharedSecret: ""
};

const state = {
  activeTab: null
};

const sourceElement = document.getElementById("source");
const quoteInput = document.getElementById("quote");
const noteInput = document.getElementById("note");
const statusElement = document.getElementById("status");
const saveButton = document.getElementById("save");
const settingsButton = document.getElementById("open-settings");

function setStatus(message, isError = false) {
  statusElement.textContent = message;
  statusElement.classList.toggle("error", isError);
}

async function loadOptions() {
  return chrome.storage.local.get(DEFAULT_OPTIONS);
}

function formatSource(tab) {
  if (!tab?.url) {
    return "当前页面信息不可用。";
  }

  const title = tab.title || "未命名页面";
  return `${title}\n${tab.url}`;
}

async function loadActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  state.activeTab = tabs[0] || null;
  sourceElement.textContent = formatSource(state.activeTab);
}

async function saveCapture() {
  const quote = quoteInput.value.trim();
  const note = noteInput.value.trim();

  if (!quote) {
    setStatus("请先粘贴要保存的 PDF 文字。", true);
    quoteInput.focus();
    return;
  }

  if (!state.activeTab?.url) {
    setStatus("无法读取当前标签页信息。", true);
    return;
  }

  const options = await loadOptions();
  const serverUrl = (options.serverUrl || DEFAULT_OPTIONS.serverUrl).trim().replace(/\/+$/, "");
  if (!serverUrl) {
    setStatus("请先在设置里填写 Server URL。", true);
    return;
  }

  saveButton.disabled = true;
  setStatus("正在保存...");

  try {
    const response = await fetch(`${serverUrl}/capture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Notedown-Token": options.sharedSecret || ""
      },
      body: JSON.stringify({
        url: state.activeTab.url,
        title: state.activeTab.title || "未命名 PDF",
        selection: quote,
        note,
        capturedAt: new Date().toISOString()
      })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || `HTTP ${response.status}`);
    }

    setStatus(`已保存到 ${payload.filePath}`);
    quoteInput.value = "";
    noteInput.value = "";
  } catch (error) {
    setStatus(`保存失败：${error.message}`, true);
  } finally {
    saveButton.disabled = false;
  }
}

saveButton.addEventListener("click", () => {
  void saveCapture();
});

settingsButton.addEventListener("click", () => {
  void chrome.runtime.openOptionsPage();
});

void loadActiveTab();
