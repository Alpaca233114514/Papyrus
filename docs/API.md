# Papyrus API 文档

Base URL: `/api`

---

## 健康检查

### GET /health
检查服务状态。

**响应:**
```json
{ "status": "ok" }
```

---

## 卡片管理 (Cards)

### GET /cards
列出所有卡片。

**响应:**
```json
{
  "success": true,
  "cards": [
    { "id": "...", "q": "问题", "a": "答案", "next_review": 1234567890, "interval": 1.0 }
  ],
  "count": 1
}
```

### POST /cards
创建卡片。

**请求体:**
```json
{ "q": "问题", "a": "答案" }
```

**响应:**
```json
{ "success": true, "card": { ... } }
```

### DELETE /cards/{id}
删除卡片。

---

## 复习 (Review)

### GET /review/next
获取下一张到期卡片。

**响应:**
```json
{
  "success": true,
  "card": { ... },
  "due_count": 5,
  "total_count": 100
}
```

### POST /review/{id}/rate
评分卡片。

**请求体:**
```json
{ "grade": 1|2|3 }  // 1=忘记, 2=模糊, 3=秒杀
```

---

## 笔记管理 (Notes)

### GET /notes
列出所有笔记。

**响应:**
```json
{
  "success": true,
  "notes": [
    {
      "id": "123",
      "title": "笔记标题",
      "folder": "文件夹",
      "content": "完整内容",
      "preview": "预览前100字...",
      "tags": ["tag1", "tag2"],
      "created_at": 1234567890,
      "updated_at": 1234567890,
      "word_count": 1000
    }
  ],
  "count": 1
}
```

### POST /notes
创建笔记。

**请求体:**
```json
{
  "title": "标题",
  "folder": "文件夹",
  "content": "内容",
  "tags": ["标签"]
}
```

### GET /notes/{id}
获取单个笔记。

### PATCH /notes/{id}
更新笔记（部分更新）。

**请求体:**
```json
{
  "title": "新标题",      // 可选
  "folder": "新文件夹",   // 可选
  "content": "新内容",    // 可选
  "tags": ["新标签"]      // 可选
}
```

### DELETE /notes/{id}
删除笔记。

---

## 导入 (Import)

### POST /notes/import/obsidian
从 Obsidian Vault 导入笔记。

**请求体:**
```json
{
  "vault_path": "/path/to/obsidian/vault",
  "exclude_folders": [".obsidian", ".git"]  // 可选，默认排除
}
```

**响应:**
```json
{
  "success": true,
  "imported": 10,
  "skipped": 2,
  "errors": []
}
```

**说明:**
- 自动解析 Markdown frontmatter (`---` 包裹的 YAML)
- 自动转换 WikiLinks `[[Note]]` 为纯文本
- 自动提取 inline tags `#tag`
- 保持文件夹结构
- 基于文件修改时间去重/更新

---

## 前端调用示例

```typescript
import { api } from './api';

// 获取笔记列表
const { notes } = await api.listNotes();

// 创建笔记
await api.createNote('标题', '文件夹', '内容', ['标签']);

// 更新笔记
await api.updateNote('note-id', { title: '新标题', content: '新内容' });

// 从 Obsidian 导入
const result = await api.importObsidian('/path/to/vault');
console.log(`导入 ${result.imported} 条，跳过 ${result.skipped} 条`);
```

---

## 预留/规划中的 API

> ⚠️ 以下接口尚未实现，仅作为设计参考

### 文件管理 (Files)
```
GET    /files              # 列出文件
POST   /files/upload      # 上传文件
GET    /files/{id}/download
DELETE /files/{id}
```

### 扩展管理 (Extensions)
```
GET    /extensions         # 列出已安装扩展
POST   /extensions/install
DELETE /extensions/{name}
POST   /extensions/{name}/enable
POST   /extensions/{name}/disable
```

### 设置 (Settings)
```
GET    /settings           # 获取所有设置
PATCH  /settings           # 更新设置
GET    /settings/obsidian  # 获取 Obsidian 路径
PUT    /settings/obsidian  # 设置 Obsidian 路径
```

### 同步 (Sync)
```
POST   /sync/export        # 导出数据
POST   /sync/import        # 导入数据
GET    /sync/status        # 同步状态
```
