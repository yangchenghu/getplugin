import { isSavableUrl } from "./shared.js";

const elements = {
  settingsButton: document.querySelector("#settingsButton"),
  settingsDot: document.querySelector("#settingsDot"),
  pageHost: document.querySelector("#pageHost"),
  pageTitle: document.querySelector("#pageTitle"),
  knowledgeSelect: document.querySelector("#knowledgeSelect"),
  feedback: document.querySelector("#feedback"),
  saveButton: document.querySelector("#saveButton"),
  saveButtonText: document.querySelector("#saveButtonText")
};

const state = {
  tab: null,
  configured: false,
  saving: false
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

function hideFeedback() {
  elements.feedback.hidden = true;
  elements.feedback.textContent = "";
  delete elements.feedback.dataset.tone;
}

function updateButton() {
  const savable = isSavableUrl(state.tab?.url);
  elements.saveButton.disabled = !savable || state.saving;
  elements.saveButtonText.textContent = state.saving
    ? "正在保存…"
    : state.configured
      ? "保存到 Get笔记"
      : "先配置 API Key";
}

async function loadCurrentTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    state.tab = tab ?? null;

    if (!isSavableUrl(tab?.url)) {
      elements.pageHost.textContent = "当前页面不可保存";
      elements.pageTitle.textContent = "请打开普通网页后重试";
      showFeedback("Chrome 内部页面和扩展页面无法保存。", "info");
      updateButton();
      return;
    }

    const url = new URL(tab.url);
    elements.pageHost.textContent = url.hostname.replace(/^www\./, "");
    elements.pageTitle.textContent = tab.title?.trim() || "未命名网页";
    updateButton();
  } catch {
    showFeedback("无法读取当前页面。", "error");
  }
}

function renderTopics(topics, selectedTopicId) {
  const fragment = document.createDocumentFragment();
  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "全部笔记";
  fragment.append(defaultOption);

  topics.forEach((topic) => {
    const option = document.createElement("option");
    option.value = topic.id;
    option.textContent = topic.name;
    fragment.append(option);
  });

  elements.knowledgeSelect.replaceChildren(fragment);
  elements.knowledgeSelect.value = topics.some((topic) => topic.id === selectedTopicId)
    ? selectedTopicId
    : "";
}

async function loadKnowledgeBases() {
  elements.knowledgeSelect.disabled = true;

  try {
    const response = await sendMessage({ type: "knowledge:list" });
    if (!response?.ok) throw new Error(response?.error?.message || "获取知识库失败");

    const { selectedTopicId = "" } = await chrome.storage.local.get("selectedTopicId");
    renderTopics(response.data?.topics ?? [], selectedTopicId);
  } catch (error) {
    renderTopics([], "");
    showFeedback(`${error.message}，仍可保存到全部笔记。`, "error");
  } finally {
    elements.knowledgeSelect.disabled = false;
  }
}

async function loadConfiguration() {
  try {
    const response = await sendMessage({ type: "credentials:get" });
    if (!response?.ok) throw new Error(response?.error?.message || "读取设置失败");

    state.configured = Boolean(response.data?.configured);
    elements.settingsDot.classList.toggle("is-configured", state.configured);
    updateButton();

    if (state.configured) {
      await loadKnowledgeBases();
    } else {
      showFeedback("首次使用请先在设置中填写 API Key。", "info");
    }
  } catch (error) {
    showFeedback(error.message, "error");
  }
}

async function saveCurrentPage() {
  if (!state.configured) {
    await chrome.runtime.openOptionsPage();
    return;
  }
  if (!isSavableUrl(state.tab?.url) || state.saving) return;

  hideFeedback();
  state.saving = true;
  updateButton();

  try {
    const response = await sendMessage({
      type: "note:save",
      note: {
        title: state.tab.title,
        url: state.tab.url,
        topicId: elements.knowledgeSelect.value
      }
    });
    if (!response?.ok) throw new Error(response?.error?.message || "保存失败");

    const destination = elements.knowledgeSelect.value
      ? `「${elements.knowledgeSelect.selectedOptions[0].textContent}」`
      : "Get笔记";
    const queued = response.data?.state === "queued";
    showFeedback(queued ? `已提交到${destination}，正在解析文章。` : `已保存到${destination}。`);
  } catch (error) {
    showFeedback(error.message, "error");
  } finally {
    state.saving = false;
    updateButton();
  }
}

elements.settingsButton.addEventListener("click", () => chrome.runtime.openOptionsPage());
elements.saveButton.addEventListener("click", saveCurrentPage);
elements.knowledgeSelect.addEventListener("change", () => {
  chrome.storage.local.set({ selectedTopicId: elements.knowledgeSelect.value });
});

await Promise.all([loadCurrentTab(), loadConfiguration()]);
