# ---- Builder Stage: 构建前端和后端 ----
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# --- 前端构建 ---
# 复制前端 package 文件并安装依赖
COPY package.json package-lock.json* ./
# **优化**: 切换到国内镜像源以加速依赖下载
RUN npm config set registry https://registry.npmmirror.com/
# **优化**: 增加 --verbose 参数以在构建时显示详细日志
RUN npm install --verbose
# 复制所有前端文件并构建
COPY . .
RUN npm run build

# --- 后端构建 ---
# 设置后端工作目录
WORKDIR /app/server
# 复制后端 package 文件并安装依赖
COPY server/package.json server/package-lock.json* ./
# **优化**: 同样为后端切换镜像源
RUN npm config set registry https://registry.npmmirror.com/
# **优化**: 增加 --verbose 参数以在构建时显示详细日志
RUN npm install --verbose
# 复制所有后端文件并编译
COPY server/. .
RUN npm run build


# ---- Production Stage: 创建最终的生产镜像 ----
FROM node:18-alpine

# 设置环境变量为生产模式，这将触发 server/index.ts 中的静态文件托管逻辑
ENV NODE_ENV=production

# 设置工作目录
WORKDIR /app

# 从 builder 阶段复制后端的 package.json
COPY --from=builder /app/server/package.json /app/server/package-lock.json* ./server/
# 只安装后端的生产依赖，减小镜像体积
# **优化**: 在生产安装阶段同样使用国内镜像源
RUN cd server && npm config set registry https://registry.npmmirror.com/ && npm install --omit=dev --verbose

# 从 builder 阶段复制构建好的前端和后端产物
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server/dist ./server/dist

# 暴露应用运行的端口
EXPOSE 3001

# 定义容器启动时运行的命令
CMD ["node", "server/dist/src/index.js"]