"""笔记关联功能API路由。"""

from __future__ import annotations

from typing import Any, Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from papyrus.data.relations import (
    create_relation,
    delete_relation,
    update_relation,
    get_note_relations,
    get_relation_graph,
    search_notes_for_relation,
    RelationType,
)
from papyrus.paths import DATABASE_FILE

router = APIRouter(tags=["relations"])


class RelatedNoteOut(BaseModel):
    """关联笔记输出模型。"""
    note_id: str
    title: str
    folder: str
    preview: str
    relation_id: str
    relation_type: str
    description: str
    is_outgoing: bool
    created_at: float


class NoteRelationsResponse(BaseModel):
    """笔记关联列表响应。"""
    success: bool
    outgoing: list[RelatedNoteOut]
    incoming: list[RelatedNoteOut]
    total_outgoing: int
    total_incoming: int


class CreateRelationIn(BaseModel):
    """创建关联请求。"""
    target_id: str = Field(..., description="目标笔记ID")
    relation_type: Literal[
        "reference", "related", "child", "parent", "sequence", "parallel"
    ] = Field(default="reference", description="关联类型")
    description: str = Field(default="", description="关联描述")


class CreateRelationResponse(BaseModel):
    """创建关联响应。"""
    success: bool
    relation: dict[str, Any] | None


class UpdateRelationIn(BaseModel):
    """更新关联请求。"""
    relation_type: Literal[
        "reference", "related", "child", "parent", "sequence", "parallel"
    ] | None = None
    description: str | None = None


class UpdateRelationResponse(BaseModel):
    """更新关联响应。"""
    success: bool
    relation: dict[str, Any] | None


class DeleteRelationResponse(BaseModel):
    """删除关联响应。"""
    success: bool


class GraphNode(BaseModel):
    """图谱节点。"""
    id: str
    title: str
    folder: str
    is_center: bool = False


class GraphLink(BaseModel):
    """图谱边。"""
    source: str
    target: str
    type: str


class RelationGraphResponse(BaseModel):
    """关联图谱响应。"""
    success: bool
    nodes: list[GraphNode]
    links: list[GraphLink]


class SearchForRelationItem(BaseModel):
    """可关联笔记搜索结果。"""
    id: str
    title: str
    folder: str
    preview: str


class SearchForRelationResponse(BaseModel):
    """搜索可关联笔记响应。"""
    success: bool
    results: list[SearchForRelationItem]


@router.get("/notes/{note_id}/relations", response_model=NoteRelationsResponse)
def get_note_relations_endpoint(note_id: str) -> NoteRelationsResponse:
    """获取笔记的关联列表(出链和入链)。"""
    outgoing, incoming = get_note_relations(DATABASE_FILE, note_id)

    return NoteRelationsResponse(
        success=True,
        outgoing=[
            RelatedNoteOut(
                note_id=r.note_id,
                title=r.title,
                folder=r.folder,
                preview=r.preview,
                relation_id=r.relation_id,
                relation_type=r.relation_type,
                description=r.description,
                is_outgoing=r.is_outgoing,
                created_at=r.created_at,
            )
            for r in outgoing
        ],
        incoming=[
            RelatedNoteOut(
                note_id=r.note_id,
                title=r.title,
                folder=r.folder,
                preview=r.preview,
                relation_id=r.relation_id,
                relation_type=r.relation_type,
                description=r.description,
                is_outgoing=r.is_outgoing,
                created_at=r.created_at,
            )
            for r in incoming
        ],
        total_outgoing=len(outgoing),
        total_incoming=len(incoming),
    )


@router.post("/notes/{note_id}/relations", response_model=CreateRelationResponse)
def create_relation_endpoint(note_id: str, payload: CreateRelationIn) -> CreateRelationResponse:
    """为笔记创建关联。"""
    relation = create_relation(
        db_path=DATABASE_FILE,
        source_id=note_id,
        target_id=payload.target_id,
        relation_type=RelationType(payload.relation_type),  # type: ignore
        description=payload.description,
    )

    if relation is None:
        raise HTTPException(status_code=400, detail="关联已存在")

    return CreateRelationResponse(
        success=True,
        relation=relation.to_dict(),
    )


@router.patch("/relations/{relation_id}", response_model=UpdateRelationResponse)
def update_relation_endpoint(relation_id: str, payload: UpdateRelationIn) -> UpdateRelationResponse:
    """更新关联。"""
    rel_type = None
    if payload.relation_type:
        rel_type = RelationType(payload.relation_type)  # type: ignore

    relation = update_relation(
        db_path=DATABASE_FILE,
        relation_id=relation_id,
        relation_type=rel_type,
        description=payload.description,
    )

    if relation is None:
        raise HTTPException(status_code=404, detail="关联不存在")

    return UpdateRelationResponse(
        success=True,
        relation=relation.to_dict(),
    )


@router.delete("/relations/{relation_id}", response_model=DeleteRelationResponse)
def delete_relation_endpoint(relation_id: str) -> DeleteRelationResponse:
    """删除关联。"""
    success = delete_relation(DATABASE_FILE, relation_id)

    if not success:
        raise HTTPException(status_code=404, detail="关联不存在")

    return DeleteRelationResponse(success=True)


@router.get("/notes/{note_id}/graph", response_model=RelationGraphResponse)
def get_relation_graph_endpoint(
    note_id: str,
    depth: int = 1,
) -> RelationGraphResponse:
    """获取笔记的关联图谱。

    Args:
        note_id: 中心笔记ID
        depth: 关联深度 (1=直接关联, 2=关联的关联)
    """
    graph_data = get_relation_graph(DATABASE_FILE, note_id, depth=depth)

    return RelationGraphResponse(
        success=True,
        nodes=[GraphNode(**n) for n in graph_data["nodes"]],
        links=[GraphLink(**l) for l in graph_data["links"]],
    )


@router.get("/notes/search-for-relation", response_model=SearchForRelationResponse)
def search_for_relation_endpoint(
    query: str = "",
    exclude_note_id: str | None = None,
    limit: int = 10,
) -> SearchForRelationResponse:
    """搜索可关联的笔记。"""
    results = search_notes_for_relation(
        DATABASE_FILE, query, exclude_note_id, limit
    )

    return SearchForRelationResponse(
        success=True,
        results=[SearchForRelationItem(**r) for r in results],
    )
