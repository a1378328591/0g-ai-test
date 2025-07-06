from transformers import AutoTokenizer, AutoModelForQuestionAnswering
import torch

# 加载模型和 tokenizer
model_path = "qa_model"  # 替换为你的微调模型目录
tokenizer = AutoTokenizer.from_pretrained(model_path)
model = AutoModelForQuestionAnswering.from_pretrained(model_path)

def answer_question(question, context):
    inputs = tokenizer(question, context, return_tensors="pt", truncation=True, padding=True, return_offsets_mapping=True)

    # 删除 offset_mapping，避免报错
    if "offset_mapping" in inputs:
        del inputs["offset_mapping"]

    outputs = model(**inputs)
    start_logits = outputs.start_logits
    end_logits = outputs.end_logits

    start_index = torch.argmax(start_logits, dim=1).item()
    end_index = torch.argmax(end_logits, dim=1).item()

    if start_index > end_index or end_index - start_index > 30:
        return "(模型未能找到合适答案)"

    answer_ids = inputs["input_ids"][0][start_index:end_index + 1]
    answer = tokenizer.decode(answer_ids, skip_special_tokens=True)
    return answer.strip()


if __name__ == "__main__":
    print("📘 输入 context（上下文），然后连续提问。输入 :new 换上下文，输入 :exit 或 Ctrl+C 退出。\n")

    try:
        while True:
            context = input("🧾 请输入上下文（context）：\n> ").strip()
            if not context:
                print("⚠️ 上下文不能为空")
                continue

            print("✅ 你现在可以连续提问了（输入 :new 更换上下文，输入 :exit 退出）")
            while True:
                question = input("\n❓请输入问题（question）：\n> ").strip()

                if question.lower() == ":new":
                    print("🔄 正在切换上下文...\n")
                    break
                elif question.lower() == ":exit":
                    print("👋 已退出程序")
                    exit(0)
                elif not question:
                    print("⚠️ 问题不能为空")
                    continue

                answer = answer_question(question, context)
                print(f"💡 答案: {answer}")

    except KeyboardInterrupt:
        print("\n👋 已退出程序")
