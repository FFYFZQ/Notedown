const MENU_ID = "notedown-save-selection";
const PDF_VIEWER_PAGE = "pdf-viewer.html";
const PDF_BYPASS_TOKEN = "notedown-bypass-pdf=1";
const rawPdfBypassTabs = new Set();

function getPdfViewerUrl(url) {
  const viewerUrl = new URL(chrome.runtime.getURL(PDF_VIEWER_PAGE));
  viewerUrl.searchParams.set("src", url);
  return viewerUrl.toString();
}

function sendPdfViewerMessage(tabId, selectionText = "") {
  chrome.runtime.sendMessage({
    type: "OPEN_PDF_CAPTURE",
    tabId,
    selectionText
  }, () => {
    void chrome.runtime.lastError;
  });
}

function getContentType(headers = []) {
  const match = headers.find((header) => header.name.toLowerCase() === "content-type");
  return (match?.value || "").toLowerCase();
}

function isPdfResponse(details) {
  const contentType = getContentType(details.responseHeaders);
  return contentType.includes("application/pdf");
}

function isLikelyPdfUrl(url) {
  if (!url || url.includes(PDF_BYPASS_TOKEN)) {
    return false;
  }

  if (url.startsWith(chrome.runtime.getURL(PDF_VIEWER_PAGE))) {
    return false;
  }

  try {
    const parsed = new URL(url);
    if (!["http:", "https:", "file:"].includes(parsed.protocol)) {
      return false;
    }

    return /\.pdf(?:$|[?#])/i.test(url);
  } catch {
    return false;
  }
}

chrome.runtime.onInstalled.addListener((details) => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ID,
      title: "保存到 Obsidian",
      contexts: ["selection"]
    });
  });

  if (details.reason === "install") {
    chrome.runtime.openOptionsPage();
  }
});

chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId !== 0 || !isLikelyPdfUrl(details.url)) {
    return;
  }

  chrome.tabs.update(details.tabId, { url: getPdfViewerUrl(details.url) }, () => {
    void chrome.runtime.lastError;
  });
});

chrome.webRequest.onHeadersReceived.addListener((details) => {
  if (details.type !== "main_frame" || details.tabId < 0) {
    return;
  }

  if (rawPdfBypassTabs.has(details.tabId)) {
    rawPdfBypassTabs.delete(details.tabId);
    return;
  }

  if (!isPdfResponse(details) || details.url.startsWith(chrome.runtime.getURL(PDF_VIEWER_PAGE))) {
    return;
  }

  chrome.tabs.update(details.tabId, { url: getPdfViewerUrl(details.url) }, () => {
    void chrome.runtime.lastError;
  });
}, { urls: ["<all_urls>"], types: ["main_frame"] }, ["responseHeaders"]);

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID || !tab?.id) {
    return;
  }

  sendPdfViewerMessage(tab.id, info.selectionText || "");
  chrome.tabs.sendMessage(tab.id, {
    type: "OPEN_CAPTURE",
    selectionText: info.selectionText || ""
  }, () => {
    void chrome.runtime.lastError;
  });
});

chrome.commands.onCommand.addListener((command) => {
  if (command !== "open-quick-capture") {
    return;
  }

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0];
    if (!activeTab?.id) {
      return;
    }

    sendPdfViewerMessage(activeTab.id);
    chrome.tabs.sendMessage(activeTab.id, { type: "OPEN_CAPTURE" }, () => {
      void chrome.runtime.lastError;
    });
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "OPEN_RAW_PDF") {
    return;
  }

  const tabId = message.tabId ?? sender.tab?.id;
  if (!tabId || !message.url) {
    sendResponse?.({ ok: false });
    return;
  }

  rawPdfBypassTabs.add(tabId);
  chrome.tabs.update(tabId, { url: message.url }, () => {
    void chrome.runtime.lastError;
    sendResponse?.({ ok: true });
  });

  return true;
});
