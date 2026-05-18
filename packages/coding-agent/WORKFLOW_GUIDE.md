# Paper Helper Agent 工作流指南

## 概述

本文档介绍如何将 paper_helper.yaml 中的工作流融入到 pi 的 agent loop 中。

## 架构设计

### 1. 核心组件

```
┌──────────────────────────────────────────────────────────────┐
│                     Paper Helper Agent                        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌──────────┐    ┌─────────────┐    ┌──────────────────┐   │
│   │分类器    │───▶│ 路由控制器  │───▶│ 分支处理器       │   │
│   │(已实现) │    │(已实现)    │    │ (systemPrompt 切换)│   │
│   └──────────┘    └─────────────┘    └──────────────────┘   │
│        │                │                      │             │
│        │                ▼                      ▼             │
│        │         ┌─────────────┐         ┌─────────────┐    │
│        │         │知识库检索   │         │ 工具调用    │    │
│        │         │(待实现)    │         │(待实现)    │    │
│        │         └─────────────┘         └─────────────┘    │
│        │                                                      │
│        └─────────────────────────────────────────────────────┘
│                              │
│                              ▼
│                    ┌─────────────────┐
│                    │  Agent Loop     │
│                    │ (pi-core)       │
│                    └─────────────────┘
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 2. 实现状态

| 组件 | 状态 | 文件 | 说明 |
|------|------|------|------|
| 问题分类器 | ✅ 完成 | `question-classifier.ts` | 支持本地模型和启发式分类 |
| 工作流路由 | ✅ 完成 | `workflow-controller.ts` | 8 个分支配置 |
| PaperHelperAgent | ✅ 完成 | `paper-helper-agent.ts` | 集成到 pi agent loop |
| 知识库检索 | ⚠️ 待配置 | `workflow-controller.ts` | 需要配置外部 API |
| 参数提取工具 | ❌ 待实现 | - | - |
| arxiv_search 工具 | ❌ 待实现 | - | - |
| 文档提取工具 | ❌ 待实现 | - | - |

## 使用方法

### 1. 基础用法

```typescript
import { createPaperHelperAgent } from "@earendil-works/pi-coding-agent";

// 创建 Agent
const agent = createPaperHelperAgent({
  useLocalModel: true,
  knowledgeBaseApiBase: "http://localhost:8000/api",
});

// 处理用户输入
async function handleUserInput(input: string) {
  const stream = await agent.processInput(input);
  
  for await (const event of stream) {
    if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
      process.stdout.write(event.assistantMessageEvent.delta);
    }
  }
}

handleUserInput("我学计算机专业的，对人工智能感兴趣，有什么选题推荐？");
```

### 2. 工作流路由示例

```typescript
import { routeWorkflow } from "@earendil-works/pi-coding-agent";

const routeResult = await routeWorkflow("开题报告应该怎么写？");

console.log(routeResult.classification.category); // 3 (PROPOSAL_WRITING)
console.log(routeResult.branchConfig.name); // "开题报告撰写"
console.log(routeResult.knowledgeBaseDatasetIds); // ["hARO...", "c70h..."]
```

### 3. 手动分类和路由

```typescript
import { classifyQuestion, QuestionCategory } from "@earendil-works/pi-coding-agent";
import { getBranchSystemPrompt } from "@earendil-works/pi-coding-agent";

// 分类
const result = await classifyQuestion("帮我润色一下论文");
console.log(result.category); // 4 (REVISION_POLISHING)

// 获取对应分支的 systemPrompt
const prompt = getBranchSystemPrompt(QuestionCategory.REVISION_POLISHING);
```

## 工作流分支配置

### 分支列表

| ID | Category | 名称 | 知识库 | 参数提取 | 工具 |
|----|----------|------|--------|----------|------|
| 1 | STARTUP_PLANNING | 启动规划与时间管理 | ✅ | ❌ | - |
| 2 | TOPIC_SELECTION | 选题与研究设计 | ❌ | ✅ | arxiv_search |
| 3 | PROPOSAL_WRITING | 开题报告撰写 | ✅ | ❌ | - |
| 4 | REVISION_POLISHING | 修改与学术润色 | ✅ | ❌ | - |
| 5 | DEFENSE_SIMULATION | 答辩模拟 | ❌ | ✅ | - |
| 6 | FINALIZATION_ARCHIVE | 定稿归档 | ✅ | ❌ | - |
| 7 | GENERAL_INQUIRY | 一般咨询 | ✅ | ❌ | - |
| 8 | UNKNOWN | 未知问题 | ❌ | ❌ | - |

### 知识库数据集

```typescript
// 在 workflow-controller.ts 中配置
knowledgeBaseDatasetIds: [
  "Wv5pSRH41d00o/sUd4eWQCnXuF5zVh1PRFC1aaZgcWJRHZREdFLmrgAl6RwLqBqj", // 数据集 1
  "IgZKJVX5QDBg1hm5hMSYN1BiGVGzJsSOxV+eagnKDataVfRSRJiYG9D5SNNc2flc", // 数据集 2
  // ...
]
```

## 环境变量配置

```bash
# 本地模型地址（llama.cpp server）
export LOCAL_MODEL_HOST="http://127.0.0.1:8081"

# 知识库 API 地址
export KB_API_BASE="http://localhost:8000/api"
```

## 下一步实现计划

### 1. 知识库检索（高优先级）

配置外部知识库 API，支持以下功能：
- 多数据集检索
- 相似度阈值过滤
- Top-K 结果返回

```typescript
// 示例 API 调用
const result = await retrieveFromKnowledgeBase(
  "开题报告应该包含哪些部分？",
  ["dataset-id-1", "dataset-id-2"],
  { topK: 4, similarityThreshold: 0.7 }
);
```

### 2. 参数提取工具（高优先级）

实现从用户输入中提取专业、兴趣等参数：

```typescript
const parameterExtractorTool: AgentTool = {
  name: "extract_parameters",
  parameters: Type.Object({
    query: Type.String(),
  }),
  execute: async (id, params) => {
    // 使用 LLM 提取结构化参数
    return {
      content: [{ type: "text", text: JSON.stringify({ major: "...", interests: [...] }) }],
      details: { major: "...", interests: [...] },
    };
  },
};
```

### 3. arxiv_search 工具（中优先级）

实现 arxiv 论文搜索：

```typescript
const arxivSearchTool: AgentTool = {
  name: "arxiv_search",
  parameters: Type.Object({
    query: Type.String(),
    max_results: Type.Optional(Type.Number()),
  }),
  execute: async (id, params) => {
    // 调用 arxiv API
    const response = await fetch(`https://export.arxiv.org/api/query?search_query=${params.query}`);
    // 解析并返回结果
  },
};
```

### 4. 文档提取工具（中优先级）

支持 PDF/Word 文档内容提取：

```typescript
const documentExtractorTool: AgentTool = {
  name: "extract_document_content",
  parameters: Type.Object({
    file_url: Type.String(),
  }),
  execute: async (id, params) => {
    // 下载并解析文档
    return { content: [{ type: "text", text: extractedText }] };
  },
};
```

## 测试

运行演示脚本：

```bash
cd packages/coding-agent
npx tsx test/paper-helper-demo.ts
```

运行分类器测试：

```bash
npx tsx test/question-classifier-simple.ts
```

## 注意事项

1. **本地模型要求**：确保 8081 端口运行着 llama.cpp server
2. **知识库 API**：需要配置外部知识库服务才能使用检索功能
3. **系统提示词**：各分支的 systemPrompt 已根据 yaml 配置，可根据需要调整
4. **工具注册**：需要在 PaperHelperAgent 中注册额外的工具
