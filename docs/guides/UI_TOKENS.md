# UI 设计变量

## 主色板

| 名称 | 色值 | 用途 |
|------|------|------|
| 纯白 | `#FFFFFF` | 背景、卡片底色 |
| 主蓝 | `#206CCF` | 主操作、强调、徽标、悬停态 |
| 浅绿 | `#E8FFEA` | 成功/完成状态背景、辅助点缀 |

---

## 字体

使用 Arco Design `Typography` 组件渲染文字，自动应用字节跳动设计规范字体（ByteDance Sans / PingFang SC 等）。

```tsx
import { Typography } from '@arco-design/web-react';

<Typography.Text>正文</Typography.Text>
<Typography.Text type='secondary'>次级文字</Typography.Text>
<Typography.Text type='primary'>主色文字</Typography.Text>
<Typography.Text bold>加粗</Typography.Text>
```

| type 值 | 用途 |
|---------|------|
| 默认 | 主要正文 |
| secondary | 次级/辅助文字 |
| primary | 强调/主色 |
| success | 成功状态 |
| warning | 警告状态 |
| error | 错误状态 |

### 标题与段落

```tsx
import { Typography } from '@arco-design/web-react';
const { Title, Paragraph } = Typography;

// 标题 heading 1-6
<Title heading={5}>标题</Title>

// 段落，spacing 默认宽松，'close' 为紧凑
<Paragraph>正文段落</Paragraph>
<Paragraph type='secondary'>次级段落</Paragraph>
<Paragraph spacing='close'>紧凑段落</Paragraph>
```

| 属性 | 可选值 | 说明 |
|------|--------|------|
| heading | 1-6 | 标题层级 |
| type | 默认 / secondary | 文字色调 |
| spacing | 默认 / close | 行间距，close 更紧凑 |

### 标题层级对照

```tsx
<Typography.Title>H1</Typography.Title>
<Typography.Title heading={2}>H2</Typography.Title>
<Typography.Title heading={3}>H3</Typography.Title>
<Typography.Title heading={4}>H4</Typography.Title>
<Typography.Title heading={5}>H5</Typography.Title>
<Typography.Title heading={6}>H6</Typography.Title>
```

默认 heading 为 1，数字越大字号越小，对应 HTML h1-h6 语义。

## 按钮

```tsx
import { Button, Space } from '@arco-design/web-react';

<Button type='primary'>主要</Button>
<Button type='secondary'>次要</Button>
<Button type='dashed'>虚线</Button>
<Button type='outline'>描边</Button>
<Button type='text'>文字</Button>
```

| type 值 | 用途 |
|---------|------|
| primary | 主操作，填充色 |
| secondary | 次要操作 |
| dashed | 虚线边框 |
| outline | 描边无填充 |
| text | 纯文字，最轻量 |

## 返回顶部

```tsx
import { BackTop, Typography } from '@arco-design/web-react';

<div style={{ position: 'relative', padding: '8px 12px' }}>
  <BackTop
    visibleHeight={30}
    style={{ position: 'absolute' }}
    target={() => document.getElementById('scroll-container')}
  />
  <div id='scroll-container' style={{ height: 300, overflow: 'auto' }}>
    <Typography.Paragraph>滚动内容</Typography.Paragraph>
  </div>
</div>
```

| 属性 | 类型 | 说明 |
|------|------|------|
| visibleHeight | number | 滚动距离超过该值时显示按钮 |
| style | CSSProperties | 按钮样式，固定在视口用 `position: 'fixed'`，定位在容器内用 `position: 'absolute'` |
| target | () => HTMLElement | 返回监听滚动的目标容器元素 |

使用要点：
- 固定在视口右下角：设 `position: 'fixed', right: '40px', bottom: '40px'`（推荐用法）
- 定位在容器内：外层设 `position: 'relative'`，BackTop 设 `position: 'absolute'`
- `target` 返回实际滚动的 DOM 元素（需有固定高度 + `overflow: auto`）
- `visibleHeight` 控制按钮出现的滚动阈值

## 字重

| 变量 | 值 | 用途 |
|------|-----|------|
| font-weight-400 | 400 | 标题文字，如开始页面标题 |