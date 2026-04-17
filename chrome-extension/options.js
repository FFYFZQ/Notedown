const DEFAULT_OPTIONS = {
  serverUrl: "http://127.0.0.1:27124",
  sharedSecret: ""
};

const form = document.getElementById("settings-form");
const statusElement = document.getElementById("status");
const testButton = document.getElementById("test-connection");
const serverUrlInput = document.getElementById("serverUrl");
const sharedSecretInput = document.getElementById("sharedSecret");

function setStatus(message, isError = false) {
  statusElement.textContent = message;
  statusElement.classList.toggle("error", isError);
}

async function loadOptions() {
  const stored = await chrome.storage.local.get(DEFAULT_OPTIONS);
  serverUrlInput.value = stored.serverUrl;
  sharedSecretInput.value = stored.sharedSecret;
}

async function saveOptions(event) {
  event.preventDefault();

  const data = {
    serverUrl: serverUrlInput.value.trim().replace(/\/+$/, ""),
    sharedSecret: sharedSecretInput.value.trim()
  };

  await chrome.storage.local.set(data);
  setStatus("设置已保存。");
}

async function testConnection() {
  const serverUrl = serverUrlInput.value.trim().replace(/\/+$/, "");
  const sharedSecret = sharedSecretInput.value.trim();

  if (!serverUrl) {
    setStatus("请先填写 Server URL。", true);
    return;
  }

  setStatus("正在测试连接...");

  try {
    const response = await fetch(`${serverUrl}/health`, {
      method: "GET",
      headers: {
        "X-Notedown-Token": sharedSecret
      }
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload.error || `HTTP ${response.status}`);
    }

    setStatus(`连接成功。Vault 目录已监听，当前保存目录：${payload.captureFolder || "未知"}`);
  } catch (error) {
    setStatus(`连接失败：${error.message}`, true);
  }
}

form.addEventListener("submit", (event) => {
  void saveOptions(event);
});

testButton.addEventListener("click", () => {
  void testConnection();
});

void loadOptions();

