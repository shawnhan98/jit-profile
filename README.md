# 即时微型画像 (Just-In-Time Profiling) H5 原型

一个基于 AI 的个性化学习分析 H5 原型网站，使用 Next.js 14 + TypeScript 构建，支持流式响应和移动端优先设计。

## 🚀 快速开始

### 环境要求

- Node.js 18+ (推荐 20+)
- npm 或 yarn 或 pnpm

### 安装依赖

```bash
cd jit-profile
npm install
```

### 配置环境变量

1. 复制环境变量模板：

```bash
cp .env.local.example .env.local
```

2. 编辑 `.env.local` 文件，填入你的智谱 AI API Key：

```env
ZHIPU_API_KEY=your_zhipu_api_key_here
```

⚠️ **注意**：生产环境请使用 Vercel 环境变量或安全的密钥管理方式，不要提交 `.env.local` 到版本控制。

### 运行开发服务器

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 在浏览器中查看。

### 构建生产版本

```bash
npm run build
npm start
```

## 📱 功能特点

- **移动端优先**: 大按钮、简洁布局、完美适配手机屏幕
- **流式响应**: AI 输出实时打字机效果，提升用户体验
- **个性化分析**: 根据用户对不同知识点的掌握程度（陌生/听过/掌握/跳过），动态调整解析深度和讲解方式
- **极简设计**: 清爽的 UI，聚焦核心功能，动画流畅自然
- **即时反馈**: 快速提取前置知识点，生成选择题供用户评估

## 📂 项目结构

```
jit-profile/
├── app/
│   ├── globals.css          # 全局样式和 Tailwind 指令
│   ├── layout.tsx           # 根布局组件
│   └── page.tsx             # 主页面组件（包含完整业务逻辑）
├── components/
│   ├── AnalysisInput.tsx    # 内容输入组件
│   ├── KnowledgeCheck.tsx   # 知识点评估组件
│   └── CustomizedExplanation.tsx  # 定制化解析展示组件
├── lib/                     # 工具函数和配置（可扩展）
├── public/                  # 静态资源（可扩展）
├── .env.local.example       # 环境变量示例
├── package.json            # 项目依赖
├── tsconfig.json           # TypeScript 配置
├── tailwind.config.ts      # Tailwind CSS 配置
├── next.config.ts          # Next.js 配置
└── README.md               # 项目说明
```

## 🔧 技术栈

- **框架**: Next.js 14 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **AI SDK**: Vercel AI SDK v3
- **AI 模型**: 智谱 AI GLM-4-Flash（OpenAI 兼容接口）

## 🎨 设计系统

- **配色**: Slate 灰阶 + Blue 主色调
- **圆角**: 2xl (rounded-2xl, ~1rem)
- **阴影**: lg (shadow-lg)
- **按钮**: Full-rounded (rounded-full)
- **动画**: Fade-in, Slide-up, Typewriter cursor

## 🌐 部署建议

### Vercel 一键部署

1. 推送代码到 GitHub
2. 在 Vercel 导入项目
3. 添加环境变量：
   - `ZHIPU_API_KEY`
4. 部署完成

### 其他平台

支持任何支持 Node.js 的托管平台，确保：
- Node.js 18+
- 环境变量正确配置
- 域名解析到部署地址

## 📝 开发说明

### 修改 AI 模型

需要在 `lib/zhipu.ts` 和 `app/api/chat/route.ts` 中修改 `model` 参数：

```typescript
model: zhipu.chat("glm-4-flash")  // 可改为 "glm-4-plus" 等智谱其他模型
```

### 添加新功能

当前核心功能完整，可按需扩展：
- 历史记录（localStorage）
- 导出解析结果 (PDF/图片)
- 多语言支持
- 用户账户系统

## 📄 许可证

MIT

## 🙏 致谢

- [Next.js](https://nextjs.org/)
- [Vercel AI SDK](https://sdk.vercel.ai/)
- [Tailwind CSS](https://tailwindcss.com/)
- [OpenAI](https://openai.com/)