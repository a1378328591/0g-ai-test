// @ts-ignore
import promptSync from 'prompt-sync';
import dotenv from 'dotenv';
import { askLLM, askLLM2, getAvailableModels, getWalletFromEnv, fundBroker, getBrokerBalance } from './askLLM';
import type { Wallet } from 'ethers';
import type { ServiceStructOutput } from './types';
import Table from 'cli-table3';

dotenv.config();

async function main() {
  const prompt = promptSync({ sigint: true });
  const wallet: Wallet = getWalletFromEnv();
  console.log(`🪪 钱包地址: ${wallet.address}`);

  const balance = await getBrokerBalance(wallet);
  console.log(`💰 账户余额: ${balance} OG`);

  if (balance === '0') {
    const confirm = prompt('初始化账户? (y/n): ');
    if (confirm.toLowerCase() === 'y') {
      const amount = prompt('存入资金-金额 (单位: OG): ');
      console.log(`💸 正在存入 ${amount} OG...`);
      await fundBroker(wallet, Number(amount));
    } else {
      console.log('❌ 用户取消操作');
      return;
    }
  }

  // 打印返回的 key value（debug用）
  const fieldNames: (keyof ServiceStructOutput)[] = [
    'provider', 'serviceType', 'url', 'inputPrice',
    'outputPrice', 'updatedAt', 'model', 'verifiability', 'additionalInfo'
  ];

  const models = await getAvailableModels(wallet);

  models.forEach((m: { [key: string]: any }, i: number) => {
    //console.log(`[${i}]`);
    fieldNames.forEach(key => {
      let value = m[key];
      if (key === 'updatedAt' && typeof value === 'bigint') {
        const timestamp = Number(value) * 1000;
        const dateStr = new Date(timestamp).toLocaleString('zh-CN', { hour12: false });
        value = `${dateStr}`;
      }
      //console.log(`  ${key}: ${value}`);
    });
  });

  // 使用 cli-table3 打印整齐的模型信息
  console.log(`\n🧠 可用模型列表：\n`);

  const table = new Table({
    head: ['编号', '模型名称', '地址', '验证方式', '更新时间', '输入价', '输出价'],
    colWidths: [6, 34, 30, 12, 21, 10, 10],
    wordWrap: true,
  });

  models.forEach((m: { [key: string]: any }, i: number) => {
    const updatedAt = new Date(Number(m.updatedAt) * 1000).toLocaleString('zh-CN', { hour12: false });
    table.push([
      i + 1,
      m.model,
      m.url,
      m.verifiability,
      updatedAt,
      `${m.inputPrice.toString()} OG`,
      `${m.outputPrice.toString()} OG`,
    ]);
  });

  console.log(table.toString());

  // 获取用户选择
  let selectedIndex: number;
  while (true) {
    const input = prompt(`请输入模型编号 (1-${models.length}): `);
    selectedIndex = Number(input);
    if (!isNaN(selectedIndex) && selectedIndex >= 1 && selectedIndex <= models.length) {
      break;
    }
    console.log(`❌ 无效输入，请输入 1 到 ${models.length} 之间的数字`);
  }

  const model = models[selectedIndex - 1];
  console.log(`🤖 已选择模型[${model.model}]`);

  // 初始化对话历史，带上system角色的设定
  const systemMessage = {
    role: 'system' as const,
    content: `你是 0G（Zero Gravity）项目的智能助手。
              0G 是第一个去中心化的 AI Layer 1 区块链，致力于协调硬件资源（存储、计算）和软件资产（数据、模型），以支持大规模 AI 工作负载。
              你代表 0G，致力于搭建一个更公平、更开放的 AI 生态系统，连接 Web2 的 AI 能力和 Web3 的去中心化优势。
              你的职责包括：解释 0G 的四大核心服务 —— 存储（Storage）、计算（Compute）、区块链执行（Chain）、数据可用性（Data Availability），并帮助用户理解和使用 0G 平台。
              请注意：
              - 用户在对话中说“我”时，通常是指用户自己，而不是你（AI）。
              - 例如，当用户问“我是谁”时，不要回答你自己的身份，而应引导用户进一步澄清问题，或说明你无法识别用户身份。
              请始终保持你的角色设定，并准确、专业地回答用户关于 0G 的问题。`
  };
  const history: { role: 'system' | 'user' | 'assistant'; content: string }[] = [systemMessage];
  console.log('💬 输入空行或 Ctrl+C 结束对话');
  while (true) {
    const userPrompt = prompt('你：');
    if (!userPrompt.trim()) {
      console.log('🧾 对话结束。');
      break;
    }
    // 用户消息加入历史
    history.push({ role: 'user', content: userPrompt });
    // 调用 askLLM，传入完整历史
    const result = await askLLM(wallet, model.provider, userPrompt, history);
    // 注意这里传给 askLLM 的参数要配合你的改造：
    // inputParam 改为空字符串，因为我们用 history 来传对话上下文
    // 你的 askLLM 需要改成支持从 history 取内容构造 messages
    // 模型回复加入历史
    history.push({ role: 'assistant', content: result.output });

    console.log(`🤖 AI：${result.output}`);
    console.log(`🔍 响应结果可验证性: ${result.verified ? '✅ 已验证' : '❌ 未验证'}`);
  }
}

main();
