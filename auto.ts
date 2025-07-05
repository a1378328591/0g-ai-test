// @ts-ignore
import dotenv from 'dotenv';
import { askLLM, getAvailableModels, getWalletFromEnv, fundBroker, getBrokerBalance } from './askLLM';
import { Wallet, JsonRpcProvider  } from 'ethers';
import { randomUUID } from 'crypto';

dotenv.config();

const promptQuestions = [
  '0G 是什么？',
  '我如何使用 0G 的计算资源？',
  '0G 和传统 AI 平台有何不同？',
  '如何上传数据到 0G？',
  '什么是 0G 的存储服务？',
  '能否介绍一下 0G 的链上执行方式？',
  '0G 支持哪些模型？',
];

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function getRandomQuestions(): string[] {
  const shuffled = [...promptQuestions].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.floor(Math.random() * 3) + 3); // 3~5 个问题
}

function getWalletsFromEnv(): Wallet[] {
  const keys = process.env.PRIVATE_KEYS?.split(',').map(k => k.trim()).filter(Boolean) || [];
  const provider = new JsonRpcProvider(process.env.RPC_URL); // 添加 provider
  return keys.map(k => new Wallet(k, provider));
}


async function main() {
  const allWallets = getWalletsFromEnv();
  const usedIndices = new Set<number>();

  while (usedIndices.size < allWallets.length) {
    let idx: number;
    do {
      idx = Math.floor(Math.random() * allWallets.length);
    } while (usedIndices.has(idx));

    usedIndices.add(idx);
    const wallet = allWallets[idx];
    console.log(`\n🪪 正在使用钱包地址: ${wallet.address}`);

    // 获取模型
    const models = await getAvailableModels(wallet);
    const model = models[1]; // 固定选择第二个模型
    console.log(`🤖 已选择模型: ${model.model}`);

    const balance = await getBrokerBalance(wallet);
    console.log(`💰 当前余额: ${balance} OG`);

    if (balance === '0') {
      const amount = (Math.random() * (0.01 - 0.001) + 0.001).toFixed(3); // 新：0.001~0.01 0g
      console.log(`💸 自动充值: ${amount} OG...`);
      await fundBroker(wallet, Number(amount));
      await sleep(3000); // 等待几秒
    }

    // 构造对话历史
    const history: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      {
        role: 'system',
        content: `你是 0G 项目的智能助手，负责解释四大服务（存储、计算、区块链执行、数据可用性）并帮助用户理解 0G。`,
      }
    ];

    const questions = getRandomQuestions();
    for (const q of questions) {
      console.log(`\n你：${q}`);
      history.push({ role: 'user', content: q });
      const result = await askLLM(wallet, model.provider, q, history);
      history.push({ role: 'assistant', content: result.output });
      console.log(`🤖 AI：${result.output}`);
      console.log(`🔍 结果可验证性: ${result.verified ? '✅' : '❌'}`);
      await sleep(30000);
    }

    console.log(`✅ 钱包 ${wallet.address} 会话结束，准备切换下一个...\n`);
    const waitMs = Math.floor(Math.random() * (180000 - 60000 + 1)) + 60000;
    console.log(`⏳ 等待 ${(waitMs / 1000 / 60).toFixed(2)} 分钟后切换下一个钱包...\n`);
    await sleep(waitMs);
  }

  console.log('🎉 所有钱包处理完毕。');
}

main();
