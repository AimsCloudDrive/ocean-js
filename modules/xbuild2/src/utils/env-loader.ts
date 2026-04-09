import fs from 'fs';
import path from 'path';

class EnvLoader {
  private env: Record<string, string> = {};
  private mode: string;

  constructor(mode: string) {
    this.mode = mode;
    this.load();
  }

  private load() {
    const envFiles = [
      '.env',
      '.env.local',
      `.env.${this.mode}`,
      `.env.${this.mode}.local`
    ];

    // 反向遍历，确保优先级正确
    for (let i = envFiles.length - 1; i >= 0; i--) {
      const envFile = envFiles[i];
      const fullPath = path.resolve(process.cwd(), envFile);
      
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const lines = content.split('\n');
        
        for (const line of lines) {
          const match = line.match(/^([^#\s=]+)\s*=\s*(.*)$/);
          if (match) {
            const [, key, value] = match;
            this.env[key] = value.replace(/^"|"$/g, '');
          }
        }
      }
    }

    // 设置默认环境变量
    this.env.MODE = this.mode;
    this.env.DEV = this.mode === 'development' ? 'true' : 'false';
    this.env.PROD = this.mode === 'production' ? 'true' : 'false';
  }

  get(key: string, defaultValue?: string): string {
    return this.env[key] || process.env[key] || defaultValue || '';
  }

  getAll(): Record<string, string> {
    return { ...this.env, ...process.env };
  }

  toDefinePlugin(): Record<string, string> {
    const define: Record<string, string> = {};
    const allEnv = this.getAll();

    for (const [key, value] of Object.entries(allEnv)) {
      define[`import.meta.env.${key}`] = JSON.stringify(value);
    }

    return define;
  }
}

export default EnvLoader;