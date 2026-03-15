from __future__ import annotations

import tkinter as tk


def create_ai_placeholder(parent: tk.Widget) -> tk.Frame:
    """Create the right-side placeholder panel shown when AI is unavailable."""

    placeholder = tk.Frame(parent, width=350, bg="#f8f9fa", relief="groove", bd=1)
    placeholder.pack(side="right", fill="y")
    placeholder.pack_propagate(False)

    tk.Label(
        placeholder,
        text="🤖 AI 助手",
        font=("微软雅黑", 14, "bold"),
        bg="#f8f9fa",
        fg="#333",
    ).pack(pady=30)

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

    tk.Label(
        placeholder,
        text="安装后重启程序即可使用",
        font=("微软雅黑", 8),
        bg="#f8f9fa",
        fg="#999",
    ).pack(side="bottom", pady=20)

    return placeholder
