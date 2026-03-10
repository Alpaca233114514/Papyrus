"""AI侧边栏 - 重新设计"""
import tkinter as tk
try:
    from tkinter import ttk
except ImportError:
    import tkinter.ttk as ttk
from tkinter import messagebox, filedialog, simpledialog
import threading
import json

class AISidebar:
    """AI侧边栏"""
    def __init__(self, parent, ai_manager, get_current_card_callback, card_tools=None):
        self.parent = parent
        self.ai_manager = ai_manager
        self.get_current_card = get_current_card_callback
        self.card_tools = card_tools
        self.is_processing = False
        self.agent_mode = tk.BooleanVar(value=True)  # Agent模式开关
        
        # 创建侧边栏容器
        self.sidebar = tk.Frame(parent, width=400, bg="#ffffff")
        self.sidebar.pack(side="right", fill="y")
        self.sidebar.pack_propagate(False)
        
        self.create_widgets()
    
    def create_widgets(self):
        """创建所有组件"""
        # 1. 顶部标题栏
        self.create_header()
        
        # 2. 对话显示区
        self.create_chat_area()
        
        # 3. 底部输入区
        self.create_input_area()
    
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
        
        tk.Button(btn_frame, text="🗑", command=self.clear_chat,
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
        bottom_panel = tk.Frame(self.sidebar, bg="#f8f8f8", height=100)
        bottom_panel.pack(side="bottom", fill="x")
        bottom_panel.pack_propagate(False)

        tk.Frame(bottom_panel, bg="#e0e0e0", height=1).pack(side="top", fill="x")

        toolbar = tk.Frame(bottom_panel, bg="#f8f8f8")
        toolbar.pack(side="top", fill="x", padx=15, pady=(4, 3))

        mode_frame = tk.Frame(toolbar, bg="#f8f8f8")
        mode_frame.pack(side="left")

        tk.Label(mode_frame,
                text="模式",
                font=("微软雅黑", 9),
                bg="#f8f8f8", fg="#666666").pack(side="left", padx=(0, 8))

        self.agent_btn = tk.Button(mode_frame,
                                   text="Agent",
                                   command=lambda: self.set_mode(True),
                                   bg="#1976d2",
                                   fg="#ffffff",
                                   font=("微软雅黑", 9),
                                   relief="flat",
                                   padx=10,
                                   pady=3)
        self.agent_btn.pack(side="left", padx=(0, 5))

        self.chat_btn = tk.Button(mode_frame,
                                 text="Chat",
                                 command=lambda: self.set_mode(False),
                                 bg="#e0e0e0",
                                 fg="#666666",
                                 font=("微软雅黑", 9),
                                 relief="flat",
                                 padx=10,
                                 pady=3)
        self.chat_btn.pack(side="left")

        model_frame = tk.Frame(toolbar, bg="#f8f8f8")
        model_frame.pack(side="right")

        provider = self.ai_manager.config.config["current_provider"]
        models = self.ai_manager.config.config["providers"][provider]["models"]
        current_model = self.ai_manager.config.config["current_model"]
        
        tk.Label(model_frame,
                text="模型",
                font=("微软雅黑", 9),
                bg="#f8f8f8", fg="#666666").pack(side="left", padx=(0, 6))

        self.model_var = tk.StringVar(value=current_model)
        self.model_menu = tk.OptionMenu(model_frame, self.model_var, *models, command=self.on_model_change)
        self.model_menu.config(bg="#ffffff", fg="#666666", font=("微软雅黑", 9),
                              relief="flat", highlightthickness=0, padx=8, pady=2)
        self.model_menu.pack(side="left")

        input_border_container = tk.Frame(bottom_panel, bg="#f8f8f8")
        input_border_container.pack(side="top", fill="x", padx=15, pady=(0, 1))

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
                                 pady=8,
                                 wrap="none")
        self.chat_input.pack(fill="both", expand=True)
        self.chat_input.bind("<Return>", self.on_enter)
        self.chat_input.bind("<Shift-Return>", lambda e: None)

        tk.Label(bottom_panel,
                text="Enter 发送 · Shift+Enter 换行",
                font=("微软雅黑", 8),
                bg="#f8f8f8", fg="#999999").pack(side="top", anchor="w", padx=15, pady=3)
    
    def set_mode(self, is_agent):
        """切换模式"""
        self.agent_mode.set(is_agent)
        if is_agent:
            self.agent_btn.config(bg="#1976d2", fg="#ffffff")
            self.chat_btn.config(bg="#e0e0e0", fg="#666666")
        else:
            self.agent_btn.config(bg="#e0e0e0", fg="#666666")
            self.chat_btn.config(bg="#1976d2", fg="#ffffff")
    
    def on_model_change(self, model):
        """切换模型"""
        self.ai_manager.config.config["current_model"] = model
        self.ai_manager.config.save_config()
        self.update_model_display()
    
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
    
    def send_message(self):
        """发送消息"""
        message = self.chat_input.get("1.0", "end").strip()
        if not message or self.is_processing:
            return
        
        self.chat_input.delete("1.0", "end")
        self.add_message("user", message)
        
        self.is_processing = True
        self.status_label.config(text="● 思考中...", fg="#ff9800")
        
        def process():
            try:
                card = self.get_current_card()
                system_prompt = "你是Papyrus学习助手，帮助用户学习和管理知识卡片。"
                
                if card:
                    system_prompt += f"\n\n当前卡片：\n题目：{card['q']}\n答案：{card['a']}"
                
                # 根据模式决定是否启用工具
                if self.agent_mode.get() and self.card_tools:
                    system_prompt += f"\n\n{self.card_tools.get_tools_definition()}"
                
                response = self.ai_manager.chat(message, system_prompt=system_prompt)
                self.parent.after(0, lambda: self.add_message("assistant", response))
                self.parent.after(0, lambda: self.status_label.config(text="● 就绪", fg="#28a745"))
                
                # 只在Agent模式下执行工具调用
                if self.agent_mode.get() and self.card_tools:
                    tool_call = self.card_tools.parse_tool_call(response)
                    if tool_call:
                        result = self.card_tools.execute_tool(tool_call["tool"], tool_call["params"])
                        self.parent.after(0, lambda: self.add_message("system",
                            f"执行: {json.dumps(result, ensure_ascii=False, indent=2)}"))
            except Exception as e:
                self.parent.after(0, lambda: self.add_message("system", f"错误: {str(e)}"))
                self.parent.after(0, lambda: self.status_label.config(text="● 错误", fg="#dc3545"))
            finally:
                self.is_processing = False
        
        threading.Thread(target=process, daemon=True).start()
    
    def clear_chat(self):
        """清空对话"""
        if messagebox.askyesno("确认", "清空对话历史?"):
            self.ai_manager.clear_history()
            self.chat_display.config(state="normal")
            self.chat_display.delete(1.0, "end")
            self.chat_display.config(state="disabled")
    
    def open_settings(self):
        """打开设置"""
        SettingsWindow(self.parent, self.ai_manager.config, self.update_model_display)
    
    def update_model_display(self):
        """更新模型显示"""
        model = self.ai_manager.config.config["current_model"]
        self.model_label.config(text=model)


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
        except Exception as e:
            messagebox.showerror("错误", f"保存设置失败: {str(e)}")