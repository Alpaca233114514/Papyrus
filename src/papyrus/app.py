from __future__ import annotations

import os
import shutil
import sys
import time
import traceback
import tkinter as tk
from tkinter import filedialog, messagebox

from .paths import (
    DATA_DIR,
    LOG_DIR,
    DATA_FILE,
    BACKUP_FILE,
)
from .resources import resource_path
from .data.storage import (
    load_cards,
    save_cards,
    create_backup as storage_create_backup,
    restore_backup as storage_restore_backup,
)
from .logic.sm2 import apply_sm2
from .ui.main_ui import setup_main_ui
from .ui.ai_placeholder import create_ai_placeholder
from .integrations.logging import LOG_AVAILABLE, PapyrusLogger, LogViewer
from .integrations.ai import (
    AI_AVAILABLE,
    AI_IMPORT_ERROR,
    AIConfig,
    AIManager,
    AISidebar,
    CardTools,
)
from .integrations.mcp import MCP_AVAILABLE, MCPServer


class PapyrusApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Papyrus")

        # icon is optional
        try:
            self.root.iconbitmap(resource_path("icon.ico"))
        except Exception:
            pass

        self.root.geometry("1000x680")
        self.root.minsize(700, 500)

        self.cards = []
        self.current_card_index = -1
        self.is_showing_answer = False
        self.check_timer = None
        self.last_backup_time = 0

        self.logger = None
        self.mcp_server = None

        self.setup_logger()

        self.load_data()
        self.setup_ui()
        self.setup_ai()
        self.setup_mcp()
        self.next_card()

    # -------------------------
    # Logging
    # -------------------------
    def setup_logger(self):
        if not LOG_AVAILABLE:
            self.logger = None
            return

        try:
            self.logger = PapyrusLogger(LOG_DIR)
            self.logger.info("Papyrus 启动成功")
            self.logger.log_activity("app_start", {"version": "1.2.2"})
        except Exception as e:
            print("[ERROR] 日志系统初始化失败:", e)
            self.logger = None

    def open_log_viewer(self):
        if not LOG_AVAILABLE or self.logger is None:
            messagebox.showinfo("日志功能", "日志功能未启用")
            return

        try:
            LogViewer(self.root, self.logger)
            self.logger.log_activity("open_log_viewer", {})
        except Exception as e:
            messagebox.showerror("错误", "无法打开日志查看器：%s" % e)
            if self.logger:
                self.logger.error("打开日志查看器失败: %s" % e)

    # -------------------------
    # UI
    # -------------------------
    def setup_ui(self):
        setup_main_ui(self)

    # -------------------------
    # AI
    # -------------------------
    def setup_ai(self):
        if AI_AVAILABLE:
            try:
                self.ai_config = AIConfig(DATA_DIR)
                self.ai_manager = AIManager(self.ai_config)
                self.card_tools = CardTools(self)

                self.ai_sidebar = AISidebar(
                    self.content_area,
                    self.ai_manager,
                    self.get_current_card_context,
                    self.card_tools,
                    logger=self.logger,
                )
            except Exception as e:
                print("[ERROR] AI初始化失败:", e)
                traceback.print_exc()
                self.ai_sidebar = None
                self.show_ai_placeholder()
        else:
            # optional: print import error to console
            if AI_IMPORT_ERROR:
                print("[INFO] AI不可用:", AI_IMPORT_ERROR)
            self.ai_sidebar = None
            self.show_ai_placeholder()

    def show_ai_placeholder(self):
        create_ai_placeholder(self.content_area)

    def get_current_card_context(self):
        if self.current_card_index == -1:
            return None
        card = self.cards[self.current_card_index]
        return {
            "q": card.get("q"),
            "a": card.get("a"),
            "is_showing_answer": self.is_showing_answer,
        }

    # -------------------------
    # MCP
    # -------------------------
    def setup_mcp(self):
        if not MCP_AVAILABLE:
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
        except Exception as e:
            print("[ERROR] MCP服务器启动失败:", e)
            if self.logger:
                self.logger.error("MCP服务器启动失败: %s" % e)
            self.mcp_server = None

    def stop_mcp(self):
        if self.mcp_server:
            try:
                self.mcp_server.stop()
            except Exception as e:
                if self.logger:
                    self.logger.error("MCP服务器停止失败: %s" % e)

    # -------------------------
    # Data / logic
    # -------------------------
    def set_text(self, text_content):
        self.content_text.config(state="normal")
        self.content_text.delete(1.0, "end")
        self.content_text.insert("end", text_content, "center")
        self.content_text.config(state="disabled")

    def load_data(self):
        # keep behaviour: if file missing do not override an existing list
        if os.path.exists(DATA_FILE):
            self.cards = load_cards(DATA_FILE, logger=self.logger)

    def save_data(self):
        self.last_backup_time = save_cards(
            DATA_FILE,
            self.cards,
            backup_file=BACKUP_FILE,
            last_backup_time=self.last_backup_time,
            logger=self.logger,
        )

    def create_backup(self):
        if not os.path.exists(DATA_FILE):
            messagebox.showinfo("", "没有数据文件可备份")
            return
        try:
            storage_create_backup(DATA_FILE, BACKUP_FILE)
            self.last_backup_time = time.time()
            messagebox.showinfo("", "备份成功")
            if self.logger:
                self.logger.info("手动创建备份成功")
                self.logger.log_activity("create_backup", {"manual": True})
        except Exception as e:
            messagebox.showerror("备份失败", "错误详情：%s" % e)
            if self.logger:
                self.logger.error("备份失败: %s" % e)

    def restore_backup(self):
        if not os.path.exists(BACKUP_FILE):
            messagebox.showinfo("", "没有找到备份文件")
            return
        if messagebox.askyesno("", "确认从备份恢复？当前数据将被覆盖。"):
            storage_restore_backup(BACKUP_FILE, DATA_FILE)
            if self.logger:
                self.logger.info("从备份恢复数据")
                self.logger.log_activity("restore_backup", {})
            self.load_data()
            self.next_card()
            messagebox.showinfo("", "恢复成功")

    def get_due_cards(self):
        now = time.time()
        return [c for c in self.cards if c.get("next_review", 0) <= now]

    def next_card(self):
        if self.check_timer:
            self.root.after_cancel(self.check_timer)
            self.check_timer = None

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

        target_card = due_cards[0]
        self.current_card_index = self.cards.index(target_card)
        display_text = "\n\n【卷头】\n\n%s\n\n" % target_card.get("q", "")
        self.set_text(display_text)
        self.show_btn.focus_set()

    def show_answer(self):
        if self.current_card_index == -1 or self.is_showing_answer:
            return
        self.answer_shown_time = time.time()
        card = self.cards[self.current_card_index]
        full_text = (
            "\n\n【卷头】\n\n%s\n\n" % card.get("q", "")
            + "-" * 35
            + "\n\n【卷尾】\n\n%s\n\n" % card.get("a", "")
        )
        self.set_text(full_text)

        self.is_showing_answer = True
        self.show_btn_frame.pack_forget()
        self.grading_frame.pack(fill="both", expand=True)

        if self.logger:
            self.logger.log_activity("show_answer", {"card_index": self.current_card_index})

    def rate_card(self, grade):
        if self.current_card_index == -1:
            return
        if time.time() - getattr(self, "answer_shown_time", 0) < 0.5:
            return

        card = self.cards[self.current_card_index]

        interval_days, ef = apply_sm2(card, int(grade))

        if self.logger:
            self.logger.log_activity(
                "rate_card",
                {
                    "grade": int(grade),
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
                self.logger.info("批量导入成功，共 %s 张卡片" % count)
                self.logger.log_activity("import_cards", {"count": count, "file": path})
            self.next_card()

            top = tk.Toplevel(self.root)
            top.title("导入成功，共 %s 张" % count)
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
                text.insert("end", "【卷头】%s\n【卷尾】%s\n\n" % (card.get("q"), card.get("a")))

            text.config(state="disabled")
            text.pack(fill="both", expand=True)

        except Exception as e:
            messagebox.showerror("导入失败", "错误详情：%s" % e)
            if self.logger:
                self.logger.error("导入失败: %s" % e)

    def delete_current_card(self):
        if self.current_card_index == -1:
            messagebox.showinfo("提示", "当前没有选中的卡片")
            return

        if messagebox.askyesno("确认删除", "确定要删除当前卡片吗？"):
            if self.logger:
                self.logger.warning("删除卡片: index=%s" % self.current_card_index)
                self.logger.log_activity("delete_card", {"card_index": self.current_card_index})
            del self.cards[self.current_card_index]
            self.save_data()
            self.current_card_index = -1
            self.next_card()

    def reset_data(self):
        if messagebox.askyesno("危险操作", "确定要清空所有数据吗？\n建议先创建备份！"):
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

    def update_status(self, count):
        self.status_var.set("待复习: %s | 总卡片: %s" % (count, len(self.cards)))


def run_app():
    try:
        root = tk.Tk()
        app = PapyrusApp(root)
        root.mainloop()

        if getattr(app, "mcp_server", None):
            app.stop_mcp()

        if getattr(app, "logger", None):
            app.logger.info("Papyrus 正常退出")
            app.logger.log_activity("app_exit", {"normal": True})

    except Exception as e:
        error_msg = traceback.format_exc()
        print("控制台报错信息：\n", error_msg)

        if LOG_AVAILABLE and PapyrusLogger:
            try:
                crash_logger = PapyrusLogger(LOG_DIR)
                crash_logger.error("程序崩溃: %s" % error_msg)
                crash_logger.log_activity("app_crash", {"error": str(e)})
            except Exception:
                pass

        try:
            temp_root = tk.Tk()
            temp_root.withdraw()
            messagebox.showerror("程序崩溃 Crash", "错误详情：\n%s" % error_msg)
        except Exception:
            print("严重错误：无法创建弹窗！")
