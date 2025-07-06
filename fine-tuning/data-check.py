# validate dataset
from datasets import load_from_disk

# 1. Load local dataset
ds = load_from_disk("data")

# 2. (Optional) Inspect the columns
print(ds)

