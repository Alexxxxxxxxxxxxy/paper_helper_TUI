/**
 * 毕业论文问题分类器
 *
 * 根据 paper_helper.yaml 中的 Question Classifier 节点实现
 * 将用户问题分类到 8 个预定义类别中
 *
 * 使用 pi 的 /login 模型配置进行分类。
 */

import type { AgentTool } from "@earendil-works/pi-agent-core";
import { streamSimple } from "@earendil-works/pi-ai";
import { Type } from "typebox";
import { getApiKey, getCustomModel, getTemperature } from "./config-loader";

/**
 * 问题分类 ID（1-8）
 */
export type CategoryId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/**
 * 问题分类枚举
 */
export enum QuestionCategory {
	STARTUP_PLANNING = 1,
	TOPIC_SELECTION = 2,
	PROPOSAL_WRITING = 3,
	REVISION_POLISHING = 4,
	DEFENSE_SIMULATION = 5,
	FINALIZATION_ARCHIVE = 6,
	GENERAL_INQUIRY = 7,
	UNKNOWN = 8,
}

/**
 * 问题分类结果
 */
export interface ClassificationResult {
	category: QuestionCategory;
	confidence: number;
}

/**
 * 分类类别的中文描述映射
 */
export const CATEGORY_DESCRIPTIONS: Record<QuestionCategory, string> = {
	[QuestionCategory.STARTUP_PLANNING]: "毕业论文开始行动前的启动规划与时间管理",
	[QuestionCategory.TOPIC_SELECTION]: "毕业论文的选题以及它的研究设计",
	[QuestionCategory.PROPOSAL_WRITING]: "毕业论文的开题报告以及立项报告的撰写",
	[QuestionCategory.REVISION_POLISHING]: "毕业论文内容的修改与学术润色",
	[QuestionCategory.DEFENSE_SIMULATION]: "毕业论文答辩模拟与问答演练",
	[QuestionCategory.FINALIZATION_ARCHIVE]: "毕业论文有关定稿审核与归档流程",
	[QuestionCategory.GENERAL_INQUIRY]: "关于毕业论文的时间、格式、教务部信息等其他问题",
	[QuestionCategory.UNKNOWN]: "未知问题",
};

const CATEGORY_ID_MAP: Record<CategoryId, QuestionCategory> = {
	1: QuestionCategory.STARTUP_PLANNING,
	2: QuestionCategory.TOPIC_SELECTION,
	3: QuestionCategory.PROPOSAL_WRITING,
	4: QuestionCategory.REVISION_POLISHING,
	5: QuestionCategory.DEFENSE_SIMULATION,
	6: QuestionCategory.FINALIZATION_ARCHIVE,
	7: QuestionCategory.GENERAL_INQUIRY,
	8: QuestionCategory.UNKNOWN,
};

const CLASSIFICATION_PROMPT = `
你是一个毕业论文问题分类助手。请将用户的问题分类到以下 8 个类别之一：

## 分类类别

<categories>
1. ${CATEGORY_DESCRIPTIONS[QuestionCategory.STARTUP_PLANNING]}
   - 论文写作前的整体规划
   - 时间安排与进度管理
   - 写作启动前的准备工作

2. ${CATEGORY_DESCRIPTIONS[QuestionCategory.TOPIC_SELECTION]}
   - 选题建议与推荐
   - 研究设计方法
   - 研究方向选择

3. ${CATEGORY_DESCRIPTIONS[QuestionCategory.PROPOSAL_WRITING]}
   - 开题报告撰写
   - 立项报告撰写
   - 研究方案制定

4. ${CATEGORY_DESCRIPTIONS[QuestionCategory.REVISION_POLISHING]}
   - 论文内容修改
   - 学术润色
   - 语言表达优化

5. ${CATEGORY_DESCRIPTIONS[QuestionCategory.DEFENSE_SIMULATION]}
   - 答辩模拟
   - 问答演练
   - 答辩准备

6. ${CATEGORY_DESCRIPTIONS[QuestionCategory.FINALIZATION_ARCHIVE]}
   - 定稿审核流程
   - 归档流程
   - 提交材料准备

7. ${CATEGORY_DESCRIPTIONS[QuestionCategory.GENERAL_INQUIRY]}
   - 时间节点咨询
   - 格式规范问题
   - 教务部信息
   - 其他相关问题

8. ${CATEGORY_DESCRIPTIONS[QuestionCategory.UNKNOWN]}
   - 无法明确分类的问题
</categories>

## 用户问题

{{user_query}}

## 输出格式

请以 JSON 格式输出分类结果，不要包含任何其他内容：

\`
{
  "category_id": "分类类别 ID（1-8 中的一个）",
  "category_name": "分类类别名称",
  "confidence": 0.95,
  "reasoning": "简短的分类理由"
}
\`

注意：category_id 必须是 1-8 之间的整数
`;

/**
 * 使用自定义模型进行分类
 * 从 ~/.paper_helper/config.json 读取配置
 */
async function classifyWithPiModel(query: string): Promise<ClassificationResult> {
	try {
		const model = getCustomModel();
		const apiKey = getApiKey();

		const response = await streamSimple(
			model,
			{
				systemPrompt: CLASSIFICATION_PROMPT.replace("{{user_query}}", query),
				messages: [],
			},
			{
				apiKey,
				temperature: getTemperature(),
			},
		);

		let textContent = "";
		for await (const event of response) {
			if (event.type === "text_delta") {
				textContent += event.delta;
			}
		}

		const jsonMatch = textContent.match(/\{[\s\S]*?\}/);
		const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(textContent);
		const categoryId = parsed.category_id ? Number(parsed.category_id) : 8;
		const category = CATEGORY_ID_MAP[categoryId] || QuestionCategory.UNKNOWN;
		return { category, confidence: parsed.confidence ?? 0 };
	} catch (error) {
		throw new Error(`模型调用失败: ${(error as Error).message}`);
	}
}

/**
 * 问题分类工具
 * 用于在 agent loop 中路由用户问题到不同的处理流程
 */
export const questionClassifierTool: AgentTool = {
	name: "classify_question",
	label: "问题分类器",
	description: "将用户问题分类到预定义的毕业论文相关类别中",
	parameters: Type.Object({
		query: Type.String({
			description: "用户提出的问题或请求",
		}),
	}),
	execute: async (_toolCallId, params) => {
		const result = await classifyWithPiModel(params.query);
		return {
			content: [
				{
					type: "text" as const,
					text: JSON.stringify({
						category: result.category,
						category_name: CATEGORY_DESCRIPTIONS[result.category],
						confidence: result.confidence,
					}),
				},
			],
			details: {
				category: result.category,
				confidence: result.confidence,
				input: params.query,
			},
		};
	},
};

/**
 * 分类函数
 * 用于在 beforeToolCall 等 hook 中直接分类问题
 */
export async function classifyQuestion(query: string): Promise<ClassificationResult> {
	return classifyWithPiModel(query);
}

/**
 * 获取分类类别的中文描述
 */
export function getCategoryDescription(category: QuestionCategory): string {
	return CATEGORY_DESCRIPTIONS[category];
}

/**
 * 检查问题是否属于特定类别
 */
export function isCategory(result: ClassificationResult, ...categories: QuestionCategory[]): boolean {
	return categories.includes(result.category);
}

export default questionClassifierTool;
