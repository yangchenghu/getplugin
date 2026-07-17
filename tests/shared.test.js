import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSavePayload,
  isSavableUrl,
  normalizeCredentials,
  parseApiError,
  parseCopiedCredentials,
  parseTopics,
  validateCredentials
} from "../src/shared.js";

test("normalizeCredentials trims values without exposing or rewriting them", () => {
  assert.deepEqual(normalizeCredentials({ apiKey: "  gk_live_demo  ", clientId: " cli_demo " }), {
    apiKey: "gk_live_demo",
    clientId: "cli_demo"
  });
});

test("parseCopiedCredentials reads the complete one-click copy format", () => {
  const copiedText = [
    "得到大脑 API Key: Chrome",
    "API Key: gk_live_example.not-a-real-secret",
    "Client ID: cli_example_not_real"
  ].join("\r\n");

  assert.deepEqual(parseCopiedCredentials(copiedText), {
    apiKey: "gk_live_example.not-a-real-secret",
    clientId: "cli_example_not_real"
  });
});

test("parseCopiedCredentials ignores the product heading and supports Chinese colons", () => {
  assert.deepEqual(parseCopiedCredentials("得到大脑 API Key: Chrome\nAPI Key： gk_demo\nClient ID： cli_demo"), {
    apiKey: "gk_demo",
    clientId: "cli_demo"
  });
  assert.deepEqual(parseCopiedCredentials("得到大脑 API Key: Chrome"), {
    apiKey: "",
    clientId: ""
  });
});

test("validateCredentials requires both documented credential prefixes", () => {
  assert.equal(validateCredentials({ apiKey: "gk_live_demo", clientId: "cli_demo" }).valid, true);
  assert.deepEqual(validateCredentials({ apiKey: "token", clientId: "cli_demo" }), {
    valid: false,
    message: "API Key 应以 gk_ 开头"
  });
});

test("isSavableUrl only accepts web URLs", () => {
  assert.equal(isSavableUrl("https://example.com/article"), true);
  assert.equal(isSavableUrl("http://localhost:3000"), true);
  assert.equal(isSavableUrl("chrome://extensions"), false);
  assert.equal(isSavableUrl("not a url"), false);
});

test("buildSavePayload creates the documented link payload", () => {
  assert.deepEqual(
    buildSavePayload({
      title: "  文章标题  ",
      url: "https://example.com/article",
      topicId: " topic-1 "
    }),
    {
      note_type: "link",
      link_url: "https://example.com/article",
      title: "文章标题",
      topic_id: "topic-1"
    }
  );
});

test("buildSavePayload omits optional fields and rejects internal pages", () => {
  assert.deepEqual(buildSavePayload({ url: "https://example.com" }), {
    note_type: "link",
    link_url: "https://example.com"
  });
  assert.throws(() => buildSavePayload({ url: "chrome://extensions" }), /cannot|not|\u4e0d是/u);
});

test("parseTopics normalizes the documented nested response", () => {
  assert.deepEqual(
    parseTopics({
      data: {
        topics: [
          { topic_id: "kb-1", name: "产品", description: "产品资料", stats: { note_count: 12 } },
          { topic_id: "", name: "无效项" }
        ]
      }
    }),
    [{ id: "kb-1", name: "产品", description: "产品资料", noteCount: 12 }]
  );
});

test("parseApiError prioritizes quota reasons and documented codes", () => {
  assert.equal(parseApiError({ error: { reason: "quota_day" } }, 429), "今日 API 配额已用完");
  assert.equal(parseApiError({ code: 10001 }, 401), "API Key 或 Client ID 无效");
  assert.equal(parseApiError({}, 403), "API Key 、Client ID 或应用权限无效");
});
