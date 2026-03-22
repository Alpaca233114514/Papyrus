import tkinter as tk
from tkinter import filedialog, messagebox
import json
import os
import time
import shutil
import sys
import traceback

# 导入日志模块
try:
    from logger import PapyrusLogger
    from log_viewer import LogViewer

    LOG_AVAILABLE = True
except ImportError as e:
    LOG_AVAILABLE = False
    print(f"[WARNING] 日志模块导入失败: {e}")

# 导入AI模块（安全隔离）
AI_AVAILABLE = False
AI_IMPORT_ERROR = None
try:
    import requests  # noqa: F401

    print("[DEBUG] requests导入成功")
    from ai.config import AIConfig

    print("[DEBUG] AIConfig导入成功")
    from ai.provider import AIManager

    print("[DEBUG] AIManager导入成功")
    from ai.sidebar_v3 import AISidebar

    print("[DEBUG] AISidebar导入成功")
    from ai.tools import CardTools

    print("[DEBUG] CardTools导入成功")
    AI_AVAILABLE = True
except ImportError as e:
    AI_AVAILABLE = False
    AI_IMPORT_ERROR = str(e)
    print(f"[ERROR] 导入失败(ImportError): {e}")
except Exception as e:
    AI_AVAILABLE = False
    AI_IMPORT_ERROR = str(e)
    print(f"[ERROR] 导入失败(Exception): {e}")
    traceback.print_exc()

# 导入MCP模块（安全隔离）
MCP_AVAILABLE = False
try:
    from mcp.server import MCPServer

    MCP_AVAILABLE = True
    print("[DEBUG] MCPServer导入成功")
except ImportError as e:
    print(f"[WARNING] MCP模块导入失败: {e}")
except Exception as e:
    print(f"[WARNING] MCP模块导入异常: {e}")

# 获取项目根目录
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
BACKUP_DIR = os.path.join(BASE_DIR, "backup")
ASSETS_DIR = os.path.join(BASE_DIR, "assets")
LOG_DIR = os.path.join(BASE_DIR, "logs")

# 确保目录存在
for directory in [DATA_DIR, BACKUP_DIR, ASSETS_DIR, LOG_DIR]:
    os.makedirs(directory, exist_ok=True)

DATA_FILE = os.path.join(DATA_DIR, "Papyrusdata.json")
BACKUP_FILE = os.path.join(BACKUP_DIR, "Papyrusdata.json.bak")


def resource_path(relative_path: str) -> str:
    """获取资源文件的绝对路径，兼容开发环境和打包后的环境"""
    if hasattr(sys, "_MEIPASS"):
        # PyInstaller 打包后的临时目录
        return os.path.join(sys._MEIPASS, "assets", relative_path)
    return os.path.join(ASSETS_DIR, relative_path)


class PapyrusApp:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("Papyrus")

        # 图标容错处理
        try:
            self.root.iconbitmap(resource_path("icon.ico"))
        except Exception:
            pass  # 图标文件不存在时静默跳过

        self.root.geometry("1000x680")  # 左侧主学习区 + 右侧AI侧栏
        self.root.minsize(700, 500)

        self.cards = []
        self.current_card_index = -1
        self.is_showing_answer = False
        self.check_timer = None
        self.last_backup_time = 0  # 记录上次备份时间

        # 初始化日志系统
        self.logger = None
        self.mcp_server = None
        self.setup_logger()

        # macOS 窗口激活修复
        if sys.platform == 'darwin':
            # 绑定窗口显示事件
            self.root.bind('<Map>', self.on_window_map)

        self.load_data()
        self.setup_ui()  # 先初始化主界面容器
        self.setup_ai()  # 再初始化AI侧边栏
        self.setup_mcp()  # 启动MCP本地服务器
        self.next_card()

    def on_window_map(self, event):
        """窗口显示时的处理，用于 macOS 窗口激活修复"""
        # 延迟激活窗口，确保窗口完全显示
        self.root.after(50, self.activate_window)

    # -------------------------
    # 日志
    # -------------------------
    def setup_logger(self):
        """初始化日志系统"""
        if not LOG_AVAILABLE:
            self.logger = None
            return

        try:
            self.logger = PapyrusLogger(LOG_DIR)
            self.logger.info("Papyrus 启动成功")
            self.logger.log_activity("app_start", {"version": "1.2.2"})
        except Exception as e:
            print(f"[ERROR] 日志系统初始化失败: {e}")
            self.logger = None

    def open_log_viewer(self):
        """打开日志查看器"""
        if not LOG_AVAILABLE or self.logger is None:
            messagebox.showinfo("日志功能", "日志功能未启用")
            return

        try:
            LogViewer(self.root, self.logger)
            self.logger.log_activity("open_log_viewer", {})
        except Exception as e:
            messagebox.showerror("错误", f"无法打开日志查看器：{e}")
            if self.logger:
                self.logger.error(f"打开日志查看器失败: {e}")

    # -------------------------
    # UI
    # -------------------------
    def setup_ui(self):
        # 主体区域：左侧主学习区 + 右侧AI侧栏
        self.content_area = tk.Frame(self.root)
        self.content_area.pack(side="top", fill="both", expand=True)

        self.main_panel = tk.Frame(self.content_area, width=400)
        self.main_panel.pack(side="left", fill="y")
        self.main_panel.pack_propagate(False)

        # 1. 顶部状态栏
        self.status_var = tk.StringVar()
        tk.Label(self.main_panel, textvariable=self.status_var, fg="gray").pack(
            side="top", pady=5
        )

        # 2. 底部按钮容器 (固定高度80，防止按钮切换时界面跳动)
        self.btn_frame = tk.Frame(self.main_panel, height=50)
        self.btn_frame.pack(side="bottom", fill="x", pady=4, padx=16)
        self.btn_frame.pack_propagate(False)

        # 定义两组按钮界面
        # 状态A：显示按钮
        self.show_btn_frame = tk.Frame(self.btn_frame)
        self.show_btn = tk.Button(
            self.show_btn_frame,
            text="显示卷尾 (Space)",
            command=self.show_answer,
            font=("微软雅黑", 12),
            bg="#e1f5fe",
        )
        self.show_btn.pack(fill="both", expand=True, ipady=5)

        # 状态B：评分按钮组
        self.grading_frame = tk.Frame(self.btn_frame)
        btn_config = [
            ("忘记 (1)", "#ffcdd2", 1),
            ("模糊 (2)", "#fff9c4", 2),
            ("秒杀 (3)", "#c8e6c9", 3),
        ]
        for text, color, score in btn_config:
            tk.Button(
                self.grading_frame,
                text=text,
                bg=color,
                command=lambda s=score: self.rate_card(s),
                font=("微软雅黑", 10),
            ).pack(side="left", fill="both", expand=True, padx=5)

        # 3. 中间卡片区 (带滚动条的文本)
        self.card_frame = tk.Frame(self.main_panel, relief="groove", bd=2)
        self.card_frame.pack(side="top", fill="both", expand=True, padx=10, pady=5)

        scrollbar = tk.Scrollbar(self.card_frame)
        scrollbar.pack(side="right", fill="y")

        self.content_text = tk.Text(
            self.card_frame,
            font=("微软雅黑", 13),
            wrap="word",
            bg="#fdf6e3",
            fg="#5d4037",
            relief="flat",
            padx=15,
            pady=15,
            state="disabled",
            yscrollcommand=scrollbar.set,
        )
        self.content_text.bind("<Button-1>", lambda e: "break")
        self.content_text.pack(side="left", fill="both", expand=True)
        scrollbar.config(command=self.content_text.yview)

        # 配置文字样式
        self.content_text.tag_configure("center", justify="center")
        self.content_text.tag_configure("bold", font=("微软雅黑", 14, "bold"))

        # 4. 菜单栏
        main_menu = tk.Menu(self.root)
        self.root.config(menu=main_menu)
        data_menu = tk.Menu(main_menu, tearoff=0)
        main_menu.add_cascade(label="操作", menu=data_menu)
        data_menu.add_command(label="添加新卷轴", command=self.add_new_model_dialog)
        data_menu.add_command(label="批量导入 (TXT)", command=self.import_from_txt)
        data_menu.add_separator()
        data_menu.add_command(label="删除当前卡片", command=self.delete_current_card)
        data_menu.add_command(label="[危险] 重置所有进度", command=self.reset_data)
        data_menu.add_command(label="创建备份", command=self.create_backup)
        data_menu.add_command(label="从备份恢复", command=self.restore_backup)
        data_menu.add_separator()
        data_menu.add_command(label="📋 查看日志", command=self.open_log_viewer)
        data_menu.add_separator()
        data_menu.add_command(label="关于", command=self.show_about)

        # 5. 绑定键盘
        self.root.bind("<space>", lambda e: self.show_answer())
        self.root.bind("1", lambda e: self.rate_card(1) if self.is_showing_answer else None)
        self.root.bind("2", lambda e: self.rate_card(2) if self.is_showing_answer else None)
        self.root.bind("3", lambda e: self.rate_card(3) if self.is_showing_answer else None)

    # -------------------------
    # AI
    # -------------------------
    def setup_ai(self):
        """初始化AI侧边栏"""
        print(f"[DEBUG] AI_AVAILABLE = {AI_AVAILABLE}")

        if AI_AVAILABLE:
            try:
                print("[DEBUG] 开始初始化AI组件...")
                self.ai_config = AIConfig(DATA_DIR)
                print("[DEBUG] AIConfig初始化成功")
                self.ai_manager = AIManager(self.ai_config)

                print("[DEBUG] AIManager初始化成功")
                self.card_tools = CardTools(self)
                print("[DEBUG] CardTools初始化成功")

                self.ai_sidebar = AISidebar(
                    self.content_area,
                    self.ai_manager,
                    self.get_current_card_context,
                    self.card_tools,
                    logger=self.logger,
                )

                print("[OK] AI功能已启用")
            except Exception as e:
                print(f"[ERROR] AI初始化失败: {e}")
                traceback.print_exc()
                self.ai_sidebar = None
                self.show_ai_placeholder()
        else:
            print("[INFO] AI_AVAILABLE=False, 显示占位面板")
            self.ai_sidebar = None
            self.show_ai_placeholder()

    # -------------------------
    # MCP
    # -------------------------
    def setup_mcp(self):
        """启动 MCP 本地服务器（后台线程）"""
        if not MCP_AVAILABLE:
            print("[INFO] MCP_AVAILABLE=False, 跳过MCP服务器")
            return

        try:
            card_tools = getattr(self, "card_tools", None)
            self.mcp_server = MCPServer(
                host="127.0.0.1",
                port=9100,
                logger=self.logger,
                card_tools=card_tools,
            )
            self.mcp_server.start()
            print("[OK] MCP服务器已启动: http://127.0.0.1:9100")
        except Exception as e:
            print(f"[ERROR] MCP服务器启动失败: {e}")
            if self.logger:
                self.logger.error(f"MCP服务器启动失败: {e}")
            self.mcp_server = None

    def stop_mcp(self):
        """停止 MCP 服务器"""
        if self.mcp_server:
            try:
                self.mcp_server.stop()
            except Exception as e:
                if self.logger:
                    self.logger.error(f"MCP服务器停止失败: {e}")

    def show_ai_placeholder(self):
        """显示AI功能占位提示"""
        placeholder = tk.Frame(
            self.content_area, width=350, bg="#f8f9fa", relief="groove", bd=1
        )
        placeholder.pack(side="right", fill="y")
        placeholder.pack_propagate(False)

        # 标题
        tk.Label(
            placeholder,
            text="🤖 AI 助手",
            font=("微软雅黑", 14, "bold"),
            bg="#f8f9fa",
            fg="#333",
        ).pack(pady=30)

        # 提示信息
        info_frame = tk.Frame(placeholder, bg="#fff3cd", relief="solid", bd=1)
        info_frame.pack(fill="x", padx=20, pady=10)

        tk.Label(
            info_frame,
            text="⚠️ AI功能未启用",
            font=("微软雅黑", 10, "bold"),
            bg="#fff3cd",
            fg="#856404",
        ).pack(pady=10)

        tk.Label(
            info_frame,
            text="需要安装依赖库",
            font=("微软雅黑", 9),
            bg="#fff3cd",
            fg="#856404",
        ).pack()

        # 安装命令
        cmd_frame = tk.Frame(placeholder, bg="#e9ecef", relief="solid", bd=1)
        cmd_frame.pack(fill="x", padx=20, pady=20)

        tk.Label(
            cmd_frame,
            text="在终端运行：",
            font=("微软雅黑", 9),
            bg="#e9ecef",
            fg="#666",
        ).pack(pady=(10, 5))

        cmd_text = tk.Text(
            cmd_frame,
            height=2,
            font=("Consolas", 9),
            bg="#2d2d2d",
            fg="#00ff00",
            relief="flat",
            padx=10,
            pady=5,
        )
        cmd_text.pack(fill="x", padx=10, pady=(0, 10))
        cmd_text.insert("1.0", "pip install requests")
        cmd_text.config(state="disabled")

        # 功能预览
        features_frame = tk.LabelFrame(
            placeholder,
            text="功能预览",
            font=("微软雅黑", 9, "bold"),
            bg="#f8f9fa",
            fg="#666",
        )
        features_frame.pack(fill="x", padx=20, pady=20)

        features = [
            "💡 智能提示",
            "📖 解释答案",
            "🔄 生成相关题",
            "💬 自由对话",
            "🎯 学习分析",
        ]

        for feature in features:
            tk.Label(
                features_frame,
                text=feature,
                font=("微软雅黑", 9),
                bg="#f8f9fa",
                fg="#999",
                anchor="w",
            ).pack(fill="x", padx=10, pady=3)

        # 底部说明
        tk.Label(
            placeholder,
            text="安装后重启程序即可使用",
            font=("微软雅黑", 8),
            bg="#f8f9fa",
            fg="#999",
        ).pack(side="bottom", pady=20)

    def get_current_card_context(self):
        """获取当前卡片上下文供AI使用"""
        if self.current_card_index == -1:
            return None
        card = self.cards[self.current_card_index]
        return {"q": card["q"], "a": card["a"], "is_showing_answer": self.is_showing_answer}

    # -------------------------
    # 数据/逻辑
    # -------------------------
    def set_text(self, text_content: str):
        self.content_text.config(state="normal")
        self.content_text.delete(1.0, "end")
        self.content_text.insert("end", text_content, "center")
        self.content_text.config(state="disabled")

    def load_data(self):
        if os.path.exists(DATA_FILE):
            try:
                with open(DATA_FILE, "r", encoding="utf-8") as f:
                    self.cards = json.load(f)
                if self.logger:
                    self.logger.info(f"加载数据成功，共 {len(self.cards)} 张卡片")
            except (json.JSONDecodeError, ValueError) as e:
                self.cards = []
                if self.logger:
                    self.logger.error(f"加载数据失败: {e}")

    def create_backup(self):
        if not os.path.exists(DATA_FILE):
            messagebox.showinfo("", "没有数据文件可备份")
            return
        try:
            shutil.copy(DATA_FILE, BACKUP_FILE)
            self.last_backup_time = time.time()
            messagebox.showinfo("", "备份成功")
            if self.logger:
                self.logger.info("手动创建备份成功")
                self.logger.log_activity("create_backup", {"manual": True})
        except Exception as e:
            messagebox.showerror("备份失败", f"错误详情：{e}")
            if self.logger:
                self.logger.error(f"备份失败: {e}")

    def save_data(self):
        try:
            with open(DATA_FILE, "w", encoding="utf-8") as f:
                json.dump(self.cards, f, ensure_ascii=False, indent=2)

            # 智能备份：只有距离上次备份超过1小时才自动备份
            if self.cards:
                now = time.time()
                if now - self.last_backup_time > 3600:  # 3600秒 = 1小时
                    try:
                        shutil.copy(DATA_FILE, BACKUP_FILE)
                        self.last_backup_time = now
                        if self.logger:
                            self.logger.info("自动备份成功")
                    except Exception as e:
                        if self.logger:
                            self.logger.warning(f"自动备份失败: {e}")
        except Exception as e:
            if self.logger:
                self.logger.error(f"保存数据失败: {e}")
            raise

    def get_due_cards(self):
        now = time.time()
        return [c for c in self.cards if c.get("next_review", 0) <= now]

    def next_card(self):
        # 取消之前的定时检查
        if self.check_timer:
            self.root.after_cancel(self.check_timer)
            self.check_timer = None

        # 切换界面状态：显示 [查看答案] 按钮
        self.is_showing_answer = False
        self.grading_frame.pack_forget()
        self.show_btn_frame.pack(fill="both", expand=True)

        due_cards = self.get_due_cards()
        self.update_status(len(due_cards))

        if not due_cards:
            display_text = "\n\n🎉 今日任务已完成！\n\n"
            self.set_text(display_text)
            self.show_btn_frame.pack_forget()
            self.current_card_index = -1
            self.check_timer = self.root.after(5000, self.next_card)
            return

        # 取第一个到期的卡片
        target_card = due_cards[0]
        self.current_card_index = self.cards.index(target_card)
        display_text = f"\n\n【卷头】\n\n{target_card['q']}\n\n"
        self.set_text(display_text)
        self.show_btn.focus_set()

    def show_answer(self):
        if self.current_card_index == -1 or self.is_showing_answer:
            return
        self.answer_shown_time = time.time()
        card = self.cards[self.current_card_index]
        full_text = (
            f"\n\n【卷头】\n\n{card['q']}\n\n" + "-" * 35 + f"\n\n【卷尾】\n\n{card['a']}\n\n"
        )
        self.set_text(full_text)

        # 切换界面状态：显示 [评分] 按钮
        self.is_showing_answer = True
        self.show_btn_frame.pack_forget()
        self.grading_frame.pack(fill="both", expand=True)

        if self.logger:
            self.logger.log_activity("show_answer", {"card_index": self.current_card_index})

    def rate_card(self, grade: int):
        """SM-2算法实现 - 科学的间隔重复算法"""
        if self.current_card_index == -1:
            return
        if time.time() - getattr(self, "answer_shown_time", 0) < 0.5:
            return

        card = self.cards[self.current_card_index]

        # 初始化SM-2参数（向后兼容旧数据）
        ef = card.get("ef", 2.5)  # easiness factor，默认2.5
        repetitions = card.get("repetitions", 0)  # 连续正确次数

        # 将3级评分映射到SM-2的质量评分（0-5）
        # 1=忘记 → quality 1 (差)
        # 2=模糊 → quality 3 (一般)
        # 3=秒杀 → quality 5 (完美)
        quality_map = {1: 1, 2: 3, 3: 5}
        quality = quality_map[grade]

        # SM-2算法核心逻辑
        if quality >= 3:  # 回答正确（模糊或秒杀）
            if repetitions == 0:
                interval_days = 1
            elif repetitions == 1:
                interval_days = 6
            else:
                # 使用EF计算新间隔
                interval_days = (card.get("interval", 86400) / 86400) * ef

            repetitions += 1
        else:  # 回答错误（忘记）
            repetitions = 0
            interval_days = 1

        # 更新EF值（easiness factor）
        # 公式：EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
        ef = ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
        ef = max(1.3, ef)  # EF最小值为1.3，防止间隔过短

        # 转换为秒并设置下次复习时间
        interval_seconds = interval_days * 86400
        card["next_review"] = time.time() + interval_seconds
        card["interval"] = interval_seconds
        card["ef"] = round(ef, 2)  # 保留2位小数
        card["repetitions"] = repetitions

        if self.logger:
            self.logger.log_activity(
                "rate_card",
                {
                    "grade": grade,
                    "card_index": self.current_card_index,
                    "interval_days": round(interval_days, 2),
                    "ef": round(ef, 2),
                },
            )

        self.save_data()
        self.next_card()

    def add_new_model_dialog(self):
        top = tk.Toplevel(self.root)
        top.title("添加新卷轴")
        top.geometry("400x300")

        tk.Label(top, text="题目:").pack(anchor="w", padx=10)
        q = tk.Text(top, height=4)
        q.pack(fill="x", padx=10)

        tk.Label(top, text="答案:").pack(anchor="w", padx=10)
        a = tk.Text(top, height=4)
        a.pack(fill="x", padx=10)

        def save():
            question = q.get("1.0", "end").strip()
            answer = a.get("1.0", "end").strip()
            if not question or not answer:
                messagebox.showwarning("输入不完整", "题目和答案都不能为空")
                return

            self.cards.append({"q": question, "a": answer, "next_review": 0, "interval": 0})
            self.save_data()
            if self.logger:
                self.logger.info("添加新卡片成功")
                self.logger.log_activity("add_card", {"question_length": len(question)})
            top.destroy()
            self.next_card()

        tk.Button(top, text="保存", command=save, bg="#c8e6c9").pack(pady=10)

    def import_from_txt(self):
        path = filedialog.askopenfilename(filetypes=[("Text", "*.txt")])
        if not path:
            return

        try:
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()

            count = 0
            for block in content.split("\n\n"):
                if "===" in block:
                    parts = block.split("===", 1)
                    if len(parts) >= 2:
                        question = parts[0].strip()
                        answer = parts[1].strip()
                        if question and answer:
                            self.cards.append(
                                {"q": question, "a": answer, "next_review": 0, "interval": 0}
                            )
                            count += 1

            if count == 0:
                messagebox.showwarning("导入失败", "未找到有效卡片，请确认格式为：\n题目===答案")
                return

            self.save_data()
            if self.logger:
                self.logger.info(f"批量导入成功，共 {count} 张卡片")
                self.logger.log_activity("import_cards", {"count": count, "file": path})
            self.next_card()

            # 显示导入结果
            top = tk.Toplevel(self.root)
            top.title(f"导入成功，共 {count} 张")
            top.geometry("400x400")

            scrollbar = tk.Scrollbar(top)
            scrollbar.pack(side="right", fill="y")

            text = tk.Text(
                top,
                font=("微软雅黑", 11),
                wrap="word",
                yscrollcommand=scrollbar.set,
                padx=10,
                pady=10,
            )
            scrollbar.config(command=text.yview)

            for card in self.cards[-count:]:
                text.insert("end", f"【卷头】{card['q']}\n【卷尾】{card['a']}\n\n")

            text.config(state="disabled")
            text.pack(fill="both", expand=True)

        except Exception as e:
            messagebox.showerror("导入失败", f"错误详情：{e}")
            if self.logger:
                self.logger.error(f"导入失败: {e}")

    def delete_current_card(self):
        if self.current_card_index == -1:
            messagebox.showinfo("提示", "当前没有选中的卡片")
            return

        if messagebox.askyesno("确认删除", "确定要删除当前卡片吗？"):
            if self.logger:
                self.logger.warning(f"删除卡片: index={self.current_card_index}")
                self.logger.log_activity("delete_card", {"card_index": self.current_card_index})
            del self.cards[self.current_card_index]
            self.save_data()
            self.current_card_index = -1
            self.next_card()

    def reset_data(self):
        if messagebox.askyesno("危险操作", "确定要清空所有数据吗？\n建议先创建备份！"):
            # 重置前强制备份
            if self.cards and os.path.exists(DATA_FILE):
                try:
                    shutil.copy(DATA_FILE, BACKUP_FILE)
                    self.last_backup_time = time.time()
                except Exception:
                    pass

            if self.logger:
                self.logger.warning("重置所有数据")
                self.logger.log_activity("reset_data", {"card_count": len(self.cards)})

            self.cards = []
            self.save_data()
            self.next_card()
            messagebox.showinfo("完成", "所有数据已清空")

    def show_about(self):
        messagebox.showinfo(
            "关于 Papyrus",
            "Papyrus v1.2.2\n一款极简的卷轴式学习工具\n\n新功能：\n• SM-2 科学记忆算法\n• AI 智能助手（全新界面）\n• 多模型支持\n\n最新更新：\n• 修复 API Key 编码错误\n• 配置验证机制（阻止非法字符）\n• 改进错误提示信息\n\n开发者：[ALPACA LI]\n© 2026 Papyrus",
        )

    def update_status(self, count: int):
        self.status_var.set(f"待复习: {count} | 总卡片: {len(self.cards)}")

    def activate_window(self):
        """激活窗口，确保窗口在前台显示"""
        try:
            self.root.lift()  # 提升窗口到顶层
            self.root.focus_force()  # 强制获取焦点
        except Exception:
            pass  # 忽略可能的错误

    def restore_backup(self):
        if not os.path.exists(BACKUP_FILE):
            messagebox.showinfo("", "没有找到备份文件")
            return
        if messagebox.askyesno("", "确认从备份恢复？当前数据将被覆盖。"):
            shutil.copy(BACKUP_FILE, DATA_FILE)
            if self.logger:
                self.logger.info("从备份恢复数据")
                self.logger.log_activity("restore_backup", {})
            self.load_data()
            self.next_card()
            messagebox.showinfo("", "恢复成功")


if __name__ == "__main__":
    try:
        root = tk.Tk()
        app = PapyrusApp(root)
        root.mainloop()

        # 停止MCP服务器
        if hasattr(app, "mcp_server") and app.mcp_server:
            app.stop_mcp()


        # 程序正常退出时记录日志
        if hasattr(app, "logger") and app.logger:
            app.logger.info("Papyrus 正常退出")
            app.logger.log_activity("app_exit", {"normal": True})

    except Exception as e:
        error_msg = traceback.format_exc()
        print("控制台报错信息：\n", error_msg)

        # 记录崩溃日志
        if LOG_AVAILABLE:
            try:
                crash_logger = PapyrusLogger(LOG_DIR)
                crash_logger.error(f"程序崩溃: {error_msg}")
                crash_logger.log_activity("app_crash", {"error": str(e)})
            except Exception:
                pass

        try:
            temp_root = tk.Tk()
            temp_root.withdraw()
            messagebox.showerror("程序崩溃 Crash", f"错误详情：\n{error_msg}")
        except Exception:
            print("严重错误：无法创建弹窗！")
