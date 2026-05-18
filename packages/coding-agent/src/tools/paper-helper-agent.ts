/**
 * Paper Helper Agent
 *
 * 论文自动化写作智能体
 * 使用 ~/.paper_helper/config.json 自定义模型配置
 */

import { Agent } from "@earendil-works/pi-agent-core";
import { streamSimple } from "@earendil-works/pi-ai";
import { getApiKey, getCustomModel, getTemperature } from "./config-loader";
import {
	type ConvVars,
	createInitialState,
	getExpStageSystemPrompt,
	transitionState,
	WorkflowPhase,
	type WorkflowState,
} from "./workflow-controller";

const PARAM_EXTRACT_PROMPT = `从用户输入中提取以下信息并以 JSON 格式返回：
{ "name": "姓名", "title": "论文题目", "major": "专业", "id": "学号",
  "teacher": "导师", "submitDate": "提交日期", "degree": "本科/硕士",
  "isExperiment": true(如果需要实验验证) 或 false(纯理论/文科研究) }
未提供的信息返回空字符串。`;

export class PaperHelperAgent {
	private agent: Agent;
	private state: WorkflowState;
	private convVars: ConvVars = {};

	constructor() {
		this.state = createInitialState();
		const model = getCustomModel();
		this.agent = new Agent({
			initialState: {
				systemPrompt: "你好，我是你的论文助手。请告诉我你的需求。",
				model,
				tools: [],
			},
			getApiKey: () => getApiKey(),
		});
	}

	private getPhasePrompt(): string {
		switch (this.state.phase) {
			case WorkflowPhase.PARAM_EXTRACTION:
				return "请提供以下信息以便生成论文：\n1. 研究方向/题目\n2. 姓名\n3. 专业\n4. 需要实验验证？";
			case WorkflowPhase.EXPERIMENTAL:
				return getExpStageSystemPrompt(this.state.expPhase!);
			default:
				return "论文生成完成。输入新问题重新开始。";
		}
	}

	async processInput(input: string): Promise<void> {
		// 1. 参数提取阶段：使用自定义模型
		if (this.state.phase === WorkflowPhase.PARAM_EXTRACTION) {
			try {
				const model = getCustomModel();
				const apiKey = getApiKey();
				const resp = await streamSimple(
					model,
					{
						systemPrompt: PARAM_EXTRACT_PROMPT,
						messages: [{ role: "user", content: input, timestamp: Date.now() }],
					},
					{ apiKey, temperature: getTemperature() },
				);
				let text = "";
				for await (const ev of resp) {
					if (ev.type === "text_delta") text += ev.delta;
				}
				const match = text.match(/\{[\s\S]*?\}/);
				if (match) {
					const parsed = JSON.parse(match[0]);
					this.convVars = { ...this.convVars, ...parsed };
					// 如果有明确的理工关键词，优先设为实验型
					const techKeywords =
						/计算机|算法|代码|实验|编程|软件|硬件|数据|模型|深度学习|机器学习|人工智能|tensorflow|pytorch|工程/i;
					if (techKeywords.test(input)) {
						this.state.isExperimental = true;
					} else {
						this.state.isExperimental = parsed.isExperiment !== false;
					}
				} else {
					this.state.isExperimental = true;
				}
			} catch (e) {
				console.warn("[PaperHelperAgent] 参数提取失败:", (e as Error).message);
			}
		}

		// 2. 阶段转换
		if (this.state.phase === WorkflowPhase.PARAM_EXTRACTION) {
			this.state = { ...this.state, ...transitionState(this.state, { type: "classified" }) };
		}
		if (this.state.phase === WorkflowPhase.DIRECTION_CHECK) {
			this.state = { ...this.state, ...transitionState(this.state, { type: "classified" }) };
		}

		// 3. 设置提示词并调用 agent
		this.agent.state.systemPrompt = this.getPhasePrompt();
		await this.agent.prompt(input);
	}

	getAgent(): Agent {
		return this.agent;
	}

	getState(): WorkflowState {
		return { ...this.state, completed: new Set(this.state.completed) };
	}
}

export function createPaperHelperAgent(): PaperHelperAgent {
	return new PaperHelperAgent();
}

export default PaperHelperAgent;
