export const API_BASE_URL = "https://openapi.biji.com/open/api/v1";

export const ERROR_MESSAGES = {
  10000: "请求参数有误",
  10001: "API Key 或 Client ID 无效",
  10100: "请求的数据不存在",
  10201: "当前账号需要开通会员",
  10202: "请求过于频繁，请稍后再试",
  30000: "Get笔记服务暂时不可用",
  42900: "今日或本月的 API 配额已用完",
  50000: "Get笔记服务发生错误"
};

export function normalizeCredentials(credentials = {}) {
  return {
    apiKey: String(credentials.apiKey ?? "").trim(),
    clientId: String(credentials.clientId ?? "").trim()
  };
}

export function parseCopiedCredentials(value = "") {
  const lines = String(value).replace(/\r\n?/g, "\n").split("\n");
  const readValue = (label) => {
    const pattern = new RegExp(`^\\s*${label}\\s*[:：]\\s*(.+?)\\s*$`, "i");
    return lines.map((line) => line.match(pattern)?.[1]).find(Boolean) ?? "";
  };

  return normalizeCredentials({
    apiKey: readValue("API\\s*Key"),
    clientId: readValue("Client\\s*ID")
  });
}

export function validateCredentials(credentials = {}) {
  const normalized = normalizeCredentials(credentials);

  if (!normalized.apiKey || !normalized.clientId) {
    return { valid: false, message: "请填写 API Key 和 Client ID" };
  }

  if (!normalized.apiKey.startsWith("gk_")) {
    return { valid: false, message: "API Key 应以 gk_ 开头" };
  }

  if (!normalized.clientId.startsWith("cli_")) {
    return { valid: false, message: "Client ID 应以 cli_ 开头" };
  }

  return { valid: true, credentials: normalized };
}

export function isSavableUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function buildSavePayload({ title, url, topicId } = {}) {
  if (!isSavableUrl(url)) {
    throw new TypeError("当前页面不是可保存的网页链接");
  }

  const payload = {
    note_type: "link",
    link_url: url
  };
  const normalizedTitle = String(title ?? "").trim();
  const normalizedTopicId = String(topicId ?? "").trim();

  if (normalizedTitle) payload.title = normalizedTitle;
  if (normalizedTopicId) payload.topic_id = normalizedTopicId;

  return payload;
}

export function parseTopics(payload = {}) {
  const candidates = payload?.data?.topics ?? payload?.topics ?? [];

  if (!Array.isArray(candidates)) return [];

  return candidates
    .map((topic) => ({
      id: String(topic?.topic_id ?? "").trim(),
      name: String(topic?.name ?? "").trim(),
      description: String(topic?.description ?? "").trim(),
      noteCount: Number(topic?.stats?.note_count ?? 0)
    }))
    .filter((topic) => topic.id && topic.name);
}

export function parseApiError(payload = {}, status = 0) {
  const code = Number(payload?.code ?? payload?.error?.code ?? 0);
  const reason = payload?.error?.reason;
  const detail = payload?.message ?? payload?.error?.message;

  if (reason === "quota_day") return "今日 API 配额已用完";
  if (reason === "quota_month") return "本月 API 配额已用完";
  if (reason === "not_member") return "当前账号需要开通会员";
  if (reason === "qps_global" || reason === "qps_bucket") {
    return "请求过于频繁，请稍后再试";
  }
  if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
  if (detail) return String(detail);
  if (status === 401 || status === 403) return "API Key 、Client ID 或应用权限无效";
  if (status === 429) return "请求过于频繁或 API 配额已用完";
  return `Get笔记接口请求失败${status ? `（${status}）` : ""}`;
}
