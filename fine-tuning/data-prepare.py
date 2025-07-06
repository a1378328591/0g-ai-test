from datasets import Dataset, DatasetDict
import json

# 加载 SQuAD 格式数据
with open('0g_qa_dataset.json', 'r', encoding='utf-8') as f:
    squad_dict = json.load(f)

contexts = []
questions = []
answers = []
ids = []

for item in squad_dict['data']:
    for para in item['paragraphs']:
        context = para['context']
        for qa in para['qas']:
            contexts.append(context)
            questions.append(qa['question'])
            ids.append(qa['id'])

            # 获取第一个答案
            first_answer = qa['answers'][0]
            answer_text = first_answer['text']
            answer_start = int(first_answer['answer_start'])  # 强制转为 int

            answers.append({
                "text": [answer_text],
                "answer_start": [answer_start]
            })

# 构建 Dataset
dataset = Dataset.from_dict({
    'id': ids,
    'context': contexts,
    'question': questions,
    'answers': answers
})

# 包装为 DatasetDict
dataset_dict = DatasetDict({'train': dataset})

# 保存到磁盘
dataset_dict.save_to_disk('data')
