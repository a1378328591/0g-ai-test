// @ts-ignore
import promptSync from 'prompt-sync';
import dotenv from 'dotenv';
import { askLLM, askLLM2, getAvailableModels, getWalletFromEnv, fundBroker, getBrokerBalance, transferFund, depositFund } from './askLLM';
import type { Wallet } from 'ethers';
import type { ServiceStructOutput } from './types';
import Table from 'cli-table3';

dotenv.config();

async function main() {
    const prompt = promptSync({ sigint: true });
    const wallet: Wallet = getWalletFromEnv();
    console.log(`🪪 钱包地址: ${wallet.address}`);

    while (true) {
        let balance = await getBrokerBalance(wallet);

        if (balance > '0') {
            console.log(`💰 当前账户余额: ${balance} OG`);

            const action = prompt('\n请选择操作类型：\n1 - 划转资金（转给 provider 子账户）\n2 - 存入资金（deposit）\nq - 退出\n你的选择：');

            if (action === 'q') {
                console.log('👋 退出程序');
                break;
            }

            if (action !== '1' && action !== '2') {
                console.log('❌ 无效输入，请输入 1、2 或 q');
                continue;
            }

            if (action === '1') {
                const model = await selectModel(wallet);
                const amount = prompt('划转资金-金额 (单位: OG): ');
                await transferFund(wallet, model.provider, Number(amount));
            } else if (action === '2') {
                const amount = prompt('存入资金-金额 (单位: OG): ');
                await depositFund(wallet, Number(amount));
            }
        } else {
            const confirm = prompt('是否初始化账户? (y/n): ');
            if (confirm.toLowerCase() === 'y') {
                const amount = prompt('初始化存入资金-金额 (单位: OG): ');
                await fundBroker(wallet, Number(amount));
                console.log('✅ 初始化完成');
            } else {
                console.log('❌ 用户取消初始化，退出程序');
                break;
            }
        }
    }


}

async function selectModel(wallet: Wallet): Promise<ServiceStructOutput> {
    const prompt = promptSync({ sigint: true });
    const models = await getAvailableModels(wallet);

    const fieldNames: (keyof ServiceStructOutput)[] = [
        'provider', 'serviceType', 'url', 'inputPrice',
        'outputPrice', 'updatedAt', 'model', 'verifiability', 'additionalInfo'
    ];

    // 打印模型表格
    console.log(`\n🧠 可用模型列表：\n`);

    const table = new Table({
        head: ['编号', '模型名称', '地址', '验证方式', '更新时间', '输入价(精度18位)', '输出价', '地址'],
        colWidths: [6, 34, 30, 12, 21, 20, 10, 45],
        wordWrap: true,
    });

    models.forEach((m, i) => {
        const updatedAt = new Date(Number(m.updatedAt) * 1000).toLocaleString('zh-CN', { hour12: false });
        table.push([
            i + 1,
            m.model,
            m.url,
            m.verifiability,
            updatedAt,
            `${m.inputPrice.toString()} `,
            `${m.outputPrice.toString()} `,
            m.provider,
        ]);
    });

    console.log(table.toString());

    // 用户选择模型
    let selectedIndex: number;
    while (true) {
        const input = prompt(`请输入需要划转的模型编号 (1-${models.length}): `);
        selectedIndex = Number(input);
        if (!isNaN(selectedIndex) && selectedIndex >= 1 && selectedIndex <= models.length) {
            break;
        }
        console.log(`❌ 无效输入，请输入 1 到 ${models.length} 之间的数字`);
    }

    const model = models[selectedIndex - 1];
    console.log(`🤖 已选择模型[${model.model}]`);
    return model;
}


main();
