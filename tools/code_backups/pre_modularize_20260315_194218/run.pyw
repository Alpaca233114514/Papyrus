import sys
import os

# 切换工作目录到项目根目录
project_root = os.path.dirname(os.path.abspath(__file__))
os.chdir(project_root)

# 添加 src 目录到 Python 路径
src_dir = os.path.join(project_root, 'src')
sys.path.insert(0, src_dir)

# 导入并运行主程序
if __name__ == "__main__":
    import importlib.util
    
    papyrus_path = os.path.join(src_dir, "Papyrus.py")
    spec = importlib.util.spec_from_file_location("__main__", papyrus_path)
    papyrus_main = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(papyrus_main)
