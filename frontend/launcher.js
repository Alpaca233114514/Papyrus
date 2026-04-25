/**
 * Papyrus 启动器
 * 同时启动 TypeScript 后端和 Vite 前端开发服务器
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { platform } from 'os';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = dirname(__dirname);

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

console.log(`${colors.cyan}Papyrus 启动器${colors.reset}\n`);

// 释放端口函数
async function killPort(port) {
  try {
    if (platform() === 'win32') {
      const { stdout } = await execAsync(`netstat -ano | findstr :${port} | findstr LISTENING`);
      const lines = stdout.trim().split('\n');

      for (const line of lines) {
        const match = line.trim().match(/\s+(\d+)\s*$/);
        if (match) {
          const pid = match[1];
          try {
            await execAsync(`taskkill /PID ${pid} /F`);
            console.log(`${colors.green}端口 ${port} 已释放 (PID: ${pid})${colors.reset}`);
          } catch (e) {
            console.log(`${colors.yellow}无法终止进程 ${pid}${colors.reset}`);
          }
        }
      }
    } else {
      try {
        const { stdout } = await execAsync(`lsof -ti:${port}`);
        const pids = stdout.trim().split('\n');
        for (const pid of pids) {
          if (pid) {
            await execAsync(`kill -9 ${pid}`);
            console.log(`${colors.green}端口 ${port} 已释放 (PID: ${pid})${colors.reset}`);
          }
        }
      } catch (e) {
        // 没有进程占用，忽略错误
      }
    }
  } catch (e) {
    // 端口未被占用，忽略错误
  }
}

// 启动前释放端口
console.log(`${colors.yellow}检查端口占用...${colors.reset}`);
await killPort(8000);
await killPort(5173);

// 等待端口完全释放
await new Promise(resolve => setTimeout(resolve, 1000));
console.log();

// 启动后端
console.log(`${colors.yellow}正在启动后端服务器...${colors.reset}`);

const backend = spawn('npm', ['run', 'dev'], {
  cwd: join(projectRoot, 'backend'),
  stdio: 'pipe',
  shell: platform() === 'win32',
  env: { ...process.env }
});

let backendReady = false;
let backendOutput = [];

backend.stdout.on('data', (data) => {
  const output = data.toString();
  backendOutput.push(output);

  if (output.includes('Server listening on') || output.includes('8000')) {
    if (!backendReady) {
      backendReady = true;
      console.log(`${colors.green}后端已启动: http://127.0.0.1:8000${colors.reset}\n`);
      startFrontend();
    }
  }

  if (output.toLowerCase().includes('error') && !output.includes('INFO')) {
    console.log(`${colors.red}[后端] ${output.trim()}${colors.reset}`);
  }
});

backend.stderr.on('data', (data) => {
  const output = data.toString();
  if (output.includes('Server listening on') || output.includes('8000')) {
    if (!backendReady) {
      backendReady = true;
      console.log(`${colors.green}后端已启动: http://127.0.0.1:8000${colors.reset}\n`);
      startFrontend();
    }
  } else if (output.toLowerCase().includes('error')) {
    console.log(`${colors.red}[后端] ${output.trim()}${colors.reset}`);
  }
});

backend.on('error', (err) => {
  console.error(`${colors.red}启动后端失败: ${err.message}${colors.reset}`);
  console.log(`${colors.yellow}请确保 Node.js 依赖已安装:${colors.reset}`);
  console.log(`   cd backend && npm install`);
  process.exit(1);
});

backend.on('exit', (code) => {
  if (code !== 0 && !backendReady) {
    console.error(`${colors.red}后端进程异常退出 (代码: ${code})${colors.reset}`);
    console.log(`${colors.yellow}尝试输出:${colors.reset}`);
    backendOutput.forEach(line => console.log(line));
    process.exit(1);
  }
});

// 启动前端
function startFrontend() {
  console.log(`${colors.yellow}正在启动前端开发服务器...${colors.reset}`);

  const frontendArgs = ['vite', '--port', '5173'];
  const frontend = spawn('npx', frontendArgs, {
    cwd: __dirname,
    stdio: 'inherit',
    shell: platform() === 'win32'
  });

  frontend.on('error', (err) => {
    console.error(`${colors.red}启动前端失败: ${err.message}${colors.reset}`);
    console.log(`${colors.yellow}请确保 Node.js 依赖已安装: npm install${colors.reset}`);
    backend.kill();
    process.exit(1);
  });

  // 进程退出处理
  process.on('SIGINT', () => {
    console.log(`\n${colors.yellow}正在关闭服务...${colors.reset}`);
    frontend.kill();
    backend.kill();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    frontend.kill();
    backend.kill();
    process.exit(0);
  });

  // Windows 下处理 Ctrl+C
  if (platform() === 'win32') {
    process.on('exit', () => {
      frontend.kill();
      backend.kill();
    });
  }
}

// 超时检查
setTimeout(() => {
  if (!backendReady) {
    console.log(`${colors.red}后端启动超时 (30秒)${colors.reset}`);
    console.log(`${colors.yellow}后端输出:${colors.reset}`);
    backendOutput.forEach(line => console.log(line));
    backend.kill();
    process.exit(1);
  }
}, 30000);
