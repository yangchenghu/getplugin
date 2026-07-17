const elements = {
  form: document.querySelector("#settingsForm"),
  apiKey: document.querySelector("#apiKey"),
  clientId: document.querySelector("#clientId"),
  feedback: document.querySelector("#feedback"),
  saveButton: document.querySelector("#saveButton")
};

function sendMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response);
    });
  });
}

function showFeedback(message, tone = "success") {
  elements.feedback.textContent = message;
  elements.feedback.dataset.tone = tone;
  elements.feedback.hidden = false;
}

async function loadSettings() {
  try {
    const response = await sendMessage({ type: "credentials:get" });
    if (!response?.ok) throw new Error(response?.error?.message || "读取设置失败");

    elements.apiKey.value = response.data?.apiKey ?? "";
    elements.clientId.value = response.data?.clientId ?? "";
  } catch (error) {
    showFeedback(error.message, "error");
  }
}

async function saveSettings(event) {
  event.preventDefault();
  elements.saveButton.disabled = true;
  elements.saveButton.textContent = "正在保存…";

  try {
    const response = await sendMessage({
      type: "credentials:set",
      credentials: {
        apiKey: elements.apiKey.value,
        clientId: elements.clientId.value
      }
    });
    if (!response?.ok) throw new Error(response?.error?.message || "保存设置失败");

    showFeedback("设置已保存，现在可以使用扩展保存网页。");
  } catch (error) {
    showFeedback(error.message, "error");
  } finally {
    elements.saveButton.disabled = false;
    elements.saveButton.textContent = "保存设置";
  }
}

elements.form.addEventListener("submit", saveSettings);
await loadSettings();
