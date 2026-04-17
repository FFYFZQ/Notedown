import { getDocument, GlobalWorkerOptions } from "./vendor/pdfjs/legacy/build/pdf.mjs";
import { EventBus, PDFLinkService, PDFViewer } from "./vendor/pdfjs/legacy/web/pdf_viewer.mjs";

const DEFAULT_OPTIONS = {
  serverUrl: "http://127.0.0.1:27124",
  sharedSecret: ""
};

const PDF_BYPASS_TOKEN = "notedown-bypass-pdf";

const state = {
  tabId: null,
  sourceUrl: "",
  fetchUrl: "",
  documentTitle: "PDF 文档",
  initialPage: 1,
  pageCount: 0,
  pdfViewer: null,
  lastSelectionText: "",
  lastSelectionPageNumber: null,
  button: null,
  panel: null,
  textarea: null,
  preview: null,
  status: null,
  saveButton: null
};

const elements = {
  viewerContainer: document.getElementById("viewerContainer"),
  viewer: document.getElementById("viewer"),
  title: document.getElementById("documentTitle"),
  sourceLink: document.getElementById("sourceLink"),
  pageNumber: document.getElementById("pageNumber"),
  pageCount: document.getElementById("pageCount"),
  prevPage: document.getElementById("prevPage"),
  zoomOut: document.getElementById("zoomOut"),
  fitWidth: document.getElementById("fitWidth"),
  zoomIn: document.getElementById("zoomIn"),
  loadingState: document.getElementById("loadingState")
};

GlobalWorkerOptions.workerSrc = chrome.runtime.getURL("vendor/pdfjs/legacy/build/pdf.worker.mjs");
const workerModulePromise = import("./vendor/pdfjs/legacy/build/pdf.worker.mjs").then((module) => {
  globalThis.pdfjsWorker = module;
});

function setLoadingState(message, isError = false) {
  elements.loadingState.textContent = message;
  elements.loadingState.classList.toggle("error", isError);
  elements.loadingState.classList.toggle("hidden", !message);
}

function getSourceUrl() {
  const url = new URL(location.href);
  const sourceUrl = url.searchParams.get("src");
  if (!sourceUrl) {
    throw new Error("缺少 PDF 地址。");
  }

  return sourceUrl;
}

function parseInitialPage(url) {
  const [, hash = ""] = url.split("#");
  const params = new URLSearchParams(hash);
  const page = Number.parseInt(params.get("page") || "", 10);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function stripHash(url) {
  return url.split("#")[0];
}

function getTitleFromUrl(url) {
  try {
    const parsed = new URL(url);
    const fileName = parsed.pathname.split("/").filter(Boolean).pop();
    return fileName ? decodeURIComponent(fileName) : parsed.hostname;
  } catch {
    return "PDF 文档";
  }
}

function buildBypassUrl(url) {
  const [base, hash = ""] = url.split("#");
  const params = new URLSearchParams(hash);
  params.set(PDF_BYPASS_TOKEN, "1");
  const nextHash = params.toString();
  return nextHash ? `${base}#${nextHash}` : `${base}#${PDF_BYPASS_TOKEN}=1`;
}

function buildCapturedUrl(pageNumber) {
  return `${state.fetchUrl}#page=${pageNumber}`;
}

function updateToolbarPage(pageNumber) {
  elements.pageNumber.value = String(pageNumber || 1);
  elements.pageCount.textContent = `/ ${state.pageCount || 0}`;
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

function closeCapturePanel() {
  removePanel();
  removeQuickButton();
  state.lastSelectionText = "";
  state.lastSelectionPageNumber = null;
}

function setPanelStatus(message, isError = false) {
  if (!state.status) {
    return;
  }

  state.status.textContent = message;
  state.status.classList.toggle("error", isError);
}

function getSelection() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  const anchorNode = selection.anchorNode;
  if (!(anchorNode instanceof Node) || !elements.viewerContainer.contains(anchorNode)) {
    return null;
  }

  if (state.panel?.contains(anchorNode)) {
    return null;
  }

  return selection;
}

function getSelectionText() {
  const selection = getSelection();
  if (!selection) {
    return "";
  }

  return selection.toString().replace(/\s+\n/g, "\n").trim();
}

function getSelectionRect() {
  const selection = getSelection();
  if (!selection) {
    return null;
  }

  const rect = selection.getRangeAt(0).getBoundingClientRect();
  if (!rect || (rect.width === 0 && rect.height === 0)) {
    return null;
  }

  return rect;
}

function getSelectionPageNumber() {
  const selection = getSelection();
  if (!selection) {
    return null;
  }

  const anchorElement = selection.anchorNode instanceof Element
    ? selection.anchorNode
    : selection.anchorNode?.parentElement;
  const pageElement = anchorElement?.closest(".page");
  const pageNumber = Number.parseInt(pageElement?.dataset.pageNumber || "", 10);
  return Number.isInteger(pageNumber) && pageNumber > 0 ? pageNumber : null;
}

function updateSelectionCache() {
  const text = getSelectionText();
  if (!text) {
    return;
  }

  state.lastSelectionText = text;
  state.lastSelectionPageNumber = getSelectionPageNumber();
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
    state.lastSelectionPageNumber = getSelectionPageNumber();
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

    document.body.appendChild(button);
    state.button = button;
  }

  state.button.style.top = `${Math.min(window.innerHeight - 48, rect.bottom + 8)}px`;
  state.button.style.left = `${Math.max(12, Math.min(window.innerWidth - 160, rect.left))}px`;
  state.button.hidden = false;
}

function buildPanel(selectionText) {
  const panel = document.createElement("aside");
  panel.className = "notedown-panel";
  panel.innerHTML = `
    <div class="notedown-panel__header">
      <div>
        <strong>保存到 Obsidian</strong>
        <div class="notedown-panel__subtle">当前 PDF 的原文、页码和想法会一起写入 Markdown 文件</div>
      </div>
      <button type="button" class="notedown-icon-button" data-action="close" aria-label="关闭">×</button>
    </div>
    <div class="notedown-panel__section">
      <div class="notedown-panel__label">引用内容</div>
      <div class="notedown-panel__preview"></div>
    </div>
    <div class="notedown-panel__section">
      <label class="notedown-panel__label" for="notedown-note">问题 / 想法</label>
      <textarea id="notedown-note" placeholder="例如：这段和作者前面的结论有什么关系？"></textarea>
    </div>
    <div class="notedown-panel__footer">
      <div class="notedown-panel__status"></div>
      <div class="notedown-panel__actions">
        <button type="button" class="notedown-secondary-button" data-action="cancel">取消</button>
        <button type="button" class="notedown-primary-button" data-action="save">保存</button>
      </div>
    </div>
  `;

  document.body.appendChild(panel);

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

function openCapturePanel() {
  if (!state.lastSelectionText) {
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
  if (!serverUrl) {
    setPanelStatus("请先在设置里填写 Server URL。", true);
    return;
  }

  const pageNumber = state.lastSelectionPageNumber || state.pdfViewer?.currentPageNumber || 1;

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
        url: buildCapturedUrl(pageNumber),
        title: state.documentTitle,
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

function bindViewerUi() {
  elements.prevPage.addEventListener("click", () => {
    if (!state.pdfViewer) {
      return;
    }

    state.pdfViewer.currentPageNumber = Math.max(1, state.pdfViewer.currentPageNumber - 1);
  });

  elements.pageNumber.addEventListener("change", () => {
    if (!state.pdfViewer) {
      return;
    }

    const pageNumber = Number.parseInt(elements.pageNumber.value, 10);
    if (!Number.isInteger(pageNumber)) {
      updateToolbarPage(state.pdfViewer.currentPageNumber);
      return;
    }

    state.pdfViewer.currentPageNumber = Math.min(Math.max(pageNumber, 1), state.pageCount);
  });

  elements.zoomOut.addEventListener("click", () => {
    if (!state.pdfViewer) {
      return;
    }

    state.pdfViewer.currentScale = Math.max(0.5, state.pdfViewer.currentScale / 1.15);
  });

  elements.fitWidth.addEventListener("click", () => {
    if (state.pdfViewer) {
      state.pdfViewer.currentScaleValue = "page-width";
    }
  });

  elements.zoomIn.addEventListener("click", () => {
    if (!state.pdfViewer) {
      return;
    }

    state.pdfViewer.currentScale = Math.min(4, state.pdfViewer.currentScale * 1.15);
  });
}

async function loadPdfViewer() {
  await workerModulePromise;

  state.sourceUrl = getSourceUrl();
  state.fetchUrl = stripHash(state.sourceUrl);
  state.initialPage = parseInitialPage(state.sourceUrl);
  state.documentTitle = getTitleFromUrl(state.fetchUrl);

  elements.title.textContent = state.documentTitle;
  elements.sourceLink.textContent = state.fetchUrl;
  elements.sourceLink.href = buildBypassUrl(state.sourceUrl);

  const eventBus = new EventBus();
  const linkService = new PDFLinkService({ eventBus });
  const pdfViewer = new PDFViewer({
    container: elements.viewerContainer,
    viewer: elements.viewer,
    eventBus,
    linkService,
    textLayerMode: 1
  });

  linkService.setViewer(pdfViewer);
  state.pdfViewer = pdfViewer;

  eventBus.on("pagesinit", () => {
    pdfViewer.currentScaleValue = "page-width";
    pdfViewer.currentPageNumber = state.initialPage;
    updateToolbarPage(pdfViewer.currentPageNumber);
    setLoadingState("");
  });

  eventBus.on("pagechanging", ({ pageNumber }) => {
    updateToolbarPage(pageNumber);
  });

  setLoadingState("正在下载并渲染 PDF...");

  const response = await fetch(state.fetchUrl, { credentials: "include" });
  if (!response.ok) {
    throw new Error(`下载 PDF 失败：HTTP ${response.status}`);
  }

  const loadingTask = getDocument({
    data: new Uint8Array(await response.arrayBuffer()),
    cMapUrl: chrome.runtime.getURL("vendor/pdfjs/cmaps/"),
    cMapPacked: true,
    standardFontDataUrl: chrome.runtime.getURL("vendor/pdfjs/standard_fonts/")
  });

  const pdfDocument = await loadingTask.promise;
  state.pageCount = pdfDocument.numPages;
  updateToolbarPage(state.initialPage);

  linkService.setDocument(pdfDocument, state.fetchUrl);
  pdfViewer.setDocument(pdfDocument);

  const metadata = await pdfDocument.getMetadata().catch(() => null);
  const title = metadata?.info?.Title?.trim();
  if (title) {
    state.documentTitle = title;
    elements.title.textContent = title;
  }
}

function bindSelectionUi() {
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

  elements.viewerContainer.addEventListener("scroll", () => {
    removeQuickButton();
  }, { passive: true });
}

async function init() {
  bindViewerUi();
  bindSelectionUi();
  const currentTab = await chrome.tabs.getCurrent().catch(() => null);
  state.tabId = currentTab?.id ?? null;

  elements.sourceLink.addEventListener("click", (event) => {
    event.preventDefault();
    if (!state.tabId) {
      return;
    }

    void chrome.runtime.sendMessage({
      type: "OPEN_RAW_PDF",
      tabId: state.tabId,
      url: state.fetchUrl
    });
  });

  try {
    await loadPdfViewer();
  } catch (error) {
    console.error("Failed to load PDF in Notedown viewer:", error);
    elements.title.textContent = "PDF 加载失败";
    setLoadingState(error.message || "无法加载 PDF。", true);
  }
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type !== "OPEN_PDF_CAPTURE" || message.tabId !== state.tabId) {
    return;
  }

  if (message.selectionText) {
    state.lastSelectionText = message.selectionText.trim();
  }

  openCapturePanel();
});

void init();
