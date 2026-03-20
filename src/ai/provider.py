try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False
    requests = None

import json
import os
import shutil
import time
import uuid
import mimetypes
import base64
from abc import ABC, abstractmethod


IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif"}
DOCUMENT_EXTENSIONS = {".pdf", ".txt", ".md", ".docx"}
MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024
MAX_ATTACHMENTS_PER_MESSAGE = 5

class AIProvider(ABC):
    """AI提供商基类"""
    @abstractmethod
    def chat(self, messages, **kwargs):
        pass
    
    @abstractmethod
    def list_models(self):
        pass

class OpenAIProvider(AIProvider):
    """OpenAI兼容的提供商（支持OpenAI、Anthropic、自定义）"""
    def __init__(self, api_key, base_url):
        self.api_key = api_key
        self.base_url = base_url.rstrip('/')
    
    def chat(self, messages, model, temperature=0.7, max_tokens=2000, **kwargs):
        if not REQUESTS_AVAILABLE:
            raise Exception("requests库未安装，请运行: pip install requests")
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        data = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            **kwargs
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=data,
                timeout=60
            )
            response.raise_for_status()
            return response.json()["choices"][0]["message"]["content"]
        except UnicodeEncodeError:
            raise Exception("配置错误：API Key 或 Base URL 中包含非法字符（如中文或特殊空格），请检查 AI 设置")
        except requests.exceptions.RequestException as e:
            raise Exception(f"API调用失败: {str(e)}")
    
    def list_models(self):
        if not REQUESTS_AVAILABLE:
            return []
        try:
            headers = {"Authorization": f"Bearer {self.api_key}"}
            response = requests.get(f"{self.base_url}/models", headers=headers, timeout=10)
            response.raise_for_status()
            return [m["id"] for m in response.json()["data"]]
        except:
            return []

class OllamaProvider(AIProvider):
    """Ollama本地模型提供商"""
    def __init__(self, base_url):
        self.base_url = base_url.rstrip('/')
    
    def chat(self, messages, model, temperature=0.7, **kwargs):
        if not REQUESTS_AVAILABLE:
            raise Exception("requests库未安装，请运行: pip install requests")
        
        data = {
            "model": model,
            "messages": messages,
            "stream": False,
            "options": {"temperature": temperature}
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/api/chat",
                json=data,
                timeout=120
            )
            response.raise_for_status()
            return response.json()["message"]["content"]
        except UnicodeEncodeError:
            raise Exception("配置错误：Base URL 中包含非法字符（如中文），请检查 AI 设置")
        except requests.exceptions.RequestException as e:
            raise Exception(f"Ollama调用失败: {str(e)}")
    
    def list_models(self):
        if not REQUESTS_AVAILABLE:
            return []
        try:
            response = requests.get(f"{self.base_url}/api/tags", timeout=5)
            response.raise_for_status()
            return [m["name"] for m in response.json()["models"]]
        except:
            return []

class AIManager:
    """AI管理器 - 统一调用入口"""
    def __init__(self, config):
        self.config = config
        self.data_dir = self._get_data_dir()
        self.conversations_dir = os.path.join(self.data_dir, "conversations")
        self.uploads_dir = os.path.join(self.data_dir, "uploads")
        self.sessions_file = os.path.join(self.conversations_dir, "sessions.json")
        self.sessions = {}
        self.active_session_id = None

        os.makedirs(self.conversations_dir, exist_ok=True)
        os.makedirs(self.uploads_dir, exist_ok=True)
        self._load_sessions()
        if not self.active_session_id or self.active_session_id not in self.sessions:
            self.create_session(title="新对话", switch=True)

    @property
    def conversation_history(self):
        """保持与旧代码兼容：返回当前会话消息列表"""
        return self._get_active_session()["messages"]

    @conversation_history.setter
    def conversation_history(self, value):
        session = self._get_active_session()
        session["messages"] = list(value or [])
        session["updated_at"] = time.time()
        self._save_sessions()

    def _get_data_dir(self):
        if hasattr(self.config, "config_file") and self.config.config_file:
            return os.path.dirname(self.config.config_file)
        return os.path.join(os.getcwd(), "data")

    def _load_sessions(self):
        if not os.path.exists(self.sessions_file):
            return

        try:
            with open(self.sessions_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            self.active_session_id = data.get("active_session_id")
            loaded_sessions = data.get("sessions", [])
            for session in loaded_sessions:
                session_id = session.get("id")
                if not session_id:
                    continue
                self.sessions[session_id] = {
                    "id": session_id,
                    "title": session.get("title", "新对话"),
                    "messages": session.get("messages", []),
                    "created_at": session.get("created_at", time.time()),
                    "updated_at": session.get("updated_at", time.time()),
                }
        except Exception:
            # 会话文件损坏时降级为全新状态，避免阻塞应用启动
            self.sessions = {}
            self.active_session_id = None

    def _save_sessions(self):
        payload = {
            "active_session_id": self.active_session_id,
            "sessions": list(self.sessions.values()),
        }
        temp_file = f"{self.sessions_file}.tmp"
        with open(temp_file, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
        os.replace(temp_file, self.sessions_file)

    def _get_active_session(self):
        if not self.active_session_id or self.active_session_id not in self.sessions:
            self.create_session(title="新对话", switch=True)
        return self.sessions[self.active_session_id]

    def list_sessions(self):
        """列出会话摘要（按最近更新时间倒序）"""
        summaries = []
        for session in self.sessions.values():
            summaries.append({
                "id": session["id"],
                "title": session["title"],
                "created_at": session["created_at"],
                "updated_at": session["updated_at"],
                "message_count": len(session.get("messages", [])),
            })
        return sorted(summaries, key=lambda x: x["updated_at"], reverse=True)

    def create_session(self, title=None, switch=True):
        """创建新会话"""
        session_id = uuid.uuid4().hex[:12]
        now = time.time()
        session = {
            "id": session_id,
            "title": title or time.strftime("新对话 %m-%d %H:%M"),
            "messages": [],
            "created_at": now,
            "updated_at": now,
        }
        self.sessions[session_id] = session
        if switch:
            self.active_session_id = session_id
        self._save_sessions()
        return session

    def switch_session(self, session_id):
        """切换当前会话"""
        if session_id not in self.sessions:
            raise ValueError("会话不存在")
        self.active_session_id = session_id
        self.sessions[session_id]["updated_at"] = time.time()
        self._save_sessions()
        return self.sessions[session_id]

    def rename_session(self, session_id, title):
        if session_id not in self.sessions:
            raise ValueError("会话不存在")
        self.sessions[session_id]["title"] = (title or "").strip() or "新对话"
        self.sessions[session_id]["updated_at"] = time.time()
        self._save_sessions()

    def delete_session(self, session_id):
        if session_id not in self.sessions:
            raise ValueError("会话不存在")
        if len(self.sessions) <= 1:
            raise ValueError("至少保留一个会话")

        del self.sessions[session_id]
        if self.active_session_id == session_id:
            self.active_session_id = next(iter(self.sessions.keys()))
        self._save_sessions()

    def get_active_session_id(self):
        return self.active_session_id

    def get_active_session_title(self):
        return self._get_active_session()["title"]

    def _validate_attachments(self, attachments):
        if not attachments:
            return []

        if len(attachments) > MAX_ATTACHMENTS_PER_MESSAGE:
            raise ValueError(f"单次最多上传 {MAX_ATTACHMENTS_PER_MESSAGE} 个附件")

        normalized = []
        for item in attachments:
            path = item.get("path") if isinstance(item, dict) else item
            if not path:
                continue
            if not os.path.isfile(path):
                raise ValueError(f"文件不存在: {path}")

            ext = os.path.splitext(path)[1].lower()
            if ext not in IMAGE_EXTENSIONS and ext not in DOCUMENT_EXTENSIONS:
                raise ValueError(f"不支持的文件类型: {os.path.basename(path)}")

            size = os.path.getsize(path)
            if size > MAX_ATTACHMENT_SIZE:
                raise ValueError(f"文件超过大小限制(10MB): {os.path.basename(path)}")

            normalized.append(path)
        return normalized

    def _store_attachments(self, attachments):
        paths = self._validate_attachments(attachments)
        if not paths:
            return []

        session_id = self.get_active_session_id()
        session_upload_dir = os.path.join(self.uploads_dir, session_id)
        os.makedirs(session_upload_dir, exist_ok=True)

        stored = []
        for path in paths:
            ext = os.path.splitext(path)[1].lower()
            file_id = uuid.uuid4().hex
            stored_name = f"{file_id}{ext}"
            dst = os.path.join(session_upload_dir, stored_name)
            shutil.copy2(path, dst)
            mime_type = mimetypes.guess_type(path)[0] or "application/octet-stream"
            stored.append({
                "id": file_id,
                "name": os.path.basename(path),
                "stored_name": stored_name,
                "path": os.path.relpath(dst, self.data_dir),
                "type": "image" if ext in IMAGE_EXTENSIONS else "document",
                "mime_type": mime_type,
                "size": os.path.getsize(dst),
                "created_at": time.time(),
            })
        return stored

    def _safe_read_text_file(self, abs_path, max_chars=6000):
        try:
            with open(abs_path, "r", encoding="utf-8") as f:
                return f.read(max_chars)
        except Exception:
            return ""

    def _build_user_message_for_provider(self, provider_name, user_message, attachments_meta):
        if not attachments_meta:
            return {"role": "user", "content": user_message}

        if provider_name == "openai":
            blocks = [{"type": "text", "text": user_message}]
            doc_chunks = []
            unresolved_docs = []

            for item in attachments_meta:
                abs_path = os.path.join(self.data_dir, item["path"])
                if item["type"] == "image":
                    try:
                        with open(abs_path, "rb") as f:
                            b64 = base64.b64encode(f.read()).decode("ascii")
                        blocks.append({
                            "type": "image_url",
                            "image_url": {"url": f"data:{item['mime_type']};base64,{b64}"}
                        })
                    except Exception:
                        unresolved_docs.append(item["name"])
                else:
                    ext = os.path.splitext(item["name"])[1].lower()
                    if ext in {".txt", ".md"}:
                        snippet = self._safe_read_text_file(abs_path)
                        if snippet:
                            doc_chunks.append(f"[文件:{item['name']}]\n{snippet}")
                        else:
                            unresolved_docs.append(item["name"])
                    else:
                        unresolved_docs.append(item["name"])

            if doc_chunks:
                blocks.append({
                    "type": "text",
                    "text": "\n\n".join(doc_chunks)
                })
            if unresolved_docs:
                blocks.append({
                    "type": "text",
                    "text": "以下文件已上传但当前未做文本解析，请结合文件名理解上下文: " + ", ".join(unresolved_docs)
                })
            return {"role": "user", "content": blocks}

        # 非 OpenAI 兼容模型：降级为文本附加说明
        lines = [user_message, "", "附件信息:"]
        for item in attachments_meta:
            abs_path = os.path.join(self.data_dir, item["path"])
            if item["type"] == "document" and os.path.splitext(item["name"])[1].lower() in {".txt", ".md"}:
                snippet = self._safe_read_text_file(abs_path)
                lines.append(f"- {item['name']} ({item['type']})")
                if snippet:
                    lines.append(f"  内容摘要: {snippet[:1200]}")
            else:
                lines.append(f"- {item['name']} ({item['type']})")
        return {"role": "user", "content": "\n".join(lines)}

    def _message_to_provider_format(self, provider_name, message):
        role = message.get("role", "user")
        content = message.get("content", "")
        attachments = message.get("attachments", [])

        if role == "user" and attachments:
            return self._build_user_message_for_provider(provider_name, content, attachments)
        return {"role": role, "content": content}
    
    def get_provider(self):
        """获取当前提供商实例"""
        provider_name = self.config.config["current_provider"]
        provider_config = self.config.config["providers"][provider_name]
        
        if provider_name == "ollama":
            return OllamaProvider(provider_config["base_url"])
        else:
            return OpenAIProvider(
                provider_config.get("api_key", ""),
                provider_config.get("base_url", "https://api.openai.com/v1")
            )
    
    def chat(self, user_message, system_prompt=None, attachments=None):
        """发送消息并获取回复（支持附件）"""
        messages = []
        provider_name = self.config.config["current_provider"]

        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})

        context_length = self.config.config["features"]["context_length"]
        if context_length > 0:
            history = self.conversation_history[-(context_length*2):]
            for msg in history:
                messages.append(self._message_to_provider_format(provider_name, msg))

        attachments_meta = self._store_attachments(attachments or [])
        messages.append(self._build_user_message_for_provider(provider_name, user_message, attachments_meta))

        provider = self.get_provider()
        params = self.config.config["parameters"]
        model = self.config.config["current_model"]

        response = provider.chat(messages, model=model, **params)

        active_session = self._get_active_session()
        active_session["messages"].append({
            "role": "user",
            "content": user_message,
            "attachments": attachments_meta,
        })
        active_session["messages"].append({"role": "assistant", "content": response})
        active_session["updated_at"] = time.time()
        self._save_sessions()

        return response

    def clear_history(self):
        """兼容旧调用：清空动作改为创建并切换到新会话"""
        self.create_session(title="新对话", switch=True)
    
    def get_hint(self, question):
        """获取智能提示"""
        prompt = f"用户正在学习这个问题：\n{question}\n\n请给出一个不直接透露答案的提示，帮助用户思考。"
        return self.chat(prompt, system_prompt="你是一个学习助手，擅长给出启发性的提示而不是直接答案。")
    
    def explain_answer(self, question, answer):
        """解释答案"""
        prompt = f"题目：{question}\n答案：{answer}\n\n请用简单易懂的语言解释这个答案，帮助加深理解。"
        return self.chat(prompt, system_prompt="你是一个学习助手，擅长用通俗的语言解释复杂概念。")
    
    def generate_related(self, question, answer):
        """生成相关问题"""
        prompt = f"基于这个知识点：\n题目：{question}\n答案：{answer}\n\n请生成3个相关的问题，帮助巩固这个知识点。"
        return self.chat(prompt, system_prompt="你是一个学习助手，擅长设计相关的练习题。")
    
    def analyze_mistakes(self, cards_data):
        """分析错题"""
        prompt = f"用户最近答错的题目：\n{cards_data}\n\n请分析可能的薄弱环节，并给出学习建议。"
        return self.chat(prompt, system_prompt="你是一个学习分析师，擅长发现学习中的问题并给出建议。")