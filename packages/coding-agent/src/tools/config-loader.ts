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
 * 默认配置文件模板内容
 */
export const DEFAULT_CONFIG_TEMPLATE: PaperHelperConfig = {
	provider: "deepseek",
	model: "deepseek-chat",
	apiKey: "your-api-key-here",
	baseUrl: "https://api.deepseek.com/v1",
	temperature: 0.7,
	maxTokens: 4096,
};

/**
 * 检查并初始化配置文件目录和默认配置
 *
 * 如果 ~/.paper_helper/ 目录不存在则自动创建
 * 如果 config.json 不存在则写入默认模板并提示用户编辑
 */
export function ensureConfig(): string {
	const fs = require("fs");
	const path = require("path");
	const homedir = require("os").homedir();
	const configDir = path.join(homedir, ".paper_helper");
	const configPath = path.join(configDir, "config.json");

	// 检查目录是否存在，不存在则创建
	if (!fs.existsSync(configDir)) {
		fs.mkdirSync(configDir, { recursive: true });
		console.log("\n" + "=".repeat(60));
		console.log("  [Paper Helper] 已创建配置目录: " + configDir);
	}

	// 检查配置文件是否存在，不存在则写入默认模板
	if (!fs.existsSync(configPath)) {
		fs.writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG_TEMPLATE, null, 2), "utf-8");
		console.log("  已创建默认配置文件: " + configPath);
		console.log("");
		console.log("  !! 请立即编辑配置文件，填入你的 API 密钥等信息 !!");
		console.log("  " + "-".repeat(56));
		console.log("  Windows: 编辑 %USERPROFILE%\\.paper_helper\\config.json");
		console.log("  macOS/Linux: 编辑 ~/.paper_helper/config.json");
		console.log("");
		console.log("  配置项说明:");
		console.log("    provider        - 模型提供商 (如 deepseek, openai, anthropic)");
		console.log("    model           - 模型名称 (如 deepseek-chat, gpt-4o)");
		console.log("    apiKey          - API 密钥");
		console.log("    baseUrl         - API 基础地址");
		console.log("    temperature     - 生成温度 (0.0 ~ 2.0)");
		console.log("    maxTokens       - 最大 Token 数");
		console.log("");
		console.log("  编辑完成后重新运行本程序即可生效。");
		console.log("=".repeat(60) + "\n");
	}

	return configPath;
}

/**
 * 加载 ~/.paper_helper/config.json
 */
export function loadConfig(): PaperHelperConfig {
	if (cachedConfig) return cachedConfig;

	const fs = require("fs");
	const path = require("path");
	const homedir = require("os").homedir();
	const configPath = path.join(homedir, ".paper_helper", "config.json");

	// 在加载前先确保配置存在
	ensureConfig();

	try {
		const raw = fs.readFileSync(configPath, "utf-8");
		cachedConfig = JSON.parse(raw);
		// 检查是否还是默认 key
		if (cachedConfig!.apiKey === DEFAULT_CONFIG_TEMPLATE.apiKey) {
			throw new Error("配置文件中的 apiKey 仍为默认占位值，请编辑配置文件填入真实的 API 密钥。");
		}
		return cachedConfig!;
	} catch (err) {
		// 如果是我们主动抛出的配置未修改错误，直接抛出
		if ((err as Error).message.includes("apiKey 仍为默认占位值")) {
			throw err;
		}
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
