import tkinter as tk
from tkinter import filedialog, messagebox
import json
import os
import time

DATA_FILE = "Papyrusdata.json"

class PapyrusApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Papyrus")
        self.root.iconbitmap("icon.ico")
        self.root.geometry("600x600")
        
        self.cards = []
        self.current_card_index = -1
        self.is_showing_answer = False
        
        self.load_data()
        self.setup_ui()
        self.next_card()

    def setup_ui(self):
        # 1. 顶部状态栏
        self.status_var = tk.StringVar()
        tk.Label(self.root, textvariable=self.status_var, fg="gray").pack(side="top", pady=5)

        # 2. 底部按钮容器 (固定高度80，防止按钮切换时界面跳动)
        self.btn_frame = tk.Frame(self.root, height=80) 
        self.btn_frame.pack(side="bottom", fill="x", pady=10, padx=20)
        self.btn_frame.pack_propagate(False) 

        # 定义两组按钮界面
        # 状态A：显示按钮
        self.show_btn_frame = tk.Frame(self.btn_frame)
        self.show_btn = tk.Button(self.show_btn_frame, text="显示卷尾 (Space)", command=self.show_answer, font=("微软雅黑", 12), bg="#e1f5fe")
        self.show_btn.pack(fill="both", expand=True, ipady=5)

        # 状态B：评分按钮组
        self.grading_frame = tk.Frame(self.btn_frame)
        btn_config = [
            ("忘记 (1)", "#ffcdd2", 1),
            ("模糊 (2)", "#fff9c4", 2),
            ("秒杀 (3)", "#c8e6c9", 3)
        ]
        for text, color, score in btn_config:
            tk.Button(self.grading_frame, text=text, bg=color, 
                      command=lambda s=score: self.rate_card(s), 
                      font=("微软雅黑", 10)).pack(side="left", fill="both", expand=True, padx=5)

        # 3. 中间卡片区 (带滚动条的文本)
        self.card_frame = tk.Frame(self.root, relief="groove", bd=2)
        self.card_frame.pack(side="top", fill="both", expand=True, padx=20, pady=5)

        scrollbar = tk.Scrollbar(self.card_frame)
        scrollbar.pack(side="right", fill="y")

        self.content_text = tk.Text(self.card_frame, font=("微软雅黑", 13), wrap="word", 
                                    bg="#f5f5f5", relief="flat", padx=15, pady=15,
                                    state="disabled", yscrollcommand=scrollbar.set)
        self.content_text.bind("<Button-1>", lambda e: "break")   
        self.content_text.pack(side="left", fill="both", expand=True)
        scrollbar.config(command=self.content_text.yview)
        
        # 配置文字样式
        self.content_text.tag_configure("center", justify='center')
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
        # 搜 重置所有进度，在它下面加
        data_menu.add_separator()
        data_menu.add_command(label="关于", command=self.show_about)

        # 5. 绑定键盘
        self.root.bind("<space>", lambda e: self.show_answer())
        self.root.bind("1", lambda e: self.rate_card(1) if self.is_showing_answer else None)
        self.root.bind("2", lambda e: self.rate_card(2) if self.is_showing_answer else None)
        self.root.bind("3", lambda e: self.rate_card(3) if self.is_showing_answer else None)

    def set_text(self, text_content):
        self.content_text.config(state="normal")  # 解锁
        self.content_text.delete(1.0, "end")      # 清空
        self.content_text.insert("end", text_content, "center") # 写入
        self.content_text.config(state="disabled") # 上锁

    def load_data(self):
     if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                self.cards = json.load(f)
        except (json.JSONDecodeError, ValueError):
            self.cards = []

     if not self.cards: return



    def save_data(self):
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(self.cards, f, ensure_ascii=False, indent=2)

    def get_due_cards(self):
        # 核心修复：只筛选时间到了的卡片
        now = time.time()
        return [c for c in self.cards if c.get("next_review", 0) <= now]

    def next_card(self):
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
          self.root.after(5000, self.next_card)  # 每5秒检查一次
          return


        # 取第一个到期的卡片
        target_card = due_cards[0]
        self.current_card_index = self.cards.index(target_card)
        display_text = f"\n\n【卷头】\n\n{target_card['q']}\n\n"
        self.set_text(display_text)
        self.show_btn.focus_set()

    def show_answer(self):
        if self.current_card_index == -1 or self.is_showing_answer: return
        
        card = self.cards[self.current_card_index]
        full_text = f"\n\n【卷头】\n\n{card['q']}\n\n" + "-"*35 + f"\n\n【卷尾】\n\n{card['a']}\n\n"
        self.set_text(full_text)
        
        # 切换界面状态：显示 [评分] 按钮
        self.is_showing_answer = True
        self.show_btn_frame.pack_forget()
        self.grading_frame.pack(fill="both", expand=True)

    def rate_card(self, grade):
        if self.current_card_index == -1: return
        
        card = self.cards[self.current_card_index]
        now = time.time()
        
        # 极简算法参数 (秒)
        if grade == 1: interval = 30
        elif grade == 2: interval = 600
        else:
          current = card.get("interval", 0)
          if current < 86400: interval = 86400
          else: interval = current * 2

            
        card["next_review"] = now + interval
        card["interval"] = interval 
        
        self.save_data()
        self.next_card() # 自动切题

    # --- 功能模块 ---
    def add_new_model_dialog(self):
        top = tk.Toplevel(self.root); top.title("添加新卷轴"); top.geometry("400x300")
        tk.Label(top, text="题目:").pack(anchor="w", padx=10)
        q = tk.Text(top, height=4); q.pack(fill="x", padx=10)
        tk.Label(top, text="答案:").pack(anchor="w", padx=10)
        a = tk.Text(top, height=4); a.pack(fill="x", padx=10)
        def save():
            self.cards.append({"q":q.get("1.0","end").strip(), "a":a.get("1.0","end").strip(), "next_review":0, "interval":0})
            self.save_data(); top.destroy(); self.next_card()
        tk.Button(top, text="保存", command=save, bg="#c8e6c9").pack(pady=10)

    def import_from_txt(self):
        path = filedialog.askopenfilename(filetypes=[("Text","*.txt")])
        if path:
          try:
            with open(path,"r",encoding="utf-8") as f: c=f.read()
            count = 0
            for b in c.split("\n\n"):
                if "===" in b:
                    p=b.split("===")
                    if len(p)>=2: self.cards.append({"q":p[0].strip(),"a":p[1].strip(),"next_review":0,"interval":0}); count+=1
            self.save_data(); self.next_card()
            top = tk.Toplevel(self.root)
            top.title(f"导入成功，共 {count} 张")
            top.geometry("400x400")
            scrollbar = tk.Scrollbar(top)
            scrollbar.pack(side="right", fill="y")
            text = tk.Text(top, font=("微软雅黑", 11), wrap="word", yscrollcommand=scrollbar.set, padx=10, pady=10)
            scrollbar.config(command=text.yview)
            for card in self.cards[-count:]:
                text.insert("end", f"【卷头】{card['q']}\n【卷尾】{card['a']}\n\n")
            text.config(state="disabled")
            text.pack(fill="both", expand=True)
          except Exception as e:
            messagebox.showerror("", f"导入失败：{e}")


    def delete_current_card(self):
        if self.current_card_index != -1 and messagebox.askyesno("","删除此卡片？"):
            del self.cards[self.current_card_index]; self.save_data(); self.current_card_index=-1; self.next_card()

    def reset_data(self):
        if messagebox.askyesno("","清空所有数据？"): self.cards=[]; self.save_data(); self.next_card()
    def show_about(self):
        messagebox.showinfo("关于 Papyrus", "Papyrus v1.0.0\n一款极简的卷轴式学习工具\n\n开发者：[ALPACA LI]\n© 2026 Papyrus")

    def update_status(self, count):
        self.status_var.set(f"待复习: {count} | 总卡片: {len(self.cards)}")

import traceback

if __name__ == "__main__":
    try:
        root = tk.Tk()
        app = PapyrusApp(root)
        root.mainloop()

    except Exception as e:
        # 捕捉到错误后的处理逻辑
        error_msg = traceback.format_exc()
        print("控制台报错信息：\n", error_msg)
        
        try:
            # 创建一个隐藏的临时窗口来弹窗
            # 避免因为主窗口 root 未建立导致弹窗失败
            temp_root = tk.Tk()
            temp_root.withdraw()
            messagebox.showerror("程序崩溃 Crash", f"错误详情：\n{error_msg}")
        except:
            # 如果连弹窗都弹不出来，就彻底没办法了
            print("严重错误：无法创建弹窗！")

