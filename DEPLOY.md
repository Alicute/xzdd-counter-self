# GitHub Actions 部署配置说明

## 需要在GitHub仓库中配置的Secrets

为了让GitHub Actions能够自动部署到服务器，你需要在GitHub仓库设置中添加以下Secrets：

### 配置步骤：
1. 进入GitHub仓库页面
2. 点击 `Settings` 选项卡
3. 在左侧菜单中选择 `Secrets and variables` -> `Actions`
4. 点击 `New repository secret` 添加以下配置：

### 必需的Secrets：

- **SERVER_HOST**: 服务器IP地址或域名
  - 示例: `192.168.1.100` 或 `example.com`

- **SERVER_USER**: 服务器登录用户名
  - 示例: `root` 或 `ubuntu`

- **SERVER_PASSWORD**: 服务器登录密码
  - 示例: 你的服务器密码

- **SERVER_PORT**: SSH端口号（可选，默认22）
  - 示例: `22`

- **SERVER_PATH**: 服务器上的目标部署路径
  - 示例: `/var/www/html/mahjong-counter`

- **DOCKER_COMPOSE_PATH**: docker-compose.yml所在的目录路径
  - 示例: `/home/user/docker-services` 或 `/opt/caddy-server`

### 部署流程说明：

1. 当代码推送到 `main` 分支时，GitHub Actions会自动触发
2. 安装Node.js 20和pnpm
3. 安装项目依赖
4. 执行 `pnpm run build` 构建项目
5. 将构建后的 `dist` 目录内容上传到服务器指定路径
6. 进入docker-compose目录并重启caddy服务

### 安全建议：

- 建议在服务器上创建专门的部署用户，而不是使用root
- 考虑使用SSH密钥认证替代密码认证（更安全）
- 定期更换服务器密码

### 如果使用SSH密钥（推荐）：

如果你想使用更安全的SSH密钥认证，可以将 `SERVER_PASSWORD` 替换为：
- **SERVER_KEY**: 服务器SSH私钥内容

然后修改 `.github/workflows/deploy.yml` 中的认证方式。