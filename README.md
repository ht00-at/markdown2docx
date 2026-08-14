# MTD 桌面应用

将 AI 对话导出为 Word 文档，支持可编辑的 LaTeX 公式和格式化表格（三线表 / 边框表）。

## 目录结构

```
plugin/
├── desktop-app/   # Electron 桌面应用（界面 + 主进程）
├── server/        # Markdown/LaTeX → DOCX 转换服务（基于 Pandoc）
└── icons/         # 应用图标
```

## 环境要求

- Windows 10/11（x64）
- Node.js 18+
- **Pandoc**（必须，负责文档转换）

安装 Pandoc：

```bash
winget install JohnMacFarlane.Pandoc
```

若未安装，应用转换功能将不可用。

## 安装

分别为两个子项目安装依赖：

```bash
cd server
npm install

cd ../desktop-app
npm install
```

## 运行

```bash
cd desktop-app
npm start
```

## 打包

```bash
cd desktop-app
npm run build          # 生成 Windows 安装包，输出到 dist/
npm run build:dir      # 仅生成免安装目录
```

## 说明

- `desktop-app` 构建时会自动把 `../server` 和 `../icons/icon.ico` 打包进资源，请保持目录结构不变。
- 首次使用前请确认 Pandoc 已安装并可在命令行中调用（`pandoc --version`）。
