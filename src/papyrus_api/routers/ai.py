"""AI配置和补全API路由。"""

from __future__ import annotations

import json
from typing import Any, AsyncGenerator

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from papyrus_api.deps import get_ai_config

router = APIRouter(tags=["ai"])

# 内存存储补全配置（实际应用应持久化）
_completion_config: dict[str, Any] = {
    "enabled": True,
    "require_confirm": False,
    "trigger_delay": 500,
    "max_tokens": 150,
}

# requests is optional for completion feature
try:
    import requests  # type: ignore[import-untyped]
    requests_available = True
except ImportError:
    requests = None
    requests_available = False


class ProviderConfigModel(BaseModel):
    api_key: str = ""
    base_url: str = ""
    models: list[str] = []


class ParametersConfigModel(BaseModel):
    temperature: float = 0.7
    top_p: float = 0.9
    max_tokens: int = 2000
    presence_penalty: float = 0.0
    frequency_penalty: float = 0.0


class FeaturesConfigModel(BaseModel):
    auto_hint: bool = False
    auto_explain: bool = False
    context_length: int = 10


class AIConfigModel(BaseModel):
    current_provider: str = "openai"
    current_model: str = "gpt-3.5-turbo"
    providers: dict[str, ProviderConfigModel] = {}
    parameters: ParametersConfigModel
    features: FeaturesConfigModel


class AIConfigResponse(BaseModel):
    success: bool
    config: AIConfigModel


class TestConnectionResponse(BaseModel):
    success: bool
    message: str


class CompletionRequest(BaseModel):
    prefix: str = Field(..., description="当前输入的文本前缀")
    context: str = Field(default="", description="笔记的完整内容作为上下文")
    max_tokens: int = Field(default=150, description="最大生成token数")


class CompletionConfigModel(BaseModel):
    enabled: bool = True
    require_confirm: bool = False  # 二次确认开关
    trigger_delay: int = 500  # 防抖延迟(ms)
    max_tokens: int = 150


class CompletionConfigResponse(BaseModel):
    success: bool
    config: CompletionConfigModel


@router.get("/config/ai", response_model=AIConfigResponse)
def get_ai_config_endpoint() -> AIConfigResponse:
    """获取AI配置。"""
    config = get_ai_config()
    return AIConfigResponse(
        success=True,
        config=AIConfigModel(
            current_provider=config.config["current_provider"],
            current_model=config.config["current_model"],
            providers={
                k: ProviderConfigModel(
                    api_key=v.get("api_key", ""),
                    base_url=v.get("base_url", ""),
                    models=v.get("models", []),
                )
                for k, v in config.config["providers"].items()
            },
            parameters=ParametersConfigModel(
                temperature=config.config["parameters"].get("temperature", 0.7),
                top_p=config.config["parameters"].get("top_p", 0.9),
                max_tokens=config.config["parameters"].get("max_tokens", 2000),
                presence_penalty=config.config["parameters"].get("presence_penalty", 0.0),
                frequency_penalty=config.config["parameters"].get("frequency_penalty", 0.0),
            ),
            features=FeaturesConfigModel(
                auto_hint=config.config["features"]["auto_hint"],
                auto_explain=config.config["features"]["auto_explain"],
                context_length=config.config["features"]["context_length"],
            ),
        ),
    )


@router.post("/config/ai", response_model=dict[str, Any])
def save_ai_config_endpoint(payload: AIConfigModel) -> dict[str, Any]:
    """保存AI配置。"""
    try:
        config = get_ai_config()
        config.config["current_provider"] = payload.current_provider
        config.config["current_model"] = payload.current_model

        # Update providers
        for provider_name, provider_data in payload.providers.items():
            config.config["providers"][provider_name] = {
                "api_key": provider_data.api_key,
                "base_url": provider_data.base_url,
                "models": provider_data.models,
            }

        # Update parameters
        config.config["parameters"] = {
            "temperature": payload.parameters.temperature,
            "top_p": payload.parameters.top_p,
            "max_tokens": payload.parameters.max_tokens,
            "presence_penalty": payload.parameters.presence_penalty,
            "frequency_penalty": payload.parameters.frequency_penalty,
        }

        # Update features
        config.config["features"] = {
            "auto_hint": payload.features.auto_hint,
            "auto_explain": payload.features.auto_explain,
            "context_length": payload.features.context_length,
        }

        config.save_config()
        return {"success": True}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"保存配置失败: {e}")


@router.post("/config/ai/test", response_model=TestConnectionResponse)
def test_ai_connection_endpoint() -> TestConnectionResponse:
    """测试AI连接。
    
    实际测试与AI提供商的连接，验证配置是否正确。
    """
    try:
        config = get_ai_config()
        provider_name = config.config["current_provider"]
        provider_config = config.get_provider_config()

        # Ollama 本地服务检查
        if provider_name == "ollama":
            base_url = provider_config.get("base_url", "http://localhost:11434")
            try:
                if requests_available and requests is not None:
                    resp = requests.get(f"{base_url}/api/tags", timeout=5)
                    if resp.status_code == 200:
                        return TestConnectionResponse(
                            success=True,
                            message="Ollama 连接成功",
                        )
                    else:
                        return TestConnectionResponse(
                            success=False,
                            message=f"Ollama 返回错误: {resp.status_code}",
                        )
                else:
                    return TestConnectionResponse(
                        success=False,
                        message="requests 模块未安装",
                    )
            except Exception as e:
                return TestConnectionResponse(
                    success=False,
                    message=f"Ollama 连接失败: {e}",
                )

        # 云端API检查
        api_key = provider_config.get("api_key", "")
        if not api_key:
            return TestConnectionResponse(
                success=False,
                message="API Key 未设置",
            )

        base_url = provider_config.get("base_url", "")
        if not base_url:
            return TestConnectionResponse(
                success=False,
                message="Base URL 未设置",
            )

        # 尝试简单的API调用
        if requests_available and requests is not None:
            try:
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                }
                
                # 使用 models 端点测试连接（轻量级）
                test_url = f"{base_url}/models"
                resp = requests.get(test_url, headers=headers, timeout=10)
                
                if resp.status_code == 200:
                    return TestConnectionResponse(
                        success=True,
                        message=f"{provider_name.upper()} 连接成功",
                    )
                elif resp.status_code == 401:
                    return TestConnectionResponse(
                        success=False,
                        message="API Key 无效或已过期",
                    )
                elif resp.status_code == 404:
                    # 某些提供商可能没有这个端点，尝试其他方式
                    return TestConnectionResponse(
                        success=True,
                        message="配置格式正确（无法验证实际调用）",
                    )
                else:
                    return TestConnectionResponse(
                        success=False,
                        message=f"连接失败: HTTP {resp.status_code}",
                    )
            except requests.exceptions.Timeout:
                return TestConnectionResponse(
                    success=False,
                    message="连接超时，请检查网络",
                )
            except requests.exceptions.ConnectionError:
                return TestConnectionResponse(
                    success=False,
                    message="无法连接到服务器，请检查 Base URL",
                )
            except Exception as e:
                return TestConnectionResponse(
                    success=False,
                    message=f"连接测试失败: {e}",
                )
        else:
            return TestConnectionResponse(
                success=False,
                message="requests 模块未安装",
            )

    except Exception as e:
        return TestConnectionResponse(
            success=False,
            message=f"连接测试失败: {e}",
        )


@router.get("/completion/config", response_model=CompletionConfigResponse)
def get_completion_config() -> CompletionConfigResponse:
    """获取补全配置。"""
    return CompletionConfigResponse(
        success=True,
        config=CompletionConfigModel(**_completion_config)
    )


@router.post("/completion/config", response_model=dict[str, Any])
def save_completion_config(payload: CompletionConfigModel) -> dict[str, Any]:
    """保存补全配置。"""
    global _completion_config
    _completion_config = payload.model_dump()
    return {"success": True}


@router.post("/completion")
async def create_completion(payload: CompletionRequest) -> StreamingResponse:
    """使用AI创建文本补全。
    
    返回流式响应。
    """
    config = get_ai_config()
    provider_config = config.get_provider_config()

    # 检查配置
    if config.config["current_provider"] != "ollama":
        api_key = provider_config.get("api_key", "")
        if not api_key:
            raise HTTPException(status_code=400, detail="AI API Key 未设置")

    # 构建提示词
    system_prompt = """你是一个智能写作助手。根据用户提供的文本上下文，预测并续写接下来的内容。
要求：
1. 续写内容要自然流畅，与上下文保持一致
2. 只输出续写的文本，不要解释
3. 如果是列表、代码块等特殊格式，保持格式一致"""

    user_prompt = f"""请根据以下内容续写：

{payload.prefix}"""

    # 根据提供商类型选择调用方式
    provider_name = config.config["current_provider"]

    async def generate() -> AsyncGenerator[str, None]:
        """生成补全内容的流式响应。"""
        try:
            if requests_available and requests is not None:
                if provider_name == "ollama":
                    # Ollama 流式调用
                    base_url = provider_config.get("base_url", "http://localhost:11434")
                    model = config.config.get("current_model", "llama2")

                    data = {
                        "model": model,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt}
                        ],
                        "stream": True,
                        "options": {"temperature": 0.7}
                    }

                    response = requests.post(
                        f"{base_url}/api/chat",
                        json=data,
                        stream=True,
                        timeout=60
                    )

                    for line in response.iter_lines():
                        if line:
                            try:
                                chunk = json.loads(line)
                                if "message" in chunk and "content" in chunk["message"]:
                                    content = chunk["message"]["content"]
                                    yield f"data: {json.dumps({'text': content})}\n\n"
                            except json.JSONDecodeError:
                                continue
                else:
                    # OpenAI 兼容流式调用
                    base_url = provider_config.get("base_url", "https://api.openai.com/v1")
                    api_key = provider_config.get("api_key", "")
                    model = config.config.get("current_model", "gpt-3.5-turbo")

                    headers = {
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json"
                    }

                    data = {
                        "model": model,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt}
                        ],
                        "temperature": 0.7,
                        "max_tokens": payload.max_tokens,
                        "stream": True
                    }

                    response = requests.post(
                        f"{base_url}/chat/completions",
                        headers=headers,
                        json=data,
                        stream=True,
                        timeout=60
                    )

                    for line in response.iter_lines():
                        if line:
                            line_str = line.decode('utf-8')
                            if line_str.startswith('data: '):
                                try:
                                    chunk = json.loads(line_str[6:])
                                    if "choices" in chunk and chunk["choices"]:
                                        delta = chunk["choices"][0].get("delta", {})
                                        content = delta.get("content", "")
                                        if content:
                                            yield f"data: {json.dumps({'text': content})}\n\n"
                                except json.JSONDecodeError:
                                    continue

            yield f"data: {json.dumps({'done': True})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        content=generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )
