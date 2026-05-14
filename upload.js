const { execSync } = require('child_process');
const path = require('path');

// 服务器信息
const host = '8.136.42.240';
const user = 'root';
const remotePath = '/www/wwwroot/bluetools';
const localDist = path.resolve(__dirname, 'dist');

console.log('🔗 开始上传文件到服务器...');

try {
  // Windows 自带 scp 命令，自动用你已保存的 SSH 私钥
  execSync(`scp -r ${localDist}/* ${user}@${host}:${remotePath}`, {
    stdio: 'inherit',
    shell: true
  });

  console.log('✅ 上传成功！');
  console.log('🌐 更新地址：https://electron-updater.426cnip.com/');
} catch (err) {
  console.error('❌ 上传失败：', err.message);
}