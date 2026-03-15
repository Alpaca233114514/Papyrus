from __future__ import annotations

import tkinter as tk


def setup_main_ui(app) -> None:
    """Build the main UI (left study panel + right AI panel placeholder).

    This function mutates the passed `app` instance by attaching widget
    references to it (same as the original monolithic implementation).
    """

    # Main area: left study panel + right AI sidebar (created elsewhere)
    app.content_area = tk.Frame(app.root)
    app.content_area.pack(side="top", fill="both", expand=True)

    app.main_panel = tk.Frame(app.content_area, width=400)
    app.main_panel.pack(side="left", fill="y")
    app.main_panel.pack_propagate(False)

    # 1) Status bar
    app.status_var = tk.StringVar()
    tk.Label(app.main_panel, textvariable=app.status_var, fg="gray").pack(
        side="top", pady=5
    )

    # 2) Bottom buttons container
    app.btn_frame = tk.Frame(app.main_panel, height=50)
    app.btn_frame.pack(side="bottom", fill="x", pady=4, padx=16)
    app.btn_frame.pack_propagate(False)

    # State A: show answer button
    app.show_btn_frame = tk.Frame(app.btn_frame)
    app.show_btn = tk.Button(
        app.show_btn_frame,
        text="显示卷尾 (Space)",
        command=app.show_answer,
        font=("微软雅黑", 12),
        bg="#e1f5fe",
    )
    app.show_btn.pack(fill="both", expand=True, ipady=5)

    # State B: grading buttons
    app.grading_frame = tk.Frame(app.btn_frame)
    btn_config = [
        ("忘记 (1)", "#ffcdd2", 1),
        ("模糊 (2)", "#fff9c4", 2),
        ("秒杀 (3)", "#c8e6c9", 3),
    ]
    for text, color, score in btn_config:
        tk.Button(
            app.grading_frame,
            text=text,
            bg=color,
            command=lambda s=score: app.rate_card(s),
            font=("微软雅黑", 10),
        ).pack(side="left", fill="both", expand=True, padx=5)

    # 3) Card display area
    app.card_frame = tk.Frame(app.main_panel, relief="groove", bd=2)
    app.card_frame.pack(side="top", fill="both", expand=True, padx=10, pady=5)

    scrollbar = tk.Scrollbar(app.card_frame)
    scrollbar.pack(side="right", fill="y")

    app.content_text = tk.Text(
        app.card_frame,
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
    app.content_text.bind("<Button-1>", lambda e: "break")
    app.content_text.pack(side="left", fill="both", expand=True)
    scrollbar.config(command=app.content_text.yview)

    app.content_text.tag_configure("center", justify="center")
    app.content_text.tag_configure("bold", font=("微软雅黑", 14, "bold"))

    # 4) Menu
    main_menu = tk.Menu(app.root)
    app.root.config(menu=main_menu)
    data_menu = tk.Menu(main_menu, tearoff=0)
    main_menu.add_cascade(label="操作", menu=data_menu)
    data_menu.add_command(label="添加新卷轴", command=app.add_new_model_dialog)
    data_menu.add_command(label="批量导入 (TXT)", command=app.import_from_txt)
    data_menu.add_separator()
    data_menu.add_command(label="删除当前卡片", command=app.delete_current_card)
    data_menu.add_command(label="[危险] 重置所有进度", command=app.reset_data)
    data_menu.add_command(label="创建备份", command=app.create_backup)
    data_menu.add_command(label="从备份恢复", command=app.restore_backup)
    data_menu.add_separator()
    data_menu.add_command(label="📋 查看日志", command=app.open_log_viewer)
    data_menu.add_separator()
    data_menu.add_command(label="关于", command=app.show_about)

    # 5) Key bindings
    app.root.bind("<space>", lambda e: app.show_answer())
    app.root.bind("1", lambda e: app.rate_card(1) if app.is_showing_answer else None)
    app.root.bind("2", lambda e: app.rate_card(2) if app.is_showing_answer else None)
    app.root.bind("3", lambda e: app.rate_card(3) if app.is_showing_answer else None)
