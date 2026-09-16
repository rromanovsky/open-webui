export const THINKING_LEVELS = ['auto', 'none', 'low', 'medium', 'high'] as const;

export type ThinkingLevel = (typeof THINKING_LEVELS)[number];

export type ThinkingByModel = Record<string, ThinkingLevel>;

export function isThinkingLevel(value: unknown): value is ThinkingLevel {
	return typeof value === 'string' && (THINKING_LEVELS as readonly string[]).includes(value);
}

export function compactThinkingModelLabel(model?: {
	id?: string;
	name?: string;
	info?: { base_model_id?: string | null };
} | null): string {
	const raw = (model?.info?.base_model_id || model?.id || '').trim();
	if (!raw) {
		return '';
	}

	const withoutProvider = raw.includes('/') ? (raw.split('/').pop() ?? raw) : raw;
	return withoutProvider.replace(/:latest$/i, '');
}

export function resolveThinkingLevel(
	modelId: string | undefined,
	chatParams: Record<string, any> | undefined,
	settingsThinkingByModel?: ThinkingByModel
): ThinkingLevel {
	if (!modelId) {
		return 'auto';
	}

	const fromChat = chatParams?.thinking_by_model?.[modelId];
	if (isThinkingLevel(fromChat)) {
		return fromChat;
	}

	const fromSettings = settingsThinkingByModel?.[modelId];
	if (isThinkingLevel(fromSettings)) {
		return fromSettings;
	}

	return 'auto';
}

export function setThinkingForModel(
	thinkingByModel: ThinkingByModel | undefined,
	modelId: string,
	level: ThinkingLevel
): ThinkingByModel {
	return {
		...(thinkingByModel ?? {}),
		[modelId]: level
	};
}

export function buildChatRequestParams({
	modelId,
	chatParams,
	settingsParams,
	settingsThinkingByModel,
	stop
}: {
	modelId?: string;
	chatParams?: Record<string, any>;
	settingsParams?: Record<string, any>;
	settingsThinkingByModel?: ThinkingByModel;
	stop?: string[] | undefined;
}): Record<string, any> {
	const { thinking_by_model: _thinkingByModel, ...restChatParams } = chatParams ?? {};
	const thinking = resolveThinkingLevel(modelId, chatParams, settingsThinkingByModel);

	const params: Record<string, any> = {
		...(settingsParams ?? {}),
		...restChatParams,
		...(stop !== undefined ? { stop } : {})
	};

	delete params.thinking_by_model;

	if (thinking !== 'auto') {
		params.thinking = thinking;
	} else {
		delete params.thinking;
	}

	return params;
}
