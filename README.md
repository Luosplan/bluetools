# Bluetools

一个基于 Electron + Vue 开发的蓝牙设备管理与测试工具，支持设备录入、蓝牙扫描、设备测试等功能。

## 目录结构

```
├── build/                    # 构建资源文件
│   ├── entitlements.mac.plist
│   ├── icon.icns
│   ├── icon.ico
│   └── icon.png
├── resources/                # 应用资源文件
│   ├── icon.png
│   └── logo.png
├── src/                      # 源代码目录
│   ├── main/                 # 主进程代码
│   │   ├── router/           # 事件路由
│   │   └── index.js          # 主进程入口
│   ├── preload/              # 预加载脚本
│   │   └── index.js
│   └── renderer/             # 渲染进程代码
│       ├── src/
│       │   ├── assets/       # 静态资源
│       │   ├── components/   # Vue组件
│       │   ├── layout/       # 布局组件
│       │   ├── router/       # 路由配置
│       │   ├── utils/        # 工具函数
│       │   ├── views/        # 页面组件
│       │   │   ├── bluetooth.vue
│       │   │   ├── dashboard.vue  # 主面板（包含设备录入、测试功能）
│       │   │   ├── scan.vue
│       │   │   └── test.vue
│       │   ├── App.vue
│       │   └── main.js
│       └── index.html
├── .github/
│   └── workflows/
│       └── summary.yml       # CI/CD配置
├── .editorconfig
├── .eslintignore
├── .eslintrc.cjs
├── .gitignore
├── .npmrc
├── .prettierignore
├── .prettierrc.yaml
├── dev-app-update.yml        # 开发环境自动更新配置
├── electron-builder.yml      # electron-builder配置
├── electron.vite.config.mjs  # Vite配置
├── package.json
└── README.md
```

## 功能介绍

### 1. 设备录入
- **摄像头扫码**：支持通过摄像头扫描QR码录入设备
- **扫码枪扫码**：支持通过扫码枪录入设备
- **蓝牙广播扫描**：支持通过蓝牙广播自动发现设备
- QR码格式：`ecv02<12-char MAC>,<product ID>,<IMEI>`，例如：`ecv02ec308e52b393,C001202511181700,861606086013598`

### 2. 设备测试
- 支持批量连接设备
- 实时显示设备连接状态
- 测试结果统计
- 设备控制（开阀、关阀操作）

### 3. 自动更新
- 基于 `electron-updater` 实现自动更新
- 支持从 GitHub Releases 下载更新包
- 支持 Windows、macOS、Linux 平台

### 4. 蓝牙功能
- 蓝牙设备扫描与发现
- 设备连接与断开
- 设备状态监控
- 蓝牙适配器状态管理

## CI/CD 配置

### 自动构建与发布
项目使用 GitHub Actions 实现自动构建和发布：

- **触发条件**：当推送版本标签（如 `v1.0.0`）时自动触发
- **构建平台**：Windows（可扩展支持 macOS、Linux）
- **构建流程**：
  1. 代码检出
  2. Node.js 环境配置
  3. 依赖安装
  4. 应用构建
  5. 发布到 GitHub Releases

### CI/CD 配置文件
- `.github/workflows/summary.yml`：GitHub Actions 工作流配置
- `electron-builder.yml`：electron-builder 构建配置

## 标签使用

### 创建标签

```bash
# 创建轻量标签
git tag v1.0.0

# 创建带注释的标签（推荐）
git tag -a v1.0.0 -m "版本1.0.0发布"

# 删除本地标签
git tag -d v1.0.0

# 删除远程标签
git push origin --delete v1.0.0
```

### 推送标签

```bash
# 推送单个标签
git push origin v1.0.0

# 推送所有未推送的标签
git push --tags
```

### 标签格式
- 版本号格式：`vX.Y.Z`（主版本号.次版本号.修订号）
- 示例：`v1.0.0`、`v1.1.0`、`v1.0.1`

### 标签触发
- 推送标签会自动触发 GitHub Actions 构建流程
- 构建产物会自动发布到 GitHub Releases
- 应用会从 GitHub Releases 检查更新

## 自动更新配置

### 配置文件

#### 1. `dev-app-update.yml`（开发环境配置）
开发环境下的自动更新测试配置：

- **`provider`**：更新源提供者（generic，通用HTTP服务器）
- **`url`**：更新包下载地址（示例地址，开发环境使用）
- **`updaterCacheDirName`**：更新缓存目录名称（bluetools-updater）

此文件仅用于开发环境测试自动更新功能，生产环境更新配置由 `electron-builder.yml` 中的 `publish` 配置决定。

#### 2. `electron-builder.yml`（生产环境配置）
生产环境的构建和发布配置：

- **基础配置**：
  - `appId`：应用唯一标识符（com.electron.app）
  - `productName`：应用名称（bluetools）
  - `directories.buildResources`：构建资源目录（build）
  - `files`：打包时包含/排除的文件规则
  - `asarUnpack`：不打包进asar的资源文件（resources/**）

- **平台特定配置**：
  - **Windows**：可执行文件名、图标、NSIS安装程序配置
  - **macOS**：图标、权限配置、DMG打包配置
  - **Linux**：支持AppImage、snap、deb格式打包

- **发布配置**：
  - `publish.provider`：发布提供者（GitHub）
  - `publish.owner`：GitHub 用户名（Luosplan）
  - `publish.repo`：GitHub 仓库名（bluetools）
  - `publish.vPrefixedTagName`：使用带 v 前缀的标签名
  - `publish.publishAutoUpdate`：禁用打包时自动发布

### 更新流程
1. 应用启动时检查更新
2. 发现新版本后下载更新包
3. 下载完成后提示用户安装
4. 重启应用完成更新

## 项目设置

### 推荐 IDE 配置
- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar)

### 安装依赖

```bash
npm install
```

### 开发环境

#### 环境搭建

##### 1. 基础环境要求
- **Node.js**：推荐使用 LTS 版本，要求 Node.js 18.x 或更高版本
- **Python**：Python 2.7 或 Python 3.x
- **Visual Studio**：Windows 平台需要安装 Visual Studio（包含 C++ 构建工具）

##### 2. 蓝牙开发环境配置
```bash
# 全局安装 node-gyp（用于编译原生模块）
npm install -g node-gyp

# 设置 npm 的 Python 路径（替换为你的实际 Python 路径）
npm config set python D:\env\python\python.exe

# 安装项目依赖
npm install

# 安装蓝牙库 @abandonware/noble
npm install @abandonware/noble
```

##### 3. 启动开发服务器
```bash
npm run dev
```

### 构建应用

```bash
# 构建所有平台
npm run build

# 仅构建 Windows 平台
npm run build:win

# 仅构建 macOS 平台
npm run build:mac

# 仅构建 Linux 平台
npm run build:linux

# 构建并生成未打包的应用目录
npm run build:unpack
```

### 打包文件说明

构建完成后，打包文件会生成在项目根目录的 `dist` 文件夹中。不同平台的打包产物类型如下：

#### Windows 平台
- **安装程序**：`dist/bluetools-<version>-setup.exe`
  - 使用 NSIS 制作的安装程序
  - 支持自定义安装目录
  - 自动创建桌面快捷方式
  - 包含完整的应用文件和依赖
- **未打包应用目录**：`dist/win-unpacked/`
  - 未打包的应用程序目录
  - 包含所有应用文件和依赖
  - 可直接运行，无需安装
- **安装程序块映射文件**：`dist/bluetools-<version>-setup.exe.blockmap`
  - 用于 `electron-updater` 的增量更新
  - 包含文件差异信息，减小更新包大小

#### macOS 平台
- **DMG 镜像**：`dist/bluetools-<version>.dmg`
  - 包含应用程序的磁盘镜像
  - 支持拖放安装
  - 已签名和公证配置

#### Linux 平台
- **AppImage**：`dist/bluetools-<version>.AppImage`
  - 便携格式，无需安装
  - 支持大多数 Linux 发行版
- **Snap 包**：`dist/bluetools-<version>.snap`
  - Ubuntu 生态系统的打包格式
- **Deb 包**：`dist/bluetools-<version>.deb`
  - Debian/Ubuntu 系统的安装包

#### 通用辅助文件
- **图标文件**：`dist/.icon-ico`
  - 应用程序图标资源
  - 用于安装程序和应用窗口
- **构建调试配置**：`dist/builder-debug.yml`
  - 构建过程中的调试信息
  - 包含构建命令、环境变量等
- **构建有效配置**：`dist/builder-effective-config.yml`
  - 合并后的最终构建配置
  - 包含默认配置和自定义配置的组合
- **更新元数据**：`dist/latest.yml`
  - 用于 `electron-updater` 的更新检查
  - 包含当前版本信息、下载地址等
  - 每个平台有对应的更新元数据文件（如 `latest.yml`、`latest-mac.yml` 等）

#### 通用说明
- **版本号**：打包文件中包含当前应用版本号（如 v1.0.0）
- **签名**：macOS 平台支持应用签名和公证（可在 `electron-builder.yml` 中配置）
- **自动更新**：Windows 和 macOS 版本支持从 GitHub Releases 自动更新
- **依赖**：所有平台的打包产物均包含完整的应用依赖，无需额外安装

## 技术栈

- **主框架**：Electron + Vue 3
- **构建工具**：Vite
- **UI 组件库**：Element Plus
- **蓝牙库**：@abandonware/noble
- **QR 码库**：jsQR
- **自动更新**：electron-updater
- **CI/CD**：GitHub Actions

## 许可证

MIT
