import sys
import os

# 切换工作目录到项目根目录
project_root = os.path.dirname(os.path.abspath(__file__))
os.chdir(project_root)

# 添加 src 目录到 Python 路径
src_dir = os.path.join(project_root, 'src')
if src_dir not in sys.path:
    sys.path.insert(0, src_dir)

# 直接导入并运行主程序
if __name__ == "__main__":
    from papyrus.app import run_app
    run_app()
