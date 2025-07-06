## 主要学习用，不适用实战。。。

在外层运行，得到SQuAD
```
npx ts-node .\generate_0g_qa.ts
```

生成DatasetDict
```
cd .\source_file\
py .\data-prepare.py
```

检查
```
py .\data-check.py
```

训练
```
py .\train.py
```

运行模型进行测试
```
py .\qa.py 
```
