import torch
print(torch.cuda.is_available())       # 应该返回 True
print(torch.cuda.get_device_name(0))   # 应该返回你的显卡名
