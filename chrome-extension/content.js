const DEFAULT_OPTIONS = {
  serverUrl: "http://127.0.0.1:27124",
  sharedSecret: ""
};

const state = {
  lastSelectionText: "",
  button: null,
  panel: null,
  textarea: null,
  preview: null,
  status: null,
  saveButton: null
};

function getSelectionText() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return getActiveElementSelectionText();
  }

  const text = selection.toString().replace(/\s+\n/g, "\n").trim();
  if (!text) {
    return "";
  }

  const anchorNode = selection.anchorNode;
  if (anchorNode && state.panel?.contains(anchorNode)) {
    return "";
  }

  return text;
}

function getActiveElementSelectionText() {
  const active = document.activeElement;
  if (!active) {
    return "";
  }

  if (
    active instanceof HTMLTextAreaElement ||
    (active instanceof HTMLInputElement && typeof active.selectionStart === "number")
  ) {
    const start = active.selectionStart ?? 0;
    const end = active.selectionEnd ?? 0;
    if (end <= start) {
      return "";
    }

    return active.value.slice(start, end).trim();
  }

  if (active instanceof HTMLElement && active.isContentEditable) {
    const text = active.ownerDocument?.getSelection?.()?.toString().trim() || "";
    return text;
  }

  return "";
}

function updateSelectionCache() {
  const text = getSelectionText();
  if (text) {
    state.lastSelectionText = text;
  }
}

function removeQuickButton() {
  state.button?.remove();
  state.button = null;
}

function removePanel() {
  state.panel?.remove();
  state.panel = null;
  state.textarea = null;
  state.preview = null;
  state.status = null;
  state.saveButton = null;
}

function setPanelStatus(message, isError = false) {
  if (!state.status) {
    return;
  }

  state.status.textContent = message;
  state.status.classList.toggle("error", isError);
}

function getSelectionRect() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  if (!rect || (rect.width === 0 && rect.height === 0)) {
    return null;
  }

  return rect;
}

function previewText(text) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= 240) {
    return normalized;
  }

  return `${normalized.slice(0, 240)}...`;
}

function showQuickButton() {
  const text = getSelectionText();
  if (text) {
    state.lastSelectionText = text;
  }

  if (!text) {
    removeQuickButton();
    return;
  }

  const rect = getSelectionRect();
  if (!rect) {
    removeQuickButton();
    return;
  }

  if (!state.button) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "notedown-floating-button";
    button.textContent = "记到 Obsidian";
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openCapturePanel();
    });

    document.documentElement.appendChild(button);
    state.button = button;
  }

  state.button.style.top = `${window.scrollY + rect.bottom + 8}px`;
  state.button.style.left = `${window.scrollX + rect.left}px`;
  state.button.hidden = false;
}

function closeCapturePanel() {
  removePanel();
  removeQuickButton();
  state.lastSelectionText = "";
}

function buildPanel(selectionText) {
  const panel = document.createElement("aside");
  panel.className = "notedown-panel";
  panel.innerHTML = `
    <div class="notedown-panel__header">
      <div>
        <strong>保存到 Obsidian</strong>
        <div class="notedown-panel__subtle">当前页面会自动写入对应文章的 Markdown 文件</div>
      </div>
      <button type="button" class="notedown-icon-button" data-action="close" aria-label="关闭">×</button>
    </div>
    <div class="notedown-panel__section">
      <div class="notedown-panel__label">引用内容</div>
      <div class="notedown-panel__preview"></div>
    </div>
    <div class="notedown-panel__section">
      <label class="notedown-panel__label" for="notedown-note">问题 / 想法</label>
      <textarea id="notedown-note" placeholder="例如：这里作者为什么这样论证？这段和我之前的笔记有什么冲突？"></textarea>
    </div>
    <div class="notedown-panel__footer">
      <div class="notedown-panel__status"></div>
      <div class="notedown-panel__actions">
        <button type="button" class="notedown-secondary-button" data-action="cancel">取消</button>
        <button type="button" class="notedown-primary-button" data-action="save">保存</button>
      </div>
    </div>
  `;

  document.documentElement.appendChild(panel);

  state.panel = panel;
  state.textarea = panel.querySelector("textarea");
  state.preview = panel.querySelector(".notedown-panel__preview");
  state.status = panel.querySelector(".notedown-panel__status");
  state.saveButton = panel.querySelector(".notedown-primary-button");

  state.preview.textContent = previewText(selectionText);
  state.textarea.focus();

  panel.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const action = target.dataset.action;
    if (action === "close" || action === "cancel") {
      closeCapturePanel();
      return;
    }

    if (action === "save") {
      void submitCapture();
    }
  });
}

function getActiveSelectionText() {
  return getSelectionText() || state.lastSelectionText;
}

function openCapturePanel(preselectedText = "") {
  if (preselectedText) {
    state.lastSelectionText = preselectedText.trim();
  } else if (!state.lastSelectionText) {
    updateSelectionCache();
  }

  const selectionText = getActiveSelectionText();
  if (!selectionText) {
    removeQuickButton();
    return;
  }

  if (state.panel) {
    state.preview.textContent = previewText(selectionText);
    state.textarea?.focus();
    return;
  }

  removeQuickButton();
  buildPanel(selectionText);
}

async function loadOptions() {
  return chrome.storage.local.get(DEFAULT_OPTIONS);
}

async function submitCapture() {
  const selection = getActiveSelectionText();
  const note = state.textarea?.value.trim() || "";

  if (!selection) {
    setPanelStatus("没有可保存的选中文本。", true);
    return;
  }

  const options = await loadOptions();
  const serverUrl = (options.serverUrl || DEFAULT_OPTIONS.serverUrl).replace(/\/+$/, "");

  state.saveButton.disabled = true;
  setPanelStatus("正在保存...");

  try {
    const response = await fetch(`${serverUrl}/capture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Notedown-Token": options.sharedSecret || ""
      },
      body: JSON.stringify({
        url: location.href,
        title: document.title || location.hostname,
        selection,
        note,
        capturedAt: new Date().toISOString()
      })
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload.error || `HTTP ${response.status}`);
    }

    setPanelStatus(`已保存到 ${payload.filePath}`);
    window.getSelection()?.removeAllRanges();

    window.setTimeout(() => {
      closeCapturePanel();
    }, 900);
  } catch (error) {
    setPanelStatus(`保存失败：${error.message}`, true);
  } finally {
    if (state.saveButton) {
      state.saveButton.disabled = false;
    }
  }
}

document.addEventListener("mouseup", () => {
  window.setTimeout(showQuickButton, 0);
});

document.addEventListener("selectionchange", () => {
  window.setTimeout(updateSelectionCache, 0);
});

document.addEventListener("keyup", (event) => {
  if (event.key === "Escape") {
    closeCapturePanel();
    return;
  }

  window.setTimeout(showQuickButton, 0);
});

document.addEventListener("mousedown", (event) => {
  const target = event.target;
  if (!(target instanceof Node)) {
    return;
  }

  if (state.panel?.contains(target) || state.button?.contains(target)) {
    return;
  }

  removeQuickButton();
});

window.addEventListener("scroll", () => {
  removeQuickButton();
}, { passive: true });

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "OPEN_CAPTURE") {
    openCapturePanel(message.selectionText || "");
  }
});
