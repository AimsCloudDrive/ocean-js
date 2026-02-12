import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 定义服务器文件路径
const indexServerPath = path.join(__dirname, 'dist', 'mock-server.js');
const proxyServerPath = path.join(__dirname, 'dist', 'proxy-server.js');

console.log('🚀 启动服务器...');
console.log(`📁 工作目录: ${__dirname}`);
console.log(`📄 Mock 服务器: ${indexServerPath}`);
console.log(`📄 Proxy 服务器: ${proxyServerPath}`);
console.log('\n=====================================');

// 启动 mock 服务器
const mockServer = spawn('node', [indexServerPath], {
  stdio: 'inherit',
  shell: true
});

mockServer.on('error', (error) => {
  console.error('❌ Mock 服务器启动失败:', error.message);
});

mockServer.on('close', (code) => {
  console.log(`\n📄 Mock 服务器退出，退出码: ${code}`);
});

// 启动 proxy 服务器
const proxyServer = spawn('node', [proxyServerPath], {
  stdio: 'inherit',
  shell: true
});

proxyServer.on('error', (error) => {
  console.error('❌ Proxy 服务器启动失败:', error.message);
});

proxyServer.on('close', (code) => {
  console.log(`\n📄 Proxy 服务器退出，退出码: ${code}`);
});

// 处理进程终止
process.on('SIGINT', () => {
  console.log('\n🔧 正在关闭服务器...');
  mockServer.kill();
  proxyServer.kill();
  process.exit(0);
});

console.log('✅ 服务器启动命令已发送');
console.log('📝 请查看控制台输出以确认服务器是否正常启动');
console.log('💡 按 Ctrl+C 停止所有服务器');
console.log('=====================================\n');
