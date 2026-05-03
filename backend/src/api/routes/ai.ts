import type { FastifyInstance, FastifyRequest } from 'fastify';
import { AIManager } from '../../ai/provider.js';
import { PapyrusTools, AIResponseParser } from '../../ai/tools.js';
import { aiConfig } from '../../ai/config-instance.js';
import { getToolManager } from '../../ai/tool-manager.js';
import type { ToolCallRecord } from '../../ai/tool-manager.js';
import { isPrivateUrl } from '../../ai/config.js';
import { getProviderApiKeyFromDB, getProviderConfigFromDB } from '../../ai/db-sync.js';
import { loadAllProviders } from '../../db/database.js';

export { aiConfig };
const aiManager = new AIManager(aiConfig);
const papyrusTools = new PapyrusTools();

const _completionConfig: Record<string, unknown> = {
  enabled: true,
  require_confirm: false,
  trigger_delay: 500,
  max_tokens: 50,
};

interface AIConfigPayload {
  current_provider: string;
  current_model: string;
  providers: Record<string, { api_key: string; base_url: string; models: string[] }>;
  parameters: { temperature: number; top_p: number; max_tokens: number; presence_penalty: number; frequency_penalty: number };
  features: { auto_hint: boolean; auto_explain: boolean; context_length: number; agent_enabled: boolean; cache_enabled: boolean };
}

interface CompletionPayload {
  prefix: string;
  context?: string;
  max_tokens?: number;
}

interface ToolConfigPayload {
  mode: string;
  auto_execute_tools: string[];
}

interface ParsePayload {
  response: string;
  reasoning_content?: string | null;
}

function isKeylessProvider(name: string): boolean {
  return (
    name === 'ollama' ||
    name === 'lm-studio' ||
    name === 'localai' ||
    name === 'tabbyapi' ||
    name === 'koboldcpp' ||
    name === 'text-generation-webui' ||
    name === 'llamacpp' ||
    name === 'liyuan-deepseek'
  );
}

function convertCallToResponse(call: ToolCallRecord): Record<string, unknown> {
  return {
    call_id: call.call_id,
    tool_name: call.tool_name,
    params: call.params,
    status: call.status,
    result: call.result,
    created_at: call.created_at,
    executed_at: call.executed_at,
    error: call.error,
  };
}

export default async function aiRoutes(fastify: FastifyInstance): Promise<void> {
  // AI Config
  fastify.get('/config/ai', async (request, reply) => {
    const masked = aiConfig.getMaskedConfig();
    // 从数据库读取 provider 列表，确保与前端一致
    const dbProviders = loadAllProviders();
    const providersFromDB: Record<string, { api_key: string; base_url: string; models: string[] }> = {};
    for (const p of dbProviders) {
      if (providersFromDB[p.type]) {
        request.log.warn(`Duplicate provider type "${p.type}" found in database; using first occurrence`);
        continue;
      }
      const firstKey = p.apiKeys.find((k) => k.key.trim() !== '');
      providersFromDB[p.type] = {
        api_key: firstKey?.key
          ? '*'.repeat(firstKey.key.length - 4) + firstKey.key.slice(-4)
          : '',
        base_url: p.baseUrl ?? '',
        models: p.models.filter((m) => m.enabled).map((m) => m.modelId),
      };
    }
    reply.send({
      success: true,
      config: {
        current_provider: masked.current_provider,
        current_model: masked.current_model,
        providers: providersFromDB,
        parameters: masked.parameters,
        features: masked.features,
      },
    });
  });

  fastify.post('/config/ai', async (request, reply) => {
    try {
      const payload = request.body as AIConfigPayload;

      if (payload.current_provider !== undefined) {
        aiConfig.config.current_provider = payload.current_provider;
      }
      if (payload.current_model !== undefined) {
        aiConfig.config.current_model = payload.current_model;
      }

      // Provider 配置仅通过 /api/providers 路由管理，此处不再处理 providers 字段
      // 避免前端传回掩码 key 覆盖数据库中的真实 key

      if (payload.parameters) {
        aiConfig.config.parameters = {
          temperature: payload.parameters.temperature ?? aiConfig.config.parameters.temperature,
          top_p: payload.parameters.top_p ?? aiConfig.config.parameters.top_p,
          max_tokens: payload.parameters.max_tokens ?? aiConfig.config.parameters.max_tokens,
          presence_penalty: payload.parameters.presence_penalty ?? aiConfig.config.parameters.presence_penalty,
          frequency_penalty: payload.parameters.frequency_penalty ?? aiConfig.config.parameters.frequency_penalty,
        };
      }

      if (payload.features) {
        aiConfig.config.features = {
          auto_hint: payload.features.auto_hint ?? aiConfig.config.features.auto_hint,
          auto_explain: payload.features.auto_explain ?? aiConfig.config.features.auto_explain,
          context_length: payload.features.context_length ?? aiConfig.config.features.context_length,
          agent_enabled: payload.features.agent_enabled ?? aiConfig.config.features.agent_enabled,
          cache_enabled: payload.features.cache_enabled ?? aiConfig.config.features.cache_enabled,
        };
      }

      aiConfig.saveConfig();
      reply.send({ success: true });
    } catch (e) {
      reply.status(400).send({ success: false, error: e instanceof Error ? e.message : '保存配置失败' });
    }
  });

  fastify.post('/config/ai/test', async (_request, reply) => {
    try {
      const providerName = aiConfig.config.current_provider;
      const providerConfig = getProviderConfigFromDB(providerName);
      if (!providerConfig) {
        reply.send({ success: false, error: 'Provider 未配置' });
        return;
      }

      // 如果数据库中没有 key，尝试 fallback（兼容旧逻辑）
      if (!providerConfig.api_key) {
        const dbKey = getProviderApiKeyFromDB(providerName);
        if (dbKey) providerConfig.api_key = dbKey;
      }

      if (providerName === 'ollama') {
        const baseUrl = providerConfig.base_url || 'http://localhost:11434';
        try {
          const resp = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(5000) });
          if (resp.ok) {
            reply.send({ success: true, message: 'Ollama 连接成功' });
          } else {
            reply.send({ success: false, error: `Ollama 返回错误: ${resp.status}` });
          }
        } catch (e) {
          reply.send({ success: false, error: `Ollama 连接失败: ${e instanceof Error ? e.message : String(e)}` });
        }
        return;
      }

      const apiKey = providerConfig.api_key;
      if (!apiKey && !isKeylessProvider(providerName)) {
        reply.send({ success: false, error: 'API Key 未设置' });
        return;
      }

      const baseUrl = providerConfig.base_url;
      if (!baseUrl) {
        reply.send({ success: false, error: 'Base URL 未设置' });
        return;
      }
      if (isPrivateUrl(baseUrl)) {
        reply.send({ success: false, error: 'SSRF: 禁止通过连接测试访问私有地址' });
        return;
      }

      try {
        const headers: Record<string, string> = {};
        if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
        const resp = await fetch(`${baseUrl}/models`, {
          headers,
          signal: AbortSignal.timeout(10000),
        });
        if (resp.ok) {
          reply.send({ success: true, message: `${providerName.toUpperCase()} 连接成功` });
        } else if (resp.status === 401) {
          reply.send({ success: false, error: 'API Key 无效或已过期' });
        } else if (resp.status === 404) {
          reply.send({ success: true, message: '配置格式正确（无法验证实际调用）' });
        } else {
          reply.send({ success: false, error: `连接失败: HTTP ${resp.status}` });
        }
      } catch (e) {
        reply.send({ success: false, error: `连接测试失败: ${e instanceof Error ? e.message : String(e)}` });
      }
    } catch {
      reply.send({ success: false, error: '连接测试失败，请检查网络或配置' });
    }
  });

  // Completion config
  fastify.get('/completion/config', async (_request, reply) => {
    reply.send({ success: true, config: _completionConfig });
  });

  fastify.post('/completion/config', async (request, reply) => {
    const payload = request.body as Record<string, unknown>;
    if ('enabled' in payload && typeof payload.enabled !== 'boolean') {
      reply.status(400).send({ success: false, error: 'enabled 字段必须为布尔值' });
      return;
    }
    Object.assign(_completionConfig, payload);
    reply.send({ success: true });
  });

  // Completion (SSE streaming)
  fastify.post('/completion', async (request, reply) => {
    const payload = request.body as CompletionPayload;
    const providerName = aiConfig.config.current_provider;
    const providerConfig = getProviderConfigFromDB(providerName);
    if (!providerConfig) {
      reply.status(400).send({ success: false, error: 'Provider 未配置' });
      return;
    }

    const systemPrompt = `你是一个智能写作助手。根据用户提供的文本上下文，预测并续写接下来的内容。
要求：
1. 续写内容要自然流畅，与上下文保持一致
2. 只输出续写的文本，不要解释
3. 如果是列表、代码块等特殊格式，保持格式一致`;

    const userPrompt = `请根据以下内容续写：\n\n${payload.prefix}`;

    reply.hijack();
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    try {
      if (providerName === 'ollama') {
        const baseUrl = providerConfig.base_url || 'http://localhost:11434';
        const firstOllamaModel = providerConfig.models?.[0] ?? '';
        const model = aiConfig.config.current_model || firstOllamaModel;

        const resp = await fetch(`${baseUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(60000),
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            stream: true,
            options: { temperature: 0.7 },
          }),
        });

        if (!resp.ok || !resp.body) {
          reply.raw.write(`data: {"error":"Ollama API 错误: ${resp.status}"}\n\n`);
          reply.raw.write(`data: {"done":true}\n\n`);
          reply.raw.end();
          return;
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const chunk = JSON.parse(line) as unknown;
              if (chunk === null || typeof chunk !== 'object') continue;
              const dict = chunk as Record<string, unknown>;
              const message = dict.message as Record<string, unknown> | undefined;
              const content = message?.content;
              if (typeof content === 'string' && content) {
                reply.raw.write(`data: {"text":${JSON.stringify(content)}}\n\n`);
              }
            } catch {
              // ignore
            }
          }
        }
      } else {
        if (!providerConfig.api_key && !isKeylessProvider(providerName)) {
          reply.raw.write(`data: {"error":"AI API Key 未设置"}\n\n`);
          reply.raw.write(`data: {"done":true}\n\n`);
          reply.raw.end();
          return;
        }
        const baseUrl = providerConfig.base_url || 'https://api.openai.com/v1';
        if (isPrivateUrl(baseUrl)) {
          reply.raw.write(`data: {"error":"SSRF: 禁止通过非本地 provider 访问私有地址"}\n\n`);
          reply.raw.write(`data: {"done":true}\n\n`);
          reply.raw.end();
          return;
        }
        const apiKey = providerConfig.api_key;
        const firstModel = providerConfig.models?.[0] ?? '';
        const model = aiConfig.config.current_model || firstModel;

        const messages = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ];

        const reqBody: Record<string, unknown> = {
          model,
          messages,
          stream: true,
          temperature: 0.7,
          max_tokens: payload.max_tokens ?? 150,
        };

        const endpoint = providerName === 'gemini'
          ? `${baseUrl}/openai/chat/completions`
          : `${baseUrl}/chat/completions`;

        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

        const resp = await fetch(endpoint, {
          method: 'POST',
          headers,
          signal: AbortSignal.timeout(60000),
          body: JSON.stringify(reqBody),
        });

        if (!resp.ok || !resp.body) {
          reply.raw.write(`data: {"error":"API 错误: ${resp.status}"}\n\n`);
          reply.raw.write(`data: {"done":true}\n\n`);
          reply.raw.end();
          return;
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            if (!line.trim()) continue;
            let lineStr = line;
            if (lineStr.startsWith('data: ')) {
              lineStr = lineStr.slice(6);
            }
            if (lineStr === '[DONE]') continue;
            try {
              const chunk = JSON.parse(lineStr) as unknown;
              if (chunk === null || typeof chunk !== 'object') continue;
              const dict = chunk as Record<string, unknown>;
              const choices = dict.choices as Array<Record<string, unknown>> | undefined;
              if (!choices || !choices[0]) continue;
              const delta = choices[0].delta as Record<string, unknown> | undefined;
              const content = delta?.content;
              if (typeof content === 'string' && content) {
                reply.raw.write(`data: {"text":${JSON.stringify(content)}}\n\n`);
              }
            } catch {
              // ignore
            }
          }
        }
      }

      reply.raw.write(`data: {"done":true}\n\n`);
      reply.raw.end();
    } catch (e) {
      reply.raw.write(`data: {"error":${JSON.stringify(e instanceof Error ? e.message : String(e))}}\n\n`);
      reply.raw.write(`data: {"done":true}\n\n`);
      reply.raw.end();
    }
  });

  // Sessions
  fastify.get('/sessions', async (_request, reply) => {
    reply.send({ success: true, sessions: aiManager.listSessions() });
  });

  fastify.post('/sessions', async (request, reply) => {
    const payload = request.body as { title?: string };
    const session = aiManager.createSession(payload.title, true);
    reply.send({ success: true, session });
  });

  fastify.post('/sessions/:sessionId/switch', async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    try {
      const session = aiManager.switchSession(sessionId);
      reply.send({ success: true, session });
    } catch (e) {
      reply.status(400).send({ success: false, error: e instanceof Error ? e.message : String(e) });
    }
  });

  fastify.patch('/sessions/:sessionId', async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    const payload = request.body as { title: string };
    try {
      aiManager.renameSession(sessionId, payload.title);
      reply.send({ success: true });
    } catch (e) {
      reply.status(400).send({ success: false, error: e instanceof Error ? e.message : String(e) });
    }
  });

  fastify.delete('/sessions/:sessionId', async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    try {
      aiManager.deleteSession(sessionId);
      reply.send({ success: true });
    } catch (e) {
      reply.status(400).send({ success: false, error: e instanceof Error ? e.message : String(e) });
    }
  });

  fastify.get('/sessions/:sessionId/messages', async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    const session = aiManager.getSession(sessionId);
    if (!session) {
      reply.status(404).send({ success: false, error: '会话不存在' });
      return;
    }
    reply.send({
      success: true,
      session: {
        id: session.id,
        title: session.title,
        messages: session.messages,
        created_at: session.created_at,
        updated_at: session.updated_at,
      },
    });
  });

  // Chat streaming
  fastify.post('/chat', async (request, reply) => {
    const payload = request.body as {
      message: string;
      system_prompt?: string;
      attachments?: Array<{ path?: string } | string>;
      model?: string;
      mode?: string;
      reasoning?: boolean | string;
    };

    if (!payload.message || typeof payload.message !== 'string') {
      reply.status(400).send({ success: false, error: 'message 字段必须为非空字符串' });
      return;
    }

    const providerName = aiConfig.config.current_provider;
    const providerConfig = getProviderConfigFromDB(providerName);
    if (!providerConfig) {
      reply.status(400).send({ success: false, error: 'Provider 未配置' });
      return;
    }

    // 如果数据库中没有 key，尝试 fallback（部分 provider 无需 key，仍需走 keyless 判断）
    if (!providerConfig.api_key) {
      const dbKey = getProviderApiKeyFromDB(providerName);
      if (dbKey) providerConfig.api_key = dbKey;
    }

    if (!providerConfig.api_key && !isKeylessProvider(providerName)) {
      reply.status(400).send({ success: false, error: 'AI API Key 未设置' });
      return;
    }

    reply.hijack();
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    try {
      const stream = aiManager.chatStream(
        payload.message,
        payload.system_prompt,
        payload.attachments,
        payload.model,
        payload.mode,
        payload.reasoning,
      );

      let assistantContent = '';
      let reasoningContent = '';
      const pendingToolCalls: Array<{ name: string; args: string; id?: string; callId?: string }> = [];
      for await (const chunk of stream) {
        if (chunk.type === 'content') {
          const text = typeof chunk.data === 'string' ? chunk.data : '';
          assistantContent += text;
          reply.raw.write(`data: ${JSON.stringify({ type: 'text', data: text })}\n\n`);
        } else if (chunk.type === 'reasoning') {
          const text = typeof chunk.data === 'string' ? chunk.data : '';
          reasoningContent += text;
          reply.raw.write(`data: ${JSON.stringify({ type: 'reasoning', data: text })}\n\n`);
        } else if (chunk.type === 'tool_start') {
          const toolData = chunk.data as Record<string, unknown>;
          const func = toolData.function as Record<string, unknown> | undefined;
          let callId: string | undefined;
          if (func) {
            const toolName = String(func.name ?? '');
            let params: Record<string, unknown> = {};
            const argStr = String(func.arguments ?? '');
            if (argStr.trim()) {
              try {
                const parsed = JSON.parse(argStr) as unknown;
                if (parsed !== null && typeof parsed === 'object') {
                  params = parsed as Record<string, unknown>;
                }
              } catch {
                // JSON parse error: params stays empty, will fail gracefully downstream
              }
            }
            const toolManager = getToolManager();
            if (toolManager.shouldAutoExecute(toolName)) {
              callId = toolManager.createPendingCall(toolName, params);
              toolManager.approveCall(callId);
              toolManager.markExecuting(callId);
            } else {
              callId = toolManager.createPendingCall(toolName, params);
            }
            pendingToolCalls.push({
              name: toolName,
              args: argStr,
              id: String(toolData.id ?? ''),
              callId,
            });
          }
          const enrichedData = callId ? { ...toolData, callId } : toolData;
          reply.raw.write(`data: ${JSON.stringify({ type: 'tool_call', data: enrichedData })}\n\n`);
        } else if (chunk.type === 'done') {
          reply.raw.write(`data: ${JSON.stringify({ type: 'done', data: '' })}\n\n`);
        } else if (chunk.type === 'error') {
          const text = typeof chunk.data === 'string' ? chunk.data : 'Unknown error';
          reply.raw.write(`data: ${JSON.stringify({ type: 'error', data: text })}\n\n`);
        }
      }

      // Save assistant response to session (include reasoning if no regular content)
      const finalContent = assistantContent || reasoningContent;
      if (finalContent) {
        await aiManager.appendAssistantMessage(finalContent);
      }

      // Auto-execute tools and send tool_result events
      for (const toolCall of pendingToolCalls) {
        try {
          const toolManager = getToolManager();
          if (!toolManager.shouldAutoExecute(toolCall.name)) continue;
          if (!toolCall.args) continue;

          const params = JSON.parse(toolCall.args);
          const result = papyrusTools.executeTool(toolCall.name, params);

          if (toolCall.callId) {
            toolManager.completeCall(toolCall.callId, result as unknown as Record<string, unknown>);
          }

          reply.raw.write(`data: ${JSON.stringify({
            type: 'tool_result',
            data: {
              name: toolCall.name,
              success: true,
              result,
              callId: toolCall.callId,
            },
          })}\n\n`);
        } catch (err) {
          if (toolCall.callId) {
            const toolManager = getToolManager();
            toolManager.failCall(toolCall.callId, err instanceof Error ? err.message : String(err));
          }

          reply.raw.write(`data: ${JSON.stringify({
            type: 'tool_result',
            data: {
              name: toolCall.name,
              success: false,
              error: err instanceof Error ? err.message : String(err),
              callId: toolCall.callId,
            },
          })}\n\n`);
        }
      }

      reply.raw.end();
    } catch (e) {
      reply.raw.write(`data: ${JSON.stringify({ type: 'error', data: e instanceof Error ? e.message : String(e) })}\n\n`);
      reply.raw.end();
    }
  });

  // Tools catalog — send tool list to UI
  fastify.get('/tools/catalog', async (_request, reply) => {
    reply.send({
      success: true,
      tools: papyrusTools.getCatalog(),
    });
  });

  // Tools config
  fastify.get('/tools/config', async (_request, reply) => {
    const manager = getToolManager();
    const config = manager.getConfig();
    reply.send({
      success: true,
      config: {
        mode: config.mode,
        auto_execute_tools: config.auto_execute_tools,
      },
    });
  });

  fastify.post('/tools/config', async (request, reply) => {
    const payload = request.body as ToolConfigPayload;
    const manager = getToolManager();
    manager.setConfig({
      mode: payload.mode,
      auto_execute_tools: payload.auto_execute_tools,
    });
    reply.send({
      success: true,
      config: {
        mode: payload.mode,
        auto_execute_tools: payload.auto_execute_tools,
      },
    });
  });

  fastify.get('/tools/pending', async (_request, reply) => {
    const manager = getToolManager();
    const pending = manager.getPendingCalls();
    reply.send({
      success: true,
      calls: pending.map(convertCallToResponse),
      count: pending.length,
    });
  });

  fastify.post('/tools/approve/:callId', async (request, reply) => {
    const { callId } = request.params as { callId: string };
    const manager = getToolManager();
    const call = manager.approveCall(callId);
    if (!call) {
      reply.status(404).send({ success: false, error: `工具调用不存在或状态不正确: ${callId}` });
      return;
    }
    manager.markExecuting(callId);
    try {
      const result = papyrusTools.executeTool(call.tool_name, call.params);
      manager.completeCall(callId, result as unknown as Record<string, unknown>);
      reply.send({
        success: true,
        call: convertCallToResponse(call),
        result,
      });
    } catch (e) {
      manager.failCall(callId, e instanceof Error ? e.message : String(e));
      reply.send({
        success: false,
        call: convertCallToResponse(call),
        message: e instanceof Error ? e.message : String(e),
      });
    }
  });

  fastify.post('/tools/reject/:callId', async (request, reply) => {
    const { callId } = request.params as { callId: string };
    const payload = request.body as { reason?: string } | undefined;
    const manager = getToolManager();
    const call = manager.rejectCall(callId, payload?.reason);
    if (!call) {
      reply.status(404).send({ success: false, error: `工具调用不存在或状态不正确: ${callId}` });
      return;
    }
    reply.send({
      success: true,
      call: convertCallToResponse(call),
      message: `工具调用已拒绝: ${payload?.reason || '用户拒绝执行'}`,
    });
  });

  fastify.get('/tools/calls', async (request, reply) => {
    const query = request.query as { limit?: string; status?: string };
    const manager = getToolManager();
    const calls = manager.getAllCalls(
      query.limit ? parseInt(query.limit, 10) : 100,
      query.status || null,
    );
    reply.send({
      success: true,
      calls: calls.map(convertCallToResponse),
      count: calls.length,
    });
  });

  fastify.get('/tools/calls/:callId', async (request, reply) => {
    const { callId } = request.params as { callId: string };
    const manager = getToolManager();
    const call = manager.getCall(callId);
    if (!call) {
      reply.status(404).send({ success: false, error: `工具调用不存在: ${callId}` });
      return;
    }
    reply.send({ success: true, call: convertCallToResponse(call) });
  });

  fastify.post('/tools/parse', async (request, reply) => {
    const payload = request.body as ParsePayload;
    const result = AIResponseParser.parseResponse(payload.response, payload.reasoning_content ?? null);
    reply.send({
      success: true,
      data: {
        content: result.content,
        reasoning: result.reasoning,
        tool_call: result.tool_call,
      },
    });
  });

  fastify.post('/tools/submit', async (request, reply) => {
    const payload = request.body as { tool_name: string; params: Record<string, unknown> };
    const manager = getToolManager();

    if (manager.shouldAutoExecute(payload.tool_name)) {
      const callId = manager.createPendingCall(payload.tool_name, payload.params);
      manager.approveCall(callId);
      manager.markExecuting(callId);
      try {
        const result = papyrusTools.executeTool(payload.tool_name, payload.params);
        manager.completeCall(callId, result as unknown as Record<string, unknown>);
        const call = manager.getCall(callId);
        reply.send({
          success: true,
          call: call ? convertCallToResponse(call) : null,
          result,
          message: '工具调用已自动执行',
        });
      } catch (e) {
        manager.failCall(callId, e instanceof Error ? e.message : String(e));
        const call = manager.getCall(callId);
        reply.send({
          success: false,
          call: call ? convertCallToResponse(call) : null,
          message: e instanceof Error ? e.message : String(e),
        });
      }
    } else {
      const callId = manager.createPendingCall(payload.tool_name, payload.params);
      const call = manager.getCall(callId);
      reply.send({
        success: true,
        call: call ? convertCallToResponse(call) : null,
        message: '工具调用已提交，等待审批',
      });
    }
  });

  fastify.delete('/tools/history', async (request, reply) => {
    const query = request.query as { keep_pending?: string };
    const manager = getToolManager();
    const keepPending = query.keep_pending !== 'false';
    const cleared = manager.clearHistory(keepPending);
    reply.send({
      success: true,
      cleared_count: cleared,
      message: `已清理 ${cleared} 条历史记录`,
    });
  });
}

export { aiManager };
