# Taggling 项目规则

## Git 同步规则

**每次对项目文件做出任何改动后（代码、文档、配置均包含），必须立即将改动 push 到 GitHub。**

具体步骤：
1. `git add -A`
2. `git commit -m "简短描述本次改动"`
3. `git push`

远程仓库：`git@github.com:clear-blueskyyy/entanglement.git`（SSH，无需密码）

> 无论是改 Prompt、改代码逻辑、改文档，还是调整配置，改完就 push，不要攒着一起提交。

---

## 改动后的标准动作

每次完成代码改动后，按以下顺序执行，完成后向用户汇报结果，**无需等用户逐条提醒**。

### 1. 构建验证

TypeScript 改动后，统一用 `tsc -b`（完整 composite build）验证，**不用** `tsc --noEmit`。

原因：`tsc --noEmit` 只检查 app tsconfig，会漏掉 `src/` 下 hardcoded 的 literal 对象（如 mock 数据）；`tsc -b` 与 Vercel 实际构建命令一致。

```bash
node node_modules/.bin/tsc -b
```

### 2. 新增 interface 必填字段时（额外步骤）

新增必填字段后，先 grep 该类型在整个 `src/` 下的所有 literal 用法，确保 mock 数据、演示数据一并补齐，再运行 `tsc -b`。

```bash
grep -rn "TypeName\|字段名" src/ --include="*.ts" --include="*.tsx"
```

### 3. 文档同步

push 代码的同一批次内完成，不单独攒着。

| 变更类型 | 需更新文档 |
|---|---|
| API 数据结构（字段增删改） | `README.md`（NormalizedPath 类型定义）、`PRODUCT-REQUIREMENTS.md`（第 8 节接口定义） |
| Reveal Ritual 或其他交互逻辑变更 | `PRODUCT-REQUIREMENTS.md`（对应 spec 描述段落） |
| 涉及交互的样式改动 | `PRODUCT-REQUIREMENTS.md`（对应样式规格） |
| 纯 prompt 文案/质量调优 | 无需更新文档 |

**不需要同步的文档**：`技术交付文档.md`、`项目文档.md`（早期非权威文档，不维护）。

### 4. 部署验收

push 后执行，结果在汇报中说明。

**步骤一：检查 Vercel 构建状态**（push 后约 1 分钟内）

```bash
curl -s "https://api.github.com/repos/clear-blueskyyy/entanglement/commits/HEAD/status" \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['state'], [s['description'] for s in d['statuses']])"
```

- `success` → 继续步骤二
- `failure` → 立即排查构建日志，不等监控超时

**步骤二：冒烟验证**（仅当改动涉及 API 或前端渲染逻辑时）

curl 一次 `/api/entangle`，确认响应结构正常、关键新字段存在。纯文档或纯样式改动可跳过此步。

### 5. 汇报格式

完成上述动作后，向用户汇报：
- 构建：通过 / 失败（附错误摘要）
- 文档：更新了哪些文件的哪些位置 / 无需更新
- 部署：成功上线 / 构建失败（附原因）/ 已跳过（纯文档改动）
- 验证：关键字段存在 / 功能正常 / 已跳过
