from transformers import AutoTokenizer, AutoModelForQuestionAnswering
import torch

# 加载 fine-tuned 模型（请确保路径正确）
model_path = "qa_model"  # 你训练后保存模型的目录
tokenizer = AutoTokenizer.from_pretrained(model_path)
model = AutoModelForQuestionAnswering.from_pretrained(model_path)

def answer_question(question: str, context: str) -> str:
    inputs = tokenizer(
        question,
        context,
        return_tensors="pt",
        truncation=True,
        padding=True,
        return_offsets_mapping=True
    )

    # offset_mapping 是推理中不需要的，删除避免报错
    if "offset_mapping" in inputs:
        del inputs["offset_mapping"]

    with torch.no_grad():
        outputs = model(**inputs)

    start_logits = outputs.start_logits
    end_logits = outputs.end_logits

    start_index = torch.argmax(start_logits, dim=1).item()
    end_index = torch.argmax(end_logits, dim=1).item()

    # 检查合理性：start 必须小于等于 end 且长度合理
    if start_index > end_index or end_index - start_index > 30:
        return "(模型未能找到合适答案)"

    input_ids = inputs["input_ids"][0]
    answer_ids = input_ids[start_index:end_index + 1]
    answer = tokenizer.decode(answer_ids, skip_special_tokens=True)

    return answer.strip()

# 🧪 交互模式测试
if __name__ == "__main__":
    print("📘 Input English context and question. Press Ctrl+C to exit.")
    try:
        while True:
            context = input("\nEnter context:\n> ").strip()
            if not context:
                print("⚠️ Context cannot be empty.")
                continue

            while True:
                question = input("\nEnter question (empty to re-enter context):\n> ").strip()
                if not question:
                    break

                answer = answer_question(question, context)
                print(f"✅ Answer: {answer}")
    except KeyboardInterrupt:
        print("\n👋 Exiting.")
