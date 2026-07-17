import {
  API_BASE_URL,
  buildSavePayload,
  normalizeCredentials,
  parseApiError,
  parseTopics,
  validateCredentials
} from "./shared.js";

class UserFacingError extends Error {
  constructor(message, code = "request_failed") {
    super(message);
    this.name = "UserFacingError";
    this.code = code;
  }
}

async function readCredentials() {
  const stored = await chrome.storage.local.get(["apiKey", "clientId"]);
  return normalizeCredentials(stored);
}

async function requireCredentials() {
  const credentials = await readCredentials();
  const validation = validateCredentials(credentials);

  if (!validation.valid) {
    throw new UserFacingError("请先配置 API Key 和 Client ID", "missing_credentials");
  }

  return validation.credentials;
}

async function apiRequest(path, { method = "GET", body } = {}) {
  const { apiKey, clientId } = await requireCredentials();
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        Authorization: apiKey,
        "X-Client-ID": clientId,
        ...(body ? { "Content-Type": "application/json" } : {})
      },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
  } catch {
    throw new UserFacingError("无法连接 Get笔记，请检查网络后重试", "network_error");
  }

  const rawText = await response.text();
  let payload = {};

  if (rawText) {
    try {
      payload = JSON.parse(rawText);
    } catch {
      throw new UserFacingError(`Get笔记返回了无法识别的响应（${response.status}）`);
    }
  }

  const apiFailed = payload?.success === false || (Number(payload?.code) !== 0 && payload?.code != null);
  if (!response.ok || apiFailed) {
    throw new UserFacingError(parseApiError(payload, response.status), "api_error");
  }

  return payload;
}

async function getKnowledgeBases() {
  const payload = await apiRequest("/resource/knowledge/list?page=1");
  return { topics: parseTopics(payload) };
}

async function saveLink(input) {
  const payload = await apiRequest("/resource/note/save", {
    method: "POST",
    body: buildSavePayload(input)
  });
  const data = payload?.data ?? {};
  const task = Array.isArray(data.tasks) ? data.tasks[0] : null;

  if (data.note_id) {
    return { state: "saved", noteId: String(data.note_id) };
  }

  if (task?.task_id) {
    return { state: "queued", taskId: String(task.task_id) };
  }

  return { state: "submitted" };
}

async function handleMessage(message = {}) {
  switch (message.type) {
    case "credentials:get": {
      const credentials = await readCredentials();
      return {
        ok: true,
        data: {
          ...credentials,
          configured: validateCredentials(credentials).valid
        }
      };
    }

    case "credentials:set": {
      const validation = validateCredentials(message.credentials);
      if (!validation.valid) {
        throw new UserFacingError(validation.message, "invalid_credentials");
      }
      await chrome.storage.local.set(validation.credentials);
      return { ok: true, data: { configured: true } };
    }

    case "knowledge:list":
      return { ok: true, data: await getKnowledgeBases() };

    case "note:save":
      return { ok: true, data: await saveLink(message.note) };

    default:
      throw new UserFacingError("不支持的扩展请求", "unsupported_request");
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message)
    .then(sendResponse)
    .catch((error) => {
      sendResponse({
        ok: false,
        error: {
          code: error?.code ?? "unexpected_error",
          message: error?.message ?? "发生未知错误"
        }
      });
    });

  return true;
});
