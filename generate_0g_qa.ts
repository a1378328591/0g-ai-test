import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { askLLM, getAvailableModels, getWalletFromEnv, getBrokerBalance } from './askLLM';
import type { Wallet } from 'ethers';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const SOURCE_FILE = path.join(__dirname, 'source_file', '0g_structured_content_cleaned.json');

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
        content: `You are an intelligent assistant. Based on the given context string, generate a set of SQuAD-style question-answer pairs in English, including the question, answer, and the starting character position of the answer in the context. Please ensure the output is in valid JSON format.`
    };

    const raw = fs.readFileSync(SOURCE_FILE, 'utf-8');
    const htmlMap: Record<string, any> = JSON.parse(raw);

    const squadDataset: any[] = [];

    for (const [urlPath, obj] of Object.entries(htmlMap)) {
        const { menu, sections } = obj;

        // ✅ 拼接 context，包含 menu + 所有标题与内容
        const context = `${menu}\n\n` + sections
            .map((sec: any) => `${sec.title}\n${sec.content}`)
            .join('\n\n');

        const history: { role: 'system' | 'user' | 'assistant'; content: string }[] = [systemMessage];

        const promptText = `Please generate a set of SQuAD-style question-answer pairs in English from the following context. Return format (JSON)：
[
  {
    "question": "xxx?",
    "answer": "xxx",
    "answer_start": 123
  },
  ...
]
Context：
${context}
Please make sure:
1. answer_start is the character index in context;
2. Each QA pair is based on the context;
3. Please answer in English.`;

        history.push({ role: 'user', content: promptText });

        console.log(`🚀 正在处理: ${urlPath}`);
        try {
            const result = await askLLM(wallet, model.provider, '', history);
            const jsonText = extractJSONArray(result.output); // 提取 JSON 字符串数组

            if (!jsonText) {
                throw new Error('无法从返回中提取有效 JSON 数组');
            }

            const parsed = JSON.parse(jsonText); // 解析 JSON 数组

            const paragraph = {
                context,
                qas: parsed.map((item: any) => ({
                    id: uuidv4(),
                    question: item.question,
                    answers: [{
                        text: item.answer,
                        answer_start: item.answer_start
                    }],
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
            console.error(`❌ 失败: ${urlPath}`, msg);
        }
    }

    const squadPath = path.join(__dirname, 'source_file', '0g_qa_dataset.json');
    fs.writeFileSync(squadPath, JSON.stringify({ data: squadDataset }, null, 2), 'utf-8');
    console.log(`📚 SQuAD 数据集写入完成: ${squadPath}`);
}

// 匹配形如 [ {...}, {...} ] 的 JSON 数组字符串
function extractJSONArray(text: string): string | null {
    const match = text.match(/\[\s*{[\s\S]*?}\s*\]/);
    return match ? match[0] : null;
}

main();
