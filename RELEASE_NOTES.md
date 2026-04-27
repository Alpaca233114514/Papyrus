# Release Notes

**版本**: v2.0.0-beta.4
**日期**: 2026-04-27

## 摘要

本次更新修复了聊天框与模型管理页之间的数据同步问题，补全了前后端聊天 API 的协议对齐，并优化了类型组织结构。

## 修复

- **聊天框模型同步** — 模型下拉菜单现在实时从 `/api/providers` 拉取数据库中的模型列表，替代原有的硬编码列表（Claude Sonnet 4 / GPT-4o 等）。用户在「模型管理」中添加、启用或禁用的模型会立即反映在聊天框中。
- **AI 配置解析修复** — `ChatPanel` 正确解包后端返回的 `{ success, config }` 响应结构，修复了此前 `aiConfig` 被错误赋值为包装对象、导致配置校验永远失败的 bug。
- **聊天 API 协议对齐**
  - 前端请求 URL 修正为 `/api/chat`（原为不存在的 `/api/ai/chat/stream`）
  - 请求体格式修正为 `{ message: string }`，与 Fastify 后端契约一致
  - SSE 流事件格式统一为 `{ type, data }`，前后端解析器对齐
- **模型覆盖支持** — 后端 `chatStream` 新增可选 `overrideModel` 参数，用户在前端选择的模型会被实际用于对话，而非始终使用全局默认模型。
- **文件附件降级处理** — 由于后端 Fastify 暂无 multipart 支持，前端暂时取消文件上传请求，改为将文件名拼接至消息文本中，避免 500 错误并保留用户意图。

## 重构

- 将 `AIConfig`、`ProviderModel` 等类型从 `ChatPanel.tsx` 提取至 `frontend/src/types/ai.ts`，减少组件文件体积并便于多页面复用。
