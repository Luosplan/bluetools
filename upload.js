const Client = require('ssh2-sftp-client');
const path = require('path');
const fs = require('fs');

// 服务器配置（私钥登录）
const config = {
  host: '8.136.42.240',
  port: 22,
  username: 'root',
  privateKey: fs.readFileSync(`${process.env.HOME}/.ssh/id_rsa`),
};

// 本地 → 服务器
const localDist = path.resolve(__dirname, 'dist');
const remotePath = '/www/wwwroot/bluetools';

async function upload() {
  const sftp = new Client();
  try {
    console.log('🔗 连接服务器中...');
    await sftp.connect(config);

    console.log('📤 开始上传 dist 文件夹...');
    await sftp.uploadDir(localDist, remotePath);

    console.log('✅ 上传成功！');
    console.log('🌐 更新地址：https://electron-updater.426cnip.com/');
  } catch (err) {
    console.error('❌ 上传失败：', err);
  } finally {
    sftp.end();
  }
}

upload();