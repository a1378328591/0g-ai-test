import { Wallet, JsonRpcProvider, ethers } from 'ethers';
// @ts-ignore
import { createZGComputeNetworkBroker } from '@0glabs/0g-serving-broker';
import OpenAI from 'openai';
import type { ChatCompletionCreateParamsNonStreaming } from 'openai/resources/chat/completions';
// @ts-ignore
import { getBroker } from '@0g-ai/broker';

export const getWalletFromEnv = (): Wallet => {
  const provider = new JsonRpcProvider(process.env.RPC_URL!);
  const wallet = new Wallet(process.env.PRIVATE_KEY!, provider);
  return wallet;
};

// 管理帐户
// 在使用提供商的服务之前，您需要为所选提供商创建一个专属账户。提供商会在响应请求之前检查账户余额。如果余额不足，请求将被拒绝。
//1. 创建账户
export const fundBroker = async (signer: Wallet, amountOG: number) => {
  const broker = await createZGComputeNetworkBroker(signer);
  await broker.ledger.addLedger(amountOG); // 输入多少个0g就行 //addLedger：在合约中创建一个新的账户并存入。 depositFund：往已有账户存入
  console.log(`💸 已存入 : ${amountOG} OG`);
};

export const getBrokerBalance = async (signer: Wallet): Promise<string> => {
  const broker = await createZGComputeNetworkBroker(signer);
  try {
    const account = await broker.ledger.getLedger();
    return ethers.formatEther(account.ledgerInfo?.[0] ?? 0);
  } catch (e: any) {
    const reason = e?.revert?.name || e?.error?.data || e?.shortMessage;
    if (reason?.includes('LedgerNotExists')) {
      console.warn('💰 账户不存在');
      return '0';
    }
    throw e;
  }
};

/**
 * 'listService' retrieves a list of services from the contract.
 *
 * @returns {Promise<ServiceStructOutput[]>} A promise that resolves to an array of ServiceStructOutput objects.
 * @throws An error if the service list cannot be retrieved.
 *
 * type ServiceStructOutput = {
 *   provider: string;  // 提供服务的地址,Address of the provider
 *   serviceType: string;
 *   url: string;
 *   inputPrice: bigint;
 *   outputPrice: bigint;
 *   updatedAt: bigint;
 *   model: string;
 *   verifiability: string; // 结果是否可以验证，例如 'TeeML' 表示用可信执行环境（TEE）验证，空字符串表示没有验证
 *   additionalInfo: string // 额外信息，目前是用来存储提供者的加密密钥，也可以扩展其他信息
 * };
 */
export const getAvailableModels = async (signer: Wallet) => {
  const broker = await createZGComputeNetworkBroker(signer);
  const services = await broker.inference.listService();
  //console.log(services)
  //console.log('----------------------------------------------------------------------------------------------')
  return services;
};

//inputParam  是提示词（是和ai对话输入的内容）模型是无状态的,所以要带上history也就是是上下文
export const askLLM = async (
  signer: Wallet,
  providerAddress: string,
  inputParam: string,
  history: { role: 'system' | 'user' | 'assistant'; content: string }[] = []
) => {
  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [...history, { role: 'user', content: inputParam }];
  const broker = await createZGComputeNetworkBroker(signer);
  const { endpoint, model } = await broker.inference.getServiceMetadata(providerAddress);
  await broker.inference.acknowledgeProviderSigner(providerAddress);
  const jsonString = JSON.stringify(messages);
  const paddedJsonString = jsonString.repeat(3); // 字符串变大 3 倍
  const headers = await broker.inference.getRequestHeaders(providerAddress, paddedJsonString);
  //console.log('headers', headers)
  const openai = new OpenAI({
    baseURL: endpoint,
    apiKey: '',
  });
  const completion = await openai.chat.completions.create(
    {
      messages: messages,
      model: model,
    },
    {
      headers: {
        ...headers,
      },
    }
  )

  const chatID = completion.id;
  const content = completion.choices?.[0]?.message?.content ?? '';
  const verified = await broker.inference.processResponse(providerAddress, content, chatID);
  //console.log('json', completion)
  return {
    output: content,
    verified,
    history: [...messages, { role: 'assistant', content }],
  };
};


export const askLLM2 = async (
  signer: Wallet,
  providerAddress: string,
  inputParam: string,
  history: { role: 'system' | 'user' | 'assistant'; content: string }[] = []
) => {
  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [...history, { role: 'user', content: inputParam }];
  const broker = await createZGComputeNetworkBroker(signer);

  const { endpoint, model } = await broker.inference.getServiceMetadata(providerAddress);
  await broker.inference.acknowledgeProviderSigner(providerAddress);
  const headers = await broker.inference.getRequestHeaders(providerAddress, JSON.stringify(messages));

  //console.log('headers', headers)

  const res = await fetch(`${endpoint}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({
      model,
      messages: messages,
    }),
  });

  const json = await res.json();
  //console.log('json', json)
  const content = json.choices?.[0]?.message?.content ?? '';
  const chatID = json.id;
  const verified = await broker.inference.processResponse(providerAddress, content, chatID);

  return {
    output: content,
    verified,
    history: [...messages, { role: 'assistant', content }],
  };
};


