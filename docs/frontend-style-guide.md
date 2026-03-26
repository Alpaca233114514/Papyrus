# Papyrus 前端样式规范

## 1. 边距系统

统一使用 **8px** 作为基础单位（grid system）。

### 允许使用的边距值
| 值 | 使用场景 |
|----|---------|
| `4px` | 最小粒度，用于紧凑间距 |
| `8px` | 基础间距，按钮内边距、小间隙 |
| `16px` | 标准间距，卡片内边距、元素间距 |
| `24px` | 大间距，区块间距 |
| `32px` | 更大间距，页面级间距 |
| `48px` | 大区块间距 |
| `64px` | 页面边距 |

### 禁止使用的值
以下值不符合规范，应避免使用：
- `2px`, `3px`, `5px`, `6px`, `7px` 等奇数或小于4的值
- `10px`, `12px`, `14px`, `18px`, `20px`, `28px` 等非8的倍数
- `22px`, `26px` 等不规则值

### 例外情况
- **边框**: `1px` 允许使用
- **圆角**: `2px`, `3px`, `4px`, `6px`, `8px`, `12px`, `16px` 允许使用
- **分割线**: `1px` 允许使用

---

## 2. 标题样式规范

### 字体层级

| 层级 | 字号 | 字重 | 行高 | 用途 |
|------|------|------|------|------|
| 一级标题 (H1) | `40px` | `400` | `1` | 页面主标题，如"开始"、"卷轴"、"数据" |
| 二级标题 (H2) | `24px` | `400` | `1` | 区块标题，如"书架" |
| 三级标题 (H3) | `20px` | `400` | `1` | 子区块标题 |
| 正文强调 | `16px` | `600` | `1.4` | 卡片标题、重要文字 |
| 正文 | `14px` | `400` | `1.5-1.8` | 普通文本 |
| 辅助文字 | `12px` | `400` | `1.4` | 说明、标签 |

### 标题样式示例

```tsx
// 一级标题 - 页面主标题
<Typography.Title
  heading={1}
  style={{ fontWeight: 400, lineHeight: 1, margin: 0, fontSize: '40px' }}
>
  页面标题
</Typography.Title>

// 二级标题 - 区块标题
<Typography.Title
  heading={2}
  style={{ fontWeight: 400, lineHeight: 1, margin: '0 0 24px', fontSize: '24px' }}
>
  区块标题
</Typography.Title>
```

---

## 3. 页面边距规范

### 标准页面内边距
```tsx
<div style={{ padding: '48px 64px 64px' }}>
  {/* 页面内容 */}
</div>
```

### 内容区块间距
- 标题与内容之间: `32px` (marginBottom)
- 区块之间: `32px` 或 `40px`
- 卡片网格间距: `16px` (gap)

---

## 4. 卡片样式规范

### 通用卡片样式
```tsx
const useCardStyle = (hovered: boolean) => ({
  borderRadius: '16px',
  border: `1px solid ${hovered ? PRIMARY_COLOR : 'var(--color-text-3)'}`,
  background: hovered ? `${PRIMARY_COLOR}08` : 'var(--color-bg-1)',
  transition: 'border-color 0.2s, background 0.2s',
  cursor: 'pointer',
});
```

### 卡片内边距
- 标准卡片: `24px` (padding)
- 紧凑卡片: `16px` (padding)

---

## 5. 按钮样式规范

### 统一按钮样式
```tsx
const UNIFIED_BTN_STYLE = {
  height: '40px',
  borderRadius: '20px',
  padding: '0 20px',
  fontSize: '14px',
};
```

### 主色调
```tsx
const PRIMARY_COLOR = '#206CCF';
const SUCCESS_COLOR = '#00B42A';
```

---

## 6. 颜色使用规范

### 主题色
| 颜色名称 | 色值 | 用途 |
|---------|------|------|
| 主色 | `#206CCF` | 按钮背景、卡片边框悬停、重要操作 |
| 次要色 | `#57A9FB` | 文字/图标悬停、边框聚焦、点缀高亮 |
| 成功色 | `#00B42A` | 成功状态、完成提示 |
| 警告色 | `#FF7D00` | 警告提示、需要注意的信息 |
| 危险色 | `#F53F3F` | 删除、错误、危险操作 |

### 次要色使用场景
次要色 `#57A9FB` 用于点缀、悬停状态、辅助高亮：

| 场景 | 使用方式 | 示例 |
|------|---------|------|
| 图标悬停 | 文字/图标悬停时变为次要色 | 状态栏锁定图标 |
| 文字链接悬停 | 链接文字悬停时使用 | 设置页返回按钮 |
| 搜索框边框 | 聚焦/悬停时边框变为次要色 | 顶部搜索栏 |
| 侧边栏菜单 | 悬停和激活状态的文字颜色 | 左侧导航栏 |
| 顶部菜单 | 菜单项悬停文字颜色 | 标题栏菜单 |

### 主色与次要色区分
- **主色 `#206CCF`**: 用于按钮背景、卡片边框悬停、重要操作（如保存、确认）
- **次要色 `#57A9FB`**: 用于文字/图标悬停、边框聚焦、点缀高亮（如导航、链接）

### 文本颜色 (使用 CSS 变量)
- 主要文字: `var(--color-text-1)`
- 次要文字: `var(--color-text-2)`
- 辅助文字: `var(--color-text-3)`
- 禁用文字: `var(--color-text-4)`

### 背景颜色 (使用 CSS 变量)
- 主背景: `var(--color-bg-1)`
- 次背景: `var(--color-bg-2)`
- 填充色: `var(--color-fill-2)`
- 边框色: `var(--color-border-2)`

---

## 6.1 无障碍对比度标准（WCAG 2.1 AAA 级）

本项目要求 **WCAG 2.1 AAA 级**对比度标准：

| 文本类型 | 定义 | 要求对比度 | 对应 Arco 变量 |
|---------|------|-----------|---------------|
| **小文本** | < 19px 粗体 或 < 24px 常规 | **≥ 7:1** | `--color-text-1`, `--color-text-2` |
| **大文本** | ≥ 19px 粗体 或 ≥ 24px 常规 | **≥ 4.5:1** | `--color-text-2`, `--color-text-3` |

### 色值对比度表（浅色模式 #FFFFFF 背景）

| 变量名 | 色值 | 对比度 | 小文本(≥7:1) | 大文本(≥4.5:1) |
|--------|------|--------|-------------|---------------|
| `--color-text-1` | `#1D2129` | **12.6:1** | ✅ AAA | ✅ AAA |
| `--color-text-2` | `#4E5969` | **6.3:1** | ❌ 需调整 | ✅ AAA |
| `--color-text-3` | `#86909C` | **3.5:1** | ❌ 不可用 | ❌ 不可用 |
| `--color-text-4` | `#C9CDD4` | **1.8:1** | ❌ 不可用 | ❌ 不可用 |

### 推荐的 AAA 级安全色值

覆盖 Arco 默认变量以达到 AAA 标准：

```css
:root {
  /* 原值 #4E5969 (6.3:1) 不满足小文本 7:1 */
  /* 调整为 #414C5C (7.1:1) */
  --color-text-2: #414C5C;
}

/* 深色模式同样需要调整 */
body[arco-theme="dark"] {
  /* 深色背景 #2A2A2B 上，需要足够亮的文字 */
  --color-text-2: #A8B0BC;  /* 确保对比度 ≥ 7:1 */
}
```

### 使用限制（强制规范）

```tsx
// ❌ 错误：小文本使用 color-text-3，对比度仅 3.5:1
<Text style={{ fontSize: 14, color: 'var(--color-text-3)' }}>
  重要说明文字
</Text>

// ✅ 正确：小文本必须使用 color-text-2 或以上
<Text style={{ fontSize: 14, color: 'var(--color-text-2)' }}>
  重要说明文字
</Text>

// ✅ 正确：大文本（≥19px 粗体）可以使用 color-text-3
<Title heading={3} style={{ color: 'var(--color-text-3)' }}>
  章节标题
</Title>
```

### 例外情况

以下场景不受对比度限制：
- **禁用状态** (`disabled`)：用户无法交互
- **装饰性元素**：如背景水印、纯装饰图标
- **Logo 和品牌元素**：不要求可读性

---

## 7. 检查清单

在提交代码前，请检查：

- [ ] 所有 `padding` 和 `margin` 值是否为 4/8/16/24/32/48/64px
- [ ] 标题字号是否符合 40px/24px/20px 层级
- [ ] 标题字重是否为 400 (normal)
- [ ] 页面边距是否为 `48px 64px 64px`
- [ ] 是否使用了 CSS 变量而非硬编码颜色
- [ ] 文字/图标悬停是否使用了次要色 `#57A9FB`
- [ ] 卡片边框悬停是否使用了主色 `#206CCF`
- [ ] 卡片圆角是否为 16px 或 12px

---

## 8. 常见错误修复

### 错误示例 ❌
```tsx
// 边距不是8的倍数
style={{ marginBottom: '20px' }}
style={{ padding: '12px 16px' }}
style={{ gap: '6px' }}

// 标题字号不统一
style={{ fontSize: '56px' }}
style={{ fontSize: '32px', fontWeight: 600 }}
```

### 正确示例 ✅
```tsx
// 符合规范的边距
style={{ marginBottom: '24px' }}
style={{ padding: '16px' }}
style={{ gap: '8px' }}

// 统一的标题样式
style={{ fontSize: '40px', fontWeight: 400 }}
style={{ fontSize: '24px', fontWeight: 400 }}

// 正确的颜色使用
// 文字悬停使用次要色
style={{ color: hovered ? '#57A9FB' : 'var(--color-text-1)' }}

// 卡片边框悬停使用主色
style={{ border: `1px solid ${hovered ? '#206CCF' : 'var(--color-text-3)'}` }}

// CSS 中的悬停状态
.menu-item:hover {
  color: #57A9FB;  /* 次要色用于文字 */
}

.card:hover {
  border-color: #206CCF;  /* 主色用于边框 */
}
```
