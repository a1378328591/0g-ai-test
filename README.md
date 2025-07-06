# 0G 去中心化大模型交互工具 使用指南

## 简介

这是一个基于 TypeScript 的命令行工具，用于通过 0G Serving Broker 与去中心化大模型（LLM）推理服务交互。  
你可以使用它进行钱包充值、查看可用模型列表，以及向模型发送问题并获取回答。

---

## 先贴个示例图
![image](https://github.com/user-attachments/assets/13eb47df-f403-4bf5-9f34-4d908fe2a33b)


## 环境要求

- 已安装 Node.js 和 npm  
- 拥有包含 OG 代币的以太坊钱包  
- 项目根目录有配置好的 `.env` 文件  
---

## 安装步骤

1. 安装依赖：
   ```bash
   npm install
   ```
2. 复制并配置 .env 文件：
   ```bash
   cp example.env .env
   ```
   编辑 .env，填写如下变量:
   ```bash
   RPC_URL=你的以太坊RPC地址
   PRIVATE_KEY=你的钱包私钥
   ```
3. 运行程序：
   ```bash
   npx ts-node index.ts
   ```

## 使用方法
启动程序后，会显示你的钱包地址和 Broker(账户) 余额。

若余额为 0，会提示是否充值，输入充值金额即可。

程序会列出可用模型（或直接选定某个模型）。

你输入自然语言问题(已带入上下文)，模型会返回答案。

返回结果中会显示是否经过验证。

13min+