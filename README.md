# Paper Helper TUI

毕业论文自动化写作系统，基于 pi (coding-agent) 构建。

## 使用说明

### 首次运行

首次运行时会自动检查配置文件，如果 `~/.paper_helper/` 目录不存在则自动创建，并生成默认配置文件。**请务必编辑配置文件后再运行程序。**

### 配置文件

配置文件位于：

| 系统 | 路径 |
|------|------|
| macOS / Linux | `~/.paper_helper/config.json` |
| Windows | `%USERPROFILE%\.paper_helper\config.json` |

#### 配置项

```json
{
  "provider": "deepseek",
  "model": "deepseek-chat",
  "apiKey": "your-api-key-here",
  "baseUrl": "https://api.deepseek.com/v1",
  "temperature": 0.7,
  "maxTokens": 4096
}
```

| 配置项 | 说明 | 示例 |
|--------|------|------|
| `provider` | 模型提供商 | `deepseek`, `openai`, `anthropic` |
| `model` | 模型名称 | `deepseek-chat`, `gpt-4o`, `claude-3-opus-20240229` |
| `apiKey` | API 密钥（必填） | `sk-xxxxxxxxxxxxxxxx` |
| `baseUrl` | API 基础地址 | `https://api.deepseek.com/v1` |
| `temperature` | 生成温度，范围 0.0 ~ 2.0 | `0.7` |
| `maxTokens` | 最大 Token 数 | `4096` |

#### 编辑步骤

1. 找到对应系统的配置文件路径
2. 用文本编辑器打开 `config.json`
3. 将 `apiKey` 替换为你的真实 API 密钥
4. 根据需要修改 `provider`、`model`、`baseUrl` 等参数
5. 保存文件
6. 重新运行程序

### 支持的模型提供商

- **DeepSeek**：`provider: "deepseek"`，`baseUrl: "https://api.deepseek.com/v1"`
- **OpenAI**：`provider: "openai"`，`baseUrl: "https://api.openai.com/v1"`
- **Anthropic**：`provider: "anthropic"`，`baseUrl: "https://api.anthropic.com"`
- 任何兼容 OpenAI API 格式的提供商均可使用
