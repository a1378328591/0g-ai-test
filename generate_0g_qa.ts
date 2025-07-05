import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { askLLM, getAvailableModels, getWalletFromEnv, getBrokerBalance } from './askLLM';
import type { Wallet } from 'ethers';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const SOURCE_FILE = path.join(__dirname, 'source_file', '0g_full_html.json');

async function main() {
  const wallet: Wallet = getWalletFromEnv();
  console.log(`🪪 钱包地址: ${wallet.address}`);

  const balance = await getBrokerBalance(wallet);
  //console.log(`💰 账户余额: ${balance} OG`);

  const models = await getAvailableModels(wallet);
  if (!models.length) {
    console.error('❌ 没有可用模型');
    return;
  }

  const model = models[1];
  console.log(`🤖 使用模型: ${model.model}`);

  const systemMessage = {
    role: 'system' as const,
    content: `你是一个智能助手，请根据网页 HTML 内容，生成适合 SQuAD 格式训练的一组问答，包括问题、答案和答案在原文中的起始位置。`
  };

  const raw = fs.readFileSync(SOURCE_FILE, 'utf-8');
  const htmlMap: Record<string, string> = JSON.parse(raw);

  const squadDataset: any[] = [];

  for (const [urlPath, htmlContent] of Object.entries(htmlMap)) {
    const history: { role: 'system' | 'user' | 'assistant'; content: string }[] = [systemMessage];

    const promptText = `请从以下 HTML 内容中生成一组 SQuAD 格式问答，返回格式如下（JSON）：
[
  {
    "question": "xxx?",
    "answer": "xxx",
    "answer_start": 123
  },
  ...
]
内容如下：
${htmlContent}`;

    history.push({ role: 'user', content: promptText });

    console.log(`🚀 正在处理: ${urlPath}`);
    try {
      const result = await askLLM(wallet, model.provider, '', history);
      console.log('---------------------')
      console.log(result.output)
      console.log('*********************')
      const parsed = JSON.parse(result.output); // 假设返回的是 JSON 格式数组

      const paragraph = {
        context: htmlContent,
        qas: parsed.map((item: any) => ({
          id: uuidv4(),
          question: item.question,
          answers: [{ text: item.answer, answer_start: item.answer_start }],
          is_impossible: false
        }))
      };

      squadDataset.push({
        title: urlPath,
        paragraphs: [paragraph]
      });

      console.log(`✅ 成功生成问答: ${urlPath}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`❌ 失败: ${urlPath}`, err);
    }
  }

  const squadPath = path.join(__dirname, 'source_file', '0g_qa_dataset.json');
  fs.writeFileSync(squadPath, JSON.stringify({ data: squadDataset }, null, 2), 'utf-8');
  console.log(`📚 SQuAD 数据集写入完成: ${squadPath}`);
}

main();
