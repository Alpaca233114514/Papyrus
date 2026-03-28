"""更新检查 API 路由。"""

from __future__ import annotations

import json
import re
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(tags=["update"])

# 当前版本号 - 与 package.json 保持一致
CURRENT_VERSION = "v2.0.0beta1"

# GitHub 仓库信息
GITHUB_OWNER = "Alpaca233114514"
GITHUB_REPO = "Papyrus"
GITHUB_API_URL = f"https://api.github.com/repos/{GITHUB_OWNER}/{GITHUB_REPO}/releases/latest"
GITHUB_RELEASES_URL = f"https://github.com/{GITHUB_OWNER}/{GITHUB_REPO}/releases"


class VersionInfo(BaseModel):
    """版本信息模型。"""
    current_version: str
    latest_version: str
    has_update: bool
    release_url: str
    download_url: str | None = None
    release_notes: str | None = None
    published_at: str | None = None


class UpdateCheckResponse(BaseModel):
    """更新检查响应模型。"""
    success: bool
    data: VersionInfo | None = None
    message: str = ""


def _parse_version(version: str) -> tuple[int, ...]:
    """解析版本号，支持 v1.2.3、v2.0.0beta1 等格式。
    
    Args:
        version: 版本字符串
        
    Returns:
        版本号元组，用于比较
    """
    # 移除前缀 'v' 或 'V'
    version = version.lower().lstrip('v')
    
    # 提取数字部分
    # 支持格式: 1.2.3, 2.0.0beta1, 1.0.0-alpha, 2.0.0.beta.1
    parts = re.split(r'[.-]', version)
    
    result = []
    for part in parts:
        # 尝试提取数字
        match = re.match(r'(\d+)', part)
        if match:
            result.append(int(match.group(1)))
        else:
            # 非数字部分（如 beta, alpha, rc）
            # 使用负值表示预发布版本，确保正式版 > 预发布版
            if part.startswith('beta'):
                result.append(-2)
                match = re.search(r'\d+', part)
                if match:
                    result.append(int(match.group()))
            elif part.startswith('alpha'):
                result.append(-3)
                match = re.search(r'\d+', part)
                if match:
                    result.append(int(match.group()))
            elif part.startswith('rc'):
                result.append(-1)
                match = re.search(r'\d+', part)
                if match:
                    result.append(int(match.group()))
    
    # 确保至少有三个数字用于比较
    while len(result) < 3:
        result.append(0)
    
    return tuple(result)


def _compare_versions(local: str, remote: str) -> bool:
    """比较两个版本号。
    
    Args:
        local: 本地版本
        remote: 远程版本
        
    Returns:
        远程版本是否比本地版本新
    """
    local_parsed = _parse_version(local)
    remote_parsed = _parse_version(remote)
    return remote_parsed > local_parsed


def _get_download_url(assets: list[dict[str, Any]], version: str) -> str | None:
    """从 release assets 中获取合适的下载链接。
    
    Args:
        assets: GitHub release assets 列表
        version: 版本号
        
    Returns:
        下载链接或 None
    """
    if not assets:
        return None
    
    # 优先返回第一个 asset 的浏览器下载链接
    for asset in assets:
        if asset.get("browser_download_url"):
            return asset["browser_download_url"]
    
    return None


@router.get("/update/check", response_model=UpdateCheckResponse)
def check_update() -> UpdateCheckResponse:
    """检查是否有新版本可用。
    
    通过调用 GitHub Releases API 获取最新版本信息，
    并与当前版本进行比较。
    
    Returns:
        更新检查结果
    """
    try:
        # 尝试导入 requests
        try:
            import requests
        except ImportError:
            return UpdateCheckResponse(
                success=False,
                message="无法检查更新：缺少 requests 库",
                data=VersionInfo(
                    current_version=CURRENT_VERSION,
                    latest_version=CURRENT_VERSION,
                    has_update=False,
                    release_url=GITHUB_RELEASES_URL,
                )
            )
        
        # 调用 GitHub API 获取最新 release
        headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": f"Papyrus/{CURRENT_VERSION}",
        }
        
        response = requests.get(GITHUB_API_URL, headers=headers, timeout=10)
        response.raise_for_status()
        
        release_data = response.json()
        latest_version = release_data.get("tag_name", "")
        
        if not latest_version:
            return UpdateCheckResponse(
                success=False,
                message="无法获取最新版本信息",
                data=VersionInfo(
                    current_version=CURRENT_VERSION,
                    latest_version=CURRENT_VERSION,
                    has_update=False,
                    release_url=GITHUB_RELEASES_URL,
                )
            )
        
        # 比较版本号
        has_update = _compare_versions(CURRENT_VERSION, latest_version)
        
        # 获取下载链接
        assets = release_data.get("assets", [])
        download_url = _get_download_url(assets, latest_version)
        
        # 如果没有找到 asset，使用发布页面链接
        if not download_url:
            download_url = release_data.get("html_url", GITHUB_RELEASES_URL)
        
        return UpdateCheckResponse(
            success=True,
            message="检查成功",
            data=VersionInfo(
                current_version=CURRENT_VERSION,
                latest_version=latest_version,
                has_update=has_update,
                release_url=release_data.get("html_url", GITHUB_RELEASES_URL),
                download_url=download_url,
                release_notes=release_data.get("body", ""),
                published_at=release_data.get("published_at", ""),
            )
        )
        
    except requests.exceptions.RequestException as e:
        return UpdateCheckResponse(
            success=False,
            message=f"网络错误：{str(e)}",
            data=VersionInfo(
                current_version=CURRENT_VERSION,
                latest_version=CURRENT_VERSION,
                has_update=False,
                release_url=GITHUB_RELEASES_URL,
            )
        )
    except Exception as e:
        return UpdateCheckResponse(
            success=False,
            message=f"检查更新失败：{str(e)}",
            data=VersionInfo(
                current_version=CURRENT_VERSION,
                latest_version=CURRENT_VERSION,
                has_update=False,
                release_url=GITHUB_RELEASES_URL,
            )
        )


@router.get("/update/version", response_model=dict[str, str])
def get_current_version() -> dict[str, str]:
    """获取当前版本号。
    
    Returns:
        当前版本信息
    """
    return {
        "version": CURRENT_VERSION,
        "repository": f"https://github.com/{GITHUB_OWNER}/{GITHUB_REPO}",
    }
