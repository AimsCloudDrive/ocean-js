#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function validateConfig(configPath) {
  if (!fs.existsSync(configPath)) {
    console.error(`❌ Config file not found: ${configPath}`);
    return false;
  }

  try {
    // 读取配置文件
    const configContent = fs.readFileSync(configPath, 'utf-8');
    
    // 检查是否使用了defineConfig
    if (!configContent.includes('defineConfig')) {
      console.error('❌ Config file should use defineConfig function');
      return false;
    }

    // 检查必需字段
    const requiredFields = ['input', 'output'];
    for (const field of requiredFields) {
      if (!configContent.includes(field)) {
        console.error(`❌ Missing required field: ${field}`);
        return false;
      }
    }

    // 检查output配置
    if (!configContent.includes('dir:')) {
      console.error('❌ Output config should include dir field');
      return false;
    }

    // 检查外部依赖配置
    if (!configContent.includes('external')) {
      console.warn('⚠️  No external dependencies configured');
    }

    // 检查开发服务器配置
    if (!configContent.includes('devServer')) {
      console.warn('⚠️  No devServer configuration');
    }

    console.log('✅ Config file validation passed!');
    return true;
  } catch (error) {
    console.error(`❌ Error validating config: ${error.message}`);
    return false;
  }
}

function validatePluginCompatibility(plugins) {
  const compatiblePlugins = [
    'env-plugin',
    'typescript-plugin',
    'css-plugin',
    'asset-plugin'
  ];

  for (const plugin of plugins) {
    if (typeof plugin === 'object' && plugin.name) {
      if (!compatiblePlugins.includes(plugin.name)) {
        console.warn(`⚠️  Plugin ${plugin.name} may not be compatible`);
      }
    }
  }
}

// 解析命令行参数
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Please provide a config file path');
  console.log('Usage: validate-config <config-path>');
  process.exit(1);
}

const configPath = args[0];
const isValid = validateConfig(configPath);

if (isValid) {
  // 尝试加载配置并验证插件兼容性
  try {
    const configModule = require(configPath);
    const config = configModule.default || configModule;
    
    if (typeof config === 'function') {
      const resolvedConfig = config({ mode: 'development' });
      if (resolvedConfig.plugins) {
        validatePluginCompatibility(resolvedConfig.plugins);
      }
    } else if (config.plugins) {
      validatePluginCompatibility(config.plugins);
    }
  } catch (error) {
    console.warn(`⚠️  Could not load config for plugin validation: ${error.message}`);
  }
}

process.exit(isValid ? 0 : 1);