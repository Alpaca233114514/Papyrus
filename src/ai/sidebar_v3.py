"""AI侧边栏 - 重新设计"""
import tkinter as tk
try:
    from tkinter import ttk
except ImportError:
    import tkinter.ttk as ttk
from tkinter import messagebox, filedialog, simpledialog
import threading
import json
import os
import re

class AISidebar:
    """AI侧边栏"""
    def __init__(self, parent, ai_manager, get_current_card_callback, card_tools=None, logger=None):
        self.parent = parent
        self.ai_manager = ai_manager
        self.get_current_card = get_current_card_callback
        self.card_tools = card_tools
        self.logger = logger
        self.is_processing = False
        self.agent_mode = tk.BooleanVar(value=True)  # Agent模式开关
        self.pending_attachments = []
        self.session_label_to_id = {}
        
        # 创建侧边栏容器
        self.sidebar = tk.Frame(parent, bg="#ffffff")
        self.sidebar.pack(side="right", fill="both", expand=True)
        self.create_widgets()
    
    def create_widgets(self):
        """创建所有组件"""
        # 1. 顶部标题栏
        self.create_header()
        # 2. 底部输入区（先pack，确保占位）
        self.create_input_area()
        # 3. 对话显示区（填充剩余空间）
        self.create_chat_area()
    
    def create_header(self):
        """创建顶部栏"""
        header = tk.Frame(self.sidebar, bg="#ffffff")
        header.pack(side="top", fill="x", padx=15, pady=10)
        
        # 标题
        tk.Label(header, text="AI 助手", 
                font=("微软雅黑", 13, "bold"),
                bg="#ffffff", fg="#333333").pack(side="left")
        
        # 按钮
        btn_frame = tk.Frame(header, bg="#ffffff")
        btn_frame.pack(side="right")
        
        tk.Button(btn_frame, text="＋", command=self.new_chat,
                 bg="#f0f0f0", fg="#666666", font=("微软雅黑", 10),
                 relief="flat", width=3).pack(side="left", padx=2)

        tk.Button(btn_frame, text="✎", command=self.rename_current_chat,
             bg="#f0f0f0", fg="#666666", font=("微软雅黑", 10),
             relief="flat", width=3).pack(side="left", padx=2)
        
        tk.Button(btn_frame, text="⚙", command=self.open_settings,
                 bg="#f0f0f0", fg="#666666", font=("微软雅黑", 10),
                 relief="flat", width=3).pack(side="left", padx=2)
        
        # 分隔线
        tk.Frame(self.sidebar, bg="#e0e0e0", height=1).pack(side="top", fill="x")
        
        # 状态栏
        status_bar = tk.Frame(self.sidebar, bg="#f8f8f8")
        status_bar.pack(side="top", fill="x", padx=15, pady=8)
        
        self.model_label = tk.Label(status_bar, 
                                    text=self.ai_manager.config.config["current_model"],
                                    font=("微软雅黑", 9),
                                    bg="#f8f8f8", fg="#888888")
        self.model_label.pack(side="left")

        self.session_var = tk.StringVar(value="")
        self.session_menu = tk.OptionMenu(status_bar, self.session_var, "")
        self.session_menu.config(font=("微软雅黑", 8), bg="#ffffff", relief="flat", highlightthickness=0)
        self.session_menu.pack(side="left", padx=(8, 0))

        self.refresh_session_menu(select_active=True)
        
        self.status_label = tk.Label(status_bar, text="● 就绪",
                                     font=("微软雅黑", 9),
                                     bg="#f8f8f8", fg="#28a745")
        self.status_label.pack(side="right")
        
        # 分隔线
        tk.Frame(self.sidebar, bg="#e0e0e0", height=1).pack(side="top", fill="x")
    
    def create_chat_area(self):
        """创建对话区"""
        chat_frame = tk.Frame(self.sidebar, bg="#ffffff")
        chat_frame.pack(side="top", fill="both", expand=True)
        
        # 滚动条
        scrollbar = tk.Scrollbar(chat_frame)
        scrollbar.pack(side="right", fill="y")
        
        # 对话显示
        self.chat_display = tk.Text(chat_frame, 
                                    wrap="word",
                                    font=("微软雅黑", 10),
                                    bg="#ffffff", 
                                    fg="#333333",
                                    relief="flat",
                                    padx=15, 
                                    pady=15,
                                    state="disabled",
                                    yscrollcommand=scrollbar.set)
        self.chat_display.pack(side="left", fill="both", expand=True)
        scrollbar.config(command=self.chat_display.yview)
        
        # 配置样式
        self.chat_display.tag_configure("user_label", 
                                       foreground="#1976d2",
                                       font=("微软雅黑", 9, "bold"))
        self.chat_display.tag_configure("user_bubble", 
                                       background="#e3f2fd",
                                       foreground="#1565c0",
                                       font=("微软雅黑", 10),
                                       lmargin1=10, lmargin2=10, rmargin=10,
                                       spacing1=3, spacing3=8)
        self.chat_display.tag_configure("assistant_label", 
                                       foreground="#666666",
                                       font=("微软雅黑", 9, "bold"))
        self.chat_display.tag_configure("assistant_bubble", 
                                       background="#f5f5f5",
                                       foreground="#333333",
                                       font=("微软雅黑", 10),
                                       lmargin1=10, lmargin2=10, rmargin=10,
                                       spacing1=3, spacing3=8)
        self.chat_display.tag_configure("system", 
                                       foreground="#999999",
                                       font=("微软雅黑", 9, "italic"))
        
    
    def create_input_area(self):
        """创建输入区"""

        bottom_panel = tk.Frame(self.sidebar, bg="#f8f8f8")
        bottom_panel.pack(side="bottom", fill="x")

        tk.Frame(bottom_panel, bg="#e0e0e0", height=1).pack(side="top", fill="x")

        # 第一行：模式选择
        mode_row = tk.Frame(bottom_panel, bg="#f8f8f8")
        mode_row.pack(side="top", fill="x", padx=15, pady=(3, 0))

        tk.Label(mode_row,
                text="模式",
                font=("微软雅黑", 9),
                bg="#f8f8f8", fg="#666666").pack(side="left", padx=(0, 8))

        self.agent_btn = tk.Label(mode_row,
                                   text="Agent",
                                   bg="#1976d2",
                                   fg="#ffffff",
                                   font=("微软雅黑", 9),
                                   padx=10,
                                   pady=2,
                                   cursor="hand2")
        self.agent_btn.pack(side="left", padx=(0, 5))
        self.agent_btn.bind("<Button-1>", lambda e: self.set_mode(True))

        self.chat_btn = tk.Label(mode_row,
                                 text="Chat",
                                 bg="#e0e0e0",
                                 fg="#666666",
                                 font=("微软雅黑", 9),
                                 padx=10,
                                 pady=2,
                                 cursor="hand2")
        self.chat_btn.pack(side="left")
        self.chat_btn.bind("<Button-1>", lambda e: self.set_mode(False))

        # 第二行：模型选择
        model_row = tk.Frame(bottom_panel, bg="#f8f8f8")
        model_row.pack(side="top", fill="x", padx=15, pady=(1, 1))

        provider = self.ai_manager.config.config["current_provider"]
        models = self.ai_manager.config.config["providers"][provider]["models"]
        current_model = self.ai_manager.config.config["current_model"]

        tk.Label(model_row,
                text="模型",
                font=("微软雅黑", 9),
                bg="#f8f8f8", fg="#666666").pack(side="left", padx=(0, 6))

        self.model_var = tk.StringVar(value=current_model)
        self.model_var.trace_add("write", self._on_model_var_changed)
        self.model_menu = tk.OptionMenu(model_row, self.model_var, *models, command=self.on_model_change)
        self.model_menu.config(bg="#ffffff", fg="#666666", font=("微软雅黑", 9),
        relief="flat", highlightthickness=0, padx=6, pady=1)
        self.model_menu.pack(side="left")

        input_border_container = tk.Frame(bottom_panel, bg="#f8f8f8")
        input_border_container.pack(side="top", fill="x", padx=15, pady=(0, 1))

        attachment_row = tk.Frame(bottom_panel, bg="#f8f8f8")
        attachment_row.pack(side="top", fill="x", padx=15, pady=(0, 2))

        tk.Button(attachment_row,
              text="📎 添加文件",
              command=self.pick_attachments,
              bg="#f0f0f0", fg="#666666", font=("微软雅黑", 9),
              relief="flat").pack(side="left")

        self.attachments_label = tk.Label(attachment_row,
                          text="未添加附件",
                          font=("微软雅黑", 8),
                          bg="#f8f8f8", fg="#999999")
        self.attachments_label.pack(side="left", padx=(8, 0))

        input_border = tk.Frame(input_border_container, bg="#d0d0d0", bd=1, relief="solid")
        input_border.pack(fill="x")

        input_inner = tk.Frame(input_border, bg="#ffffff")
        input_inner.pack(fill="x", padx=1, pady=1)
        self.chat_input = tk.Text(input_inner,
            height=1,
            font=("微软雅黑", 10),
            bg="#ffffff",
            fg="#333333",
            relief="flat",
            bd=0,
            padx=10,
            pady=5,
            wrap="none")
        self.chat_input.pack(fill="both", expand=True)
        self.chat_input.bind("<Return>", self.on_enter)
        self.chat_input.bind("<Shift-Return>", lambda e: None)
        self._setup_drop_bindings()

    def _setup_drop_bindings(self):
        """绑定拖拽事件（支持 tkdnd 时可直接接收文件路径字符串）"""
        if hasattr(self.chat_input, "drop_target_register") and hasattr(self.chat_input, "dnd_bind"):
            try:
                self.chat_input.drop_target_register("DND_Files")
                self.chat_input.dnd_bind("<<Drop>>", self.on_file_drop)
                return
            except tk.TclError:
                pass

        for sequence in ("<<Drop>>", "<Drop>"):
            try:
                self.chat_input.bind(sequence, self.on_file_drop)
            except tk.TclError:
                continue

    def refresh_session_menu(self, select_active=False):
        """刷新会话下拉菜单"""
        if not hasattr(self.ai_manager, "list_sessions") or not hasattr(self, "session_menu"):
            return

        sessions = self.ai_manager.list_sessions()
        self.session_label_to_id = {}
        menu = self.session_menu["menu"]
        menu.delete(0, "end")

        for item in sessions:
            label = f"{item['title']} ({item['message_count']})"
            self.session_label_to_id[label] = item["id"]
            menu.add_command(label=label, command=tk._setit(self.session_var, label, self.on_session_change))

        if not sessions:
            self.session_var.set("")
            return

        if select_active:
            active_id = self.ai_manager.get_active_session_id()
            for label, sid in self.session_label_to_id.items():
                if sid == active_id:
                    self.session_var.set(label)
                    break

    def on_session_change(self, label):
        """切换会话并重绘消息"""
        session_id = self.session_label_to_id.get(label)
        if not session_id:
            return
        try:
            self.ai_manager.switch_session(session_id)
            self.render_current_session()
        except Exception as e:
            self.add_message("system", f"切换会话失败: {e}")

    def render_current_session(self):
        """渲染当前会话历史"""
        self.chat_display.config(state="normal")
        self.chat_display.delete(1.0, "end")
        self.chat_display.config(state="disabled")

        for msg in self.ai_manager.conversation_history:
            role = msg.get("role")
            content = msg.get("content", "")
            if role == "user":
                attachments = msg.get("attachments") or []
                if attachments:
                    names = ", ".join([a.get("name", "") for a in attachments if a.get("name")])
                    content = f"{content}\n[附件] {names}"
                self.add_message("user", content)
            elif role == "assistant":
                self.add_message("assistant", content)

    def _split_dropped_paths(self, raw):
        """解析拖拽事件中的文件路径字符串"""
        tokens = re.findall(r"\{[^}]+\}|\S+", (raw or "").strip())
        paths = []
        for token in tokens:
            token = token.strip().strip("{}\"")
            if token and os.path.exists(token):
                paths.append(token)
        return paths

    def on_file_drop(self, event):
        """处理拖拽上传"""
        paths = self._split_dropped_paths(getattr(event, "data", ""))
        if paths:
            self.add_attachments(paths)
            return "break"
        return None

    def pick_attachments(self):
        """选择附件"""
        paths = filedialog.askopenfilenames(
            title="选择要发送的文件",
            filetypes=[
                ("支持的文件", "*.png *.jpg *.jpeg *.webp *.gif *.pdf *.txt *.md *.docx"),
                ("图片", "*.png *.jpg *.jpeg *.webp *.gif"),
                ("文档", "*.pdf *.txt *.md *.docx"),
                ("所有文件", "*.*"),
            ],
        )
        self.add_attachments(list(paths))

    def add_attachments(self, paths):
        """加入待发送附件队列"""
        if not paths:
            return

        existing = {os.path.abspath(p) for p in self.pending_attachments}
        for path in paths:
            abs_path = os.path.abspath(path)
            if os.path.isfile(abs_path) and abs_path not in existing:
                self.pending_attachments.append(abs_path)
                existing.add(abs_path)
        self.update_attachments_label()

    def clear_pending_attachments(self):
        self.pending_attachments = []
        self.update_attachments_label()

    def update_attachments_label(self):
        if not hasattr(self, "attachments_label"):
            return
        count = len(self.pending_attachments)
        if count == 0:
            self.attachments_label.config(text="未添加附件")
            return
        names = [os.path.basename(p) for p in self.pending_attachments[:2]]
        suffix = "" if count <= 2 else f" 等{count}个"
        self.attachments_label.config(text=f"{', '.join(names)}{suffix}")
    
    def set_mode(self, is_agent):
        """切换模式"""
        self.agent_mode.set(is_agent)
        if is_agent:
            self.agent_btn.config(bg="#1976d2", fg="#ffffff")
            self.chat_btn.config(bg="#e0e0e0", fg="#666666")
        else:
            self.agent_btn.config(bg="#e0e0e0", fg="#666666")
            self.chat_btn.config(bg="#1976d2", fg="#ffffff")

    def _on_model_var_changed(self, *args):
        """model_var 变化时自动同步顶部标签和配置"""
        model = self.model_var.get()
        if not model:
            return
        # 同步顶部状态栏标签
        if hasattr(self, 'model_label'):
            self.model_label.config(text=model)
        # 同步配置（如果不一致）
        cfg = self.ai_manager.config.config
        if cfg.get("current_model") != model:
            cfg["current_model"] = model
            self.ai_manager.config.save_config()

    def on_model_change(self, model):
        """切换模型 - 确保配置、顶部标签、下拉框三方同步"""
        cfg = self.ai_manager.config.config
        cfg["current_model"] = model
        self.ai_manager.config.save_config()
        # 直接同步顶部标签
        self.model_label.config(text=model)
        # 同步下拉框显示（trace 会再次触发 _on_model_var_changed，但有幂等保护）
        if hasattr(self, 'model_var') and self.model_var.get() != model:
            self.model_var.set(model)
    
    def on_enter(self, event):
        """回车发送"""
        if not event.state & 0x1:
            self.send_message()
            return "break"
    
    def add_message(self, role, content):
        """添加消息"""
        self.chat_display.config(state="normal")
        
        if role == "user":
            self.chat_display.insert("end", "你\n", "user_label")
            self.chat_display.insert("end", content + "\n", "user_bubble")
            self.chat_display.insert("end", "\n")
        elif role == "assistant":
            self.chat_display.insert("end", "AI\n", "assistant_label")
            self.chat_display.insert("end", content + "\n", "assistant_bubble")
            self.chat_display.insert("end", "\n")
        else:
            self.chat_display.insert("end", content + "\n\n", "system")
        
        self.chat_display.see("end")
        self.chat_display.config(state="disabled")

    def _log_event(self, event_type, data=None, level="INFO"):
        """记录日志事件（可选）"""
        if self.logger and hasattr(self.logger, "log_event"):
            self.logger.log_event(event_type, data, level=level)

    def send_message(self):
        """发送消息"""
        if getattr(self, '_placeholder_active', False):
            return

        message = self.chat_input.get("1.0", "end").strip()
        if self.is_processing:
            return
        if not message and not self.pending_attachments:
            return

        self.chat_input.delete("1.0", "end")
        display_message = message or "[仅发送附件]"
        if self.pending_attachments:
            file_names = ", ".join([os.path.basename(p) for p in self.pending_attachments])
            display_message = f"{display_message}\n[附件] {file_names}"
        self.add_message("user", display_message)

        self.is_processing = True
        self.status_label.config(text="● 思考中...", fg="#ff9800")

        def process():
            import time
            start = time.time()
            try:
                card = self.get_current_card()
                system_prompt = "你是Papyrus学习助手，帮助用户学习和管理知识卡片。"

                if card:
                    system_prompt += f"\n\n当前卡片：\n题目：{card['q']}\n答案：{card['a']}"

                agent_mode = self.agent_mode.get()
                if agent_mode and self.card_tools:
                    system_prompt += f"\n\n{self.card_tools.get_tools_definition()}"

                self._log_event("ai.chat_start", {
                    "message_len": len(message),
                    "agent_mode": agent_mode,
                    "has_card": card is not None,
                    "attachments": len(self.pending_attachments),
                })

                attachments = list(self.pending_attachments)
                response = self.ai_manager.chat(message, system_prompt=system_prompt, attachments=attachments)
                elapsed = round(time.time() - start, 4)
                self._log_event("ai.chat_ok", {
                    "elapsed_s": elapsed,
                    "response_len": len(response),
                })

                self.parent.after(0, lambda: self.add_message("assistant", response))
                self.parent.after(0, lambda: self.status_label.config(text="● 就绪", fg="#28a745"))
                self.parent.after(0, self.clear_pending_attachments)
                self.parent.after(0, lambda: self.refresh_session_menu(select_active=True))

                if agent_mode and self.card_tools:
                    tool_call = self.card_tools.parse_tool_call(response)
                    if tool_call:
                        result = self.card_tools.execute_tool(tool_call["tool"], tool_call["params"])
                        self.parent.after(0, lambda r=result: self.add_message("system",
                            f"执行: {json.dumps(r, ensure_ascii=False, indent=2)}"))
            except Exception as e:
                elapsed = round(time.time() - start, 4)
                self._log_event("ai.chat_error", {
                    "elapsed_s": elapsed,
                    "error": str(e),
                }, level="ERROR")
                self.parent.after(0, lambda: self.add_message("system", f"错误: {str(e)}"))
                self.parent.after(0, lambda: self.status_label.config(text="● 错误", fg="#dc3545"))
            finally:
                self.is_processing = False

        threading.Thread(target=process, daemon=True).start()

    def new_chat(self):
        """新建会话（替代清空对话）"""
        self.ai_manager.create_session()
        self.clear_pending_attachments()
        self.render_current_session()
        self.refresh_session_menu(select_active=True)

    def rename_current_chat(self):
        """重命名当前会话"""
        if not hasattr(self.ai_manager, "rename_session"):
            self.add_message("system", "当前版本不支持会话重命名")
            return

        session_id = self.ai_manager.get_active_session_id()
        current_title = self.ai_manager.get_active_session_title()
        new_title = simpledialog.askstring("重命名对话", "请输入新名称:", initialvalue=current_title)
        if new_title is None:
            return

        new_title = new_title.strip()
        if not new_title:
            messagebox.showwarning("提示", "对话名称不能为空")
            return

        try:
            self.ai_manager.rename_session(session_id, new_title)
            self.refresh_session_menu(select_active=True)
            self.add_message("system", f"已重命名为: {new_title}")
        except Exception as e:
            self.add_message("system", f"重命名失败: {e}")

    def clear_chat(self):
        """兼容旧入口"""
        self.new_chat()

    def open_settings(self):
        """打开设置"""
        SettingsWindow(self.parent, self.ai_manager.config, self.update_model_display)

    def update_model_display(self):
        """更新模型显示（含下拉菜单刷新）—— 以 config 为唯一数据源，同步所有 UI"""
        cfg = self.ai_manager.config.config
        provider = cfg.get("current_provider", "")
        providers = cfg.get("providers", {})
        provider_cfg = providers.get(provider) or {}
        models = list(provider_cfg.get("models", []) or [])

        model = cfg.get("current_model", "")
        # 当前模型不在该提供商的列表中时，自动回退到第一个
        if models and model not in models:
            model = models[0]
            cfg["current_model"] = model
            self.ai_manager.config.save_config()

        # 1) 同步顶部状态栏标签
        self.model_label.config(text=model)

        # 2) 同步下拉框选项列表
        if hasattr(self, "model_menu"):
            menu = self.model_menu["menu"]
            menu.delete(0, "end")
            for m in (models or [model]):
                menu.add_command(label=m, command=tk._setit(self.model_var, m, self.on_model_change))

        # 3) 同步下拉框当前显示值（放在最后，触发 trace 会再次写 label，幂等无害）
        if hasattr(self, "model_var") and self.model_var.get() != model:
            self.model_var.set(model)



class SettingsWindow:
    """设置窗口"""
    def __init__(self, parent, config, callback=None):
        self.config = config
        self.callback = callback
        
        self.window = tk.Toplevel(parent)
        self.window.title("设置")
        self.window.geometry("600x500")
        
        notebook = ttk.Notebook(self.window)
        notebook.pack(fill="both", expand=True, padx=10, pady=10)
        
        self.setup_models_tab(notebook)
        self.setup_api_tab(notebook)
        self.setup_params_tab(notebook)
        
        tk.Button(self.window, text="保存设置", command=self.save_all,
                 bg="#28a745", fg="white", font=("微软雅黑", 10),
                 padx=30, pady=8).pack(pady=10)
    
    def setup_models_tab(self, notebook):
        frame = tk.Frame(notebook)
        notebook.add(frame, text="模型管理")
        
        top_frame = tk.Frame(frame)
        top_frame.pack(fill="x", padx=20, pady=10)
        
        tk.Label(top_frame, text="提供商:", font=("微软雅黑", 10)).pack(side="left", padx=(0, 10))
        
        self.provider_var = tk.StringVar(value=self.config.config["current_provider"])
        provider_menu = tk.OptionMenu(top_frame, self.provider_var,
                                     *self.config.config["providers"].keys(),
                                     command=self.on_provider_change)
        provider_menu.config(font=("微软雅黑", 9))
        provider_menu.pack(side="left", fill="x", expand=True)
        
        list_frame = tk.LabelFrame(frame, text="模型列表", font=("微软雅黑", 10, "bold"))
        list_frame.pack(fill="both", expand=True, padx=20, pady=10)
        
        list_container = tk.Frame(list_frame)
        list_container.pack(fill="both", expand=True, padx=10, pady=10)
        
        scrollbar = tk.Scrollbar(list_container)
        scrollbar.pack(side="right", fill="y")
        
        self.model_listbox = tk.Listbox(list_container, font=("微软雅黑", 10),
                                        yscrollcommand=scrollbar.set)
        self.model_listbox.pack(side="left", fill="both", expand=True)
        scrollbar.config(command=self.model_listbox.yview)
        
        btn_frame = tk.Frame(list_frame)
        btn_frame.pack(fill="x", padx=10, pady=(0, 10))
        
        tk.Button(btn_frame, text="➕ 添加", command=self.add_model,
                 bg="#28a745", fg="white", font=("微软雅黑", 9)).pack(side="left", padx=5)
        tk.Button(btn_frame, text="✏️ 编辑", command=self.edit_model,
                 bg="#007bff", fg="white", font=("微软雅黑", 9)).pack(side="left", padx=5)
        tk.Button(btn_frame, text="🗑️ 删除", command=self.delete_model,
                 bg="#dc3545", fg="white", font=("微软雅黑", 9)).pack(side="left", padx=5)
        
        self.update_model_list()
    
    def setup_api_tab(self, notebook):
        frame = tk.Frame(notebook)
        notebook.add(frame, text="API配置")
        
        canvas = tk.Canvas(frame)
        scrollbar = tk.Scrollbar(frame, orient="vertical", command=canvas.yview)
        scrollable_frame = tk.Frame(canvas)
        
        scrollable_frame.bind("<Configure>",
                             lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
        
        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
        
        self.api_entries = {}
        providers = self.config.config["providers"]
        
        for provider_name, provider_config in providers.items():
            group = tk.LabelFrame(scrollable_frame, text=provider_name.upper(),
                                 font=("微软雅黑", 10, "bold"))
            group.pack(fill="x", padx=20, pady=10)
            
            if "api_key" in provider_config:
                tk.Label(group, text="API Key:", font=("微软雅黑", 9)).grid(
                    row=0, column=0, sticky="w", padx=10, pady=5)
                
                entry = tk.Entry(group, show="●", width=50, font=("微软雅黑", 9))
                entry.insert(0, provider_config.get("api_key", ""))
                entry.grid(row=0, column=1, sticky="ew", padx=10, pady=5)
                self.api_entries[f"{provider_name}_api_key"] = entry
            
            if "base_url" in provider_config:
                tk.Label(group, text="Base URL:", font=("微软雅黑", 9)).grid(
                    row=1, column=0, sticky="w", padx=10, pady=5)
                
                entry = tk.Entry(group, width=50, font=("微软雅黑", 9))
                entry.insert(0, provider_config.get("base_url", ""))
                entry.grid(row=1, column=1, sticky="ew", padx=10, pady=5)
                self.api_entries[f"{provider_name}_base_url"] = entry
            
            group.columnconfigure(1, weight=1)
    
    def setup_params_tab(self, notebook):
        frame = tk.Frame(notebook)
        notebook.add(frame, text="参数")
        
        params = self.config.config["parameters"]
        
        self.create_param_slider(frame, "Temperature", "temperature",
                                 0, 2, 0.1, params["temperature"])
        self.create_param_slider(frame, "Max Tokens", "max_tokens",
                                 100, 4000, 100, params["max_tokens"])
    
    def create_param_slider(self, parent, label, key, from_, to, resolution, default):
        container = tk.Frame(parent)
        container.pack(fill="x", padx=20, pady=15)
        
        tk.Label(container, text=label, font=("微软雅黑", 10, "bold")).pack(anchor="w")
        
        var = tk.DoubleVar(value=default)
        setattr(self, f"{key}_var", var)
        
        value_label = tk.Label(container, textvariable=var, font=("微软雅黑", 9))
        value_label.pack(anchor="e")
        
        slider = tk.Scale(container, from_=from_, to=to, resolution=resolution,
                         orient="horizontal", variable=var, showvalue=False)
        slider.pack(fill="x")
    
    def on_provider_change(self, provider):
        self.update_model_list()
    
    def update_model_list(self):
        provider = self.provider_var.get()
        models = self.config.config["providers"][provider]["models"]
        
        self.model_listbox.delete(0, "end")
        for model in models:
            self.model_listbox.insert("end", model)
    
    def add_model(self):
        name = simpledialog.askstring("添加模型", "模型名称:")
        if not name:
            return
        
        provider = self.provider_var.get()
        models = self.config.config["providers"][provider]["models"]
        
        if name in models:
            messagebox.showwarning("提示", "模型已存在")
            return
        
        models.append(name)
        self.update_model_list()
    
    def edit_model(self):
        selection = self.model_listbox.curselection()
        if not selection:
            messagebox.showwarning("提示", "请选择模型")
            return
        
        old_name = self.model_listbox.get(selection[0])
        new_name = simpledialog.askstring("编辑模型", "模型名称:", initialvalue=old_name)
        
        if not new_name or new_name == old_name:
            return
        
        provider = self.provider_var.get()
        models = self.config.config["providers"][provider]["models"]
        
        idx = models.index(old_name)
        models[idx] = new_name
        self.update_model_list()
    
    def delete_model(self):
        selection = self.model_listbox.curselection()
        if not selection:
            messagebox.showwarning("提示", "请选择模型")
            return
        
        name = self.model_listbox.get(selection[0])
        
        if not messagebox.askyesno("确认", f"删除 '{name}'?"):
            return
        
        provider = self.provider_var.get()
        models = self.config.config["providers"][provider]["models"]
        
        if len(models) <= 1:
            messagebox.showwarning("提示", "至少保留一个模型")
            return
        
        models.remove(name)
        self.update_model_list()
    
    def save_all(self):
        # 保存API配置
        for provider in self.config.config["providers"].keys():
            if f"{provider}_api_key" in self.api_entries:
                self.config.config["providers"][provider]["api_key"] = \
                    self.api_entries[f"{provider}_api_key"].get()
            if f"{provider}_base_url" in self.api_entries:
                self.config.config["providers"][provider]["base_url"] = \
                    self.api_entries[f"{provider}_base_url"].get()
        
        # 保存参数设置
        if hasattr(self, "temperature_var"):
            self.config.config["parameters"]["temperature"] = self.temperature_var.get()
        if hasattr(self, "max_tokens_var"):
            self.config.config["parameters"]["max_tokens"] = int(self.max_tokens_var.get())
        
        # 保存当前选择的提供商
        new_provider = self.provider_var.get()
        self.config.config["current_provider"] = new_provider
        
        # 验证并更新当前模型
        current_model = self.config.config["current_model"]
        available_models = self.config.config["providers"][new_provider]["models"]
        
        # 如果当前模型不在新提供商的模型列表中，使用第一个可用模型
        if not available_models:
            messagebox.showwarning("警告", f"提供商 '{new_provider}' 没有可用模型，请先添加模型")
            return
        
        if current_model not in available_models:
            self.config.config["current_model"] = available_models[0]
            messagebox.showinfo("提示", f"已自动切换到模型: {available_models[0]}")

        # 保存配置到文件
        try:

            self.config.save_config()
            
            if self.callback:
                self.callback()
            
            messagebox.showinfo("成功", "设置已保存")
            self.window.destroy()
        except ValueError as e:
            # 配置验证错误（如包含非法字符）
            messagebox.showerror("配置错误", str(e))
        except Exception as e:
            messagebox.showerror("错误", f"保存设置失败: {str(e)}")