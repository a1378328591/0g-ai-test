from transformers import AutoTokenizer, AutoModelForQuestionAnswering, TrainingArguments, Trainer, default_data_collator
from datasets import load_from_disk

# 1. 加载数据
dataset = load_from_disk("data")

# 2. 加载 tokenizer 和模型
model_checkpoint = "distilbert-base-uncased"
tokenizer = AutoTokenizer.from_pretrained(model_checkpoint)
model = AutoModelForQuestionAnswering.from_pretrained(model_checkpoint)

# 3. 预处理函数，增加 start_positions 和 end_positions
def preprocess(examples):
    tokenized_examples = tokenizer(
        examples["question"],
        examples["context"],
        truncation="only_second",
        max_length=384,
        stride=128,
        return_overflowing_tokens=True,
        return_offsets_mapping=True,
        padding="max_length",
    )

    sample_mapping = tokenized_examples.pop("overflow_to_sample_mapping")
    offset_mapping = tokenized_examples.pop("offset_mapping")

    start_positions = []
    end_positions = []

    for i, offsets in enumerate(offset_mapping):
        sample_index = sample_mapping[i]
        answers = examples["answers"][sample_index]
        start_char = answers["answer_start"][0]
        end_char = start_char + len(answers["text"][0])

        sequence_ids = tokenized_examples.sequence_ids(i)

        # context token 的起止索引
        context_start = sequence_ids.index(1)
        context_end = len(sequence_ids) - 1 - sequence_ids[::-1].index(1)

        # 答案是否在当前上下文片段中
        if not (offsets[context_start][0] <= start_char and offsets[context_end][1] >= end_char):
            # 答案不在这个片段，标记为 CLS token 位置
            start_positions.append(tokenizer.cls_token_id)
            end_positions.append(tokenizer.cls_token_id)
        else:
            # 找答案起止 token 索引
            token_start_index = context_start
            while token_start_index <= context_end and offsets[token_start_index][0] <= start_char:
                token_start_index += 1
            token_start_index -= 1

            token_end_index = context_end
            while token_end_index >= context_start and offsets[token_end_index][1] >= end_char:
                token_end_index -= 1
            token_end_index += 1

            start_positions.append(token_start_index)
            end_positions.append(token_end_index)

    tokenized_examples["start_positions"] = start_positions
    tokenized_examples["end_positions"] = end_positions
    return tokenized_examples

# 4. 使用 map 批量处理数据
tokenized_ds = dataset.map(
    preprocess,
    batched=True,
    remove_columns=dataset["train"].column_names
)

# 5. 训练参数设置
training_args = TrainingArguments(
    output_dir="./qa_model",
    eval_strategy="no",
    save_strategy="epoch",
    learning_rate=2e-5,
    num_train_epochs=5,
    per_device_train_batch_size=16,
    weight_decay=0.01,
    save_total_limit=2,
    fp16=True,
    logging_dir="./logs",
    logging_strategy="epoch",
    report_to="none"
)

# 6. Trainer 初始化
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=tokenized_ds["train"],
    tokenizer=tokenizer,
    data_collator=default_data_collator
)

# 7. 训练开始
trainer.train()

# 8. 保存模型和 tokenizer
trainer.save_model("qa_model")
tokenizer.save_pretrained("qa_model")
