/**
 * ~/.paper_helper/config.json 模型配置加载
 */

import type { Model } from "@earendil-works/pi-ai";

export interface PaperHelperConfig {
	provider: string;
	model: string;
	apiKey: string;
	baseUrl: string;
	temperature: number;
	maxTokens: number;
}

let cachedConfig: PaperHelperConfig | null = null;

/**
 * 加载 ~/.paper_helper/config.json
 */
export function loadConfig(): PaperHelperConfig {
	if (cachedConfig) return cachedConfig;

	const fs = require("fs");
	const path = require("path");
	const configPath = path.join(require("os").homedir(), ".paper_helper", "config.json");

	try {
		const raw = fs.readFileSync(configPath, "utf-8");
		cachedConfig = JSON.parse(raw);
		return cachedConfig!;
	} catch (err) {
		throw new Error(
			`无法加载配置文件 ${configPath}: ${(err as Error).message}\n` +
				"请确保 ~/.paper_helper/config.json 存在且格式正确。",
		);
	}
}

/**
 * 获取自定义模型配置
 */
export function getCustomModel(): Model<any> {
	const config = loadConfig();
	return {
		id: config.model,
		name: config.model,
		provider: config.provider,
		api: "openai-completions",
		baseUrl: config.baseUrl,
		apiKey: config.apiKey,
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		input: ["text"],
		vendor: config.provider,
		family: config.model,
		mode: "chat",
		type: "language",
		contextWindow: config.maxTokens * 2,
		maxTokens: config.maxTokens,
	};
}

/**
 * 获取 API key
 */
export function getApiKey(): string {
	const config = loadConfig();
	return config.apiKey;
}

/**
 * 获取 temperature
 */
export function getTemperature(): number {
	const config = loadConfig();
	return config.temperature;
}
