#!/usr/bin/env node
import { execSync } from 'child_process'
import dotenv from 'dotenv'

dotenv.config()

// 🔄 执行数据库迁移函数
function runDatabaseMigration() {
  try {
    console.log('🔄 执行数据库迁移...')
    execSync('npx prisma migrate deploy', { stdio: 'inherit' })
    console.log('✅ 数据库迁移完成')
  } catch (error) {
    console.error('❌ 数据库迁移失败:', error.message)
    process.exit(1)
  }
}

// 🧱 数据库初始化函数
function setupDatabase() {
  try {
    // 执行数据库迁移
    runDatabaseMigration()
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error.message)
    process.exit(1)
  }
}

// 🔨 本地构建函数
function buildLocal() {
  try {
    // 确保数据库迁移已执行
    runDatabaseMigration()
    execSync('npm install', { stdio: 'inherit' }) // 安装依赖
    execSync('npx prisma generate', { stdio: 'inherit' }) // 生成 Prisma 客户端
    console.log('✅ 构建完成')
  } catch (error) {
    console.error('❌ 构建失败:', error.message)
    process.exit(1)
  }
}

// 🚀 启动服务函数
function startServer() {
  try {
    execSync('npm run start', { stdio: 'inherit' }) // 启动项目
  } catch (error) {
    console.error('❌ 服务启动失败:', error.message)
    process.exit(1)
  }
}

// ▶️ 执行 Prisma CLI 命令函数
function runPrismaCommand(args) {
  try {
    const command = `npx prisma ${args.join(' ')}`
    execSync(command, { stdio: 'inherit' })
  } catch (error) {
    console.error('❌ Prisma 命令执行失败:', error.message)
    process.exit(1)
  }
}

// 🧠 主函数，根据命令行参数判断执行哪种流程
async function main() {
  const args = process.argv.slice(2) // 获取命令行参数
  if (args[0] === 'prisma') {
    // 如果输入的是 prisma 命令，则执行 prisma 子命令
    runPrismaCommand(args.slice(1))
  } else {
    // 否则按默认流程：初始化 → 构建 → 启动服务
    setupDatabase()
    buildLocal()
    startServer()
  }
}

// 🚨 捕捉主函数异常
main().catch((error) => {
  console.error('❌ 脚本执行失败:', error)
  process.exit(1)
})
