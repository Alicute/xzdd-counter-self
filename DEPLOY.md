# 项目部署指南

本文档提供两种部署方式：使用 Docker (推荐) 和手动部署。

---

## 方案一: Docker 一键部署 (推荐)

使用 Docker 是最简单、最可靠的部署方式。它可以将复杂的环境配置和构建步骤打包成一个命令。

### 服务器要求
-   **Docker**: [官方安装指南](https://docs.docker.com/engine/install/)
-   **Docker Compose**: 通常会随 Docker Desktop 一同安装。对于Linux服务器，可能需要单独安装。

### 部署步骤

#### 1. 上传代码
将整个项目文件夹（`xzdd-counter`）上传到您的服务器。

#### 2. 创建数据目录
为了持久化存储您的数据库文件，需要手动创建一个用于挂载的目录。
```bash
# 进入项目根目录
cd /path/to/your/project/xzdd-counter

# 创建用于存放数据库的目录
mkdir -p server/data
```

#### 3. 构建并启动容器
在项目根目录下，运行以下一个命令即可：
```bash
docker-compose up -d --build
```
-   `up`: 创建并启动容器。
-   `-d`: 在后台（detached mode）运行。
-   `--build`: 在启动前强制重新构建镜像，确保应用最新的代码更改。

Docker 会自动完成所有工作：安装依赖、编译代码、打包镜像并启动服务。

#### 4. 管理您的应用
-   **查看实时日志**: `docker-compose logs -f`
-   **停止并移除容器**: `docker-compose down`
-   **重启服务**: `docker-compose restart`
-   **进入容器内部 (用于调试)**: `docker exec -it mahjong-counter-app sh`

#### 5. 防火墙设置
请确保您服务器的防火墙已经**开放了 3001 端口**。

---

## 方案二: 手动部署 (传统方式)

如果您不想使用 Docker，可以按照以下步骤手动部署。

### 服务器要求
-   **Node.js**: 版本 >= 18.x
-   **npm**: 用于安装项目依赖。
-   **PM2 (推荐)**: 一个强大的Node.js进程管理器，可以保持您的应用永久在线。

### 部署步骤

#### 1. 上传代码
将整个项目文件夹（`xzdd-counter`）上传到您的服务器。

#### 2. 安装项目依赖
```bash
# 进入项目根目录
cd /path/to/your/project/xzdd-counter

# 安装前端依赖
npm install

# 进入后端目录并安装依赖
cd server
npm install
```

#### 3. 构建项目
```bash
# 确保您在项目根目录 (xzdd-counter)
cd /path/to/your/project/xzdd-counter

# 1. 构建前端静态文件 (生成根目录的 /dist)
npm run build

# 2. 进入后端目录并编译TypeScript (生成 /server/dist)
cd server
npm run build
```

#### 4. 启动后端服务 (使用 PM2)
```bash
# 1. 全局安装 PM2 (如果尚未安装)
npm install pm2 -g

# 2. 进入后端目录
cd /path/to/your/project/xzdd-counter/server

# 3. 使用 PM2 启动服务
# NODE_ENV=production 告诉我们的代码现在是生产模式，以便正确加载前端文件
pm2 start npm --name "mahjong-counter" -- run start
```
*注意：`NODE_ENV=production` 会被 `npm start` 脚本自动设置，因此PM2命令中可以省略。*

#### 5. 管理您的应用
-   **查看应用列表和状态**: `pm2 list`
-   **查看实时日志**: `pm2 logs mahjong-counter`
-   **重启应用**: `pm2 restart mahjong-counter`
-   **停止应用**: `pm2 stop mahjong-counter`

#### 6. 防火墙设置
请确保您服务器的防火墙已经**开放了 3001 端口**。