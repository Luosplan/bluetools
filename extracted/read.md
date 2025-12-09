蓝牙：
1. 全局安装 node-gyp
```bash
npm install -g node-gyp
```
2. 安装python
3. 安装 Visual Studio
4. npm 设置 python 路径
```bash
npm config set python python2.7
// 替换自己电脑的python路径
npm config set python D:\env\python\python.exe
```
5. 安装依赖包
```bash
npm install
```
6. 安装@abandonware/noble
```bash
npm install @abandonware/noble
```