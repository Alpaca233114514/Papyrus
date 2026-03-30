"""Provider management API routes.

This module provides CRUD operations for AI providers, API keys, and models.
All API keys are encrypted at rest.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from papyrus.data.database import (
    DATABASE_FILE,
    delete_api_key,
    delete_model,
    delete_provider,
    load_all_providers,
    save_api_key,
    save_model,
    save_provider,
    set_default_provider,
    update_provider_enabled,
)
from papyrus.data.crypto import decrypt_api_key, encrypt_api_key

router = APIRouter(tags=["providers"])


# ============================================================================
# Pydantic Models
# ============================================================================

class ApiKeyItem(BaseModel):
    id: str = ""
    name: str = "default"
    key: str = ""  # Plain text key, will be encrypted before storage


class ProviderModel(BaseModel):
    id: str = ""
    name: str = ""
    modelId: str = ""
    port: str = "openai"
    capabilities: list[str] = []
    apiKeyId: str | None = None
    enabled: bool = True


class Provider(BaseModel):
    id: str = ""
    type: str = "custom"
    name: str = ""
    baseUrl: str = ""
    enabled: bool = False
    isDefault: bool = False
    apiKeys: list[ApiKeyItem] = []
    models: list[ProviderModel] = []


class ProviderListResponse(BaseModel):
    success: bool
    providers: list[Provider]


class ProviderResponse(BaseModel):
    success: bool
    provider: Provider | None = None
    message: str = ""


class ProviderUpdateRequest(BaseModel):
    name: str | None = None
    baseUrl: str | None = None
    enabled: bool | None = None
    apiKeys: list[ApiKeyItem] | None = None


class ModelUpdateRequest(BaseModel):
    name: str
    modelId: str
    port: str = "openai"
    capabilities: list[str] = []
    apiKeyId: str | None = None
    enabled: bool = True


# ============================================================================
# Provider CRUD Endpoints
# ============================================================================

@router.get("/providers", response_model=ProviderListResponse)
def get_providers() -> ProviderListResponse:
    """Get all providers with their API keys and models."""
    try:
        providers_data = load_all_providers(DATABASE_FILE)
        
        providers = []
        for p in providers_data:
            providers.append(Provider(
                id=p["id"],
                type=p["type"],
                name=p["name"],
                baseUrl=p["baseUrl"],
                enabled=p["enabled"],
                isDefault=p["isDefault"],
                apiKeys=[ApiKeyItem(**k) for k in p["apiKeys"]],
                models=[ProviderModel(**m) for m in p["models"]],
            ))
        
        return ProviderListResponse(success=True, providers=providers)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load providers: {e}")


@router.post("/providers", response_model=ProviderResponse)
def create_provider(provider: Provider) -> ProviderResponse:
    """Create a new provider with API keys and models."""
    try:
        # Save provider
        provider_id = save_provider(DATABASE_FILE, {
            "id": provider.id or None,
            "type": provider.type,
            "name": provider.name,
            "baseUrl": provider.baseUrl,
            "enabled": provider.enabled,
            "isDefault": provider.isDefault,
        })
        
        # Save API keys
        for key in provider.apiKeys:
            save_api_key(DATABASE_FILE, provider_id, {
                "id": key.id or None,
                "name": key.name,
                "key": key.key,
            })
        
        # Save models
        for model in provider.models:
            save_model(DATABASE_FILE, provider_id, {
                "id": model.id or None,
                "name": model.name,
                "modelId": model.modelId,
                "port": model.port,
                "capabilities": model.capabilities,
                "apiKeyId": model.apiKeyId,
                "enabled": model.enabled,
            })
        
        # Return updated provider
        providers = load_all_providers(DATABASE_FILE)
        new_provider = next((p for p in providers if p["id"] == provider_id), None)
        
        if new_provider:
            return ProviderResponse(
                success=True,
                provider=Provider(**new_provider),
                message="Provider created successfully"
            )
        else:
            return ProviderResponse(success=False, message="Provider created but not found")
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create provider: {e}")


@router.put("/providers/{provider_id}", response_model=ProviderResponse)
def update_provider(provider_id: str, updates: ProviderUpdateRequest) -> ProviderResponse:
    """Update a provider's basic info and API keys."""
    try:
        # Update provider basic info
        provider_data = {
            "id": provider_id,
        }
        if updates.name is not None:
            provider_data["name"] = updates.name
        if updates.baseUrl is not None:
            provider_data["baseUrl"] = updates.baseUrl
        if updates.enabled is not None:
            provider_data["enabled"] = updates.enabled
        
        save_provider(DATABASE_FILE, provider_data)
        
        # Update API keys if provided
        if updates.apiKeys is not None:
            # Get existing keys
            providers = load_all_providers(DATABASE_FILE)
            existing_provider = next((p for p in providers if p["id"] == provider_id), None)
            existing_key_ids = {k["id"] for k in (existing_provider.get("apiKeys", []) if existing_provider else [])}
            new_key_ids = {k.id for k in updates.apiKeys if k.id}
            
            # Delete keys that are no longer present
            for key_id in existing_key_ids - new_key_ids:
                delete_api_key(DATABASE_FILE, key_id)
            
            # Save/update keys
            for key in updates.apiKeys:
                save_api_key(DATABASE_FILE, provider_id, {
                    "id": key.id or None,
                    "name": key.name,
                    "key": key.key,
                })
        
        # Return updated provider
        providers = load_all_providers(DATABASE_FILE)
        updated = next((p for p in providers if p["id"] == provider_id), None)
        
        if updated:
            return ProviderResponse(
                success=True,
                provider=Provider(**updated),
                message="Provider updated successfully"
            )
        else:
            return ProviderResponse(success=False, message="Provider not found")
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update provider: {e}")


@router.delete("/providers/{provider_id}")
def delete_provider_endpoint(provider_id: str) -> dict[str, Any]:
    """Delete a provider and all its data."""
    try:
        success = delete_provider(DATABASE_FILE, provider_id)
        if success:
            return {"success": True, "message": "Provider deleted successfully"}
        else:
            return {"success": False, "message": "Provider not found"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete provider: {e}")


@router.post("/providers/{provider_id}/default")
def set_provider_default(provider_id: str) -> dict[str, Any]:
    """Set a provider as the default."""
    try:
        success = set_default_provider(DATABASE_FILE, provider_id)
        if success:
            return {"success": True, "message": "Default provider set successfully"}
        else:
            return {"success": False, "message": "Provider not found"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to set default provider: {e}")


@router.post("/providers/{provider_id}/enabled")
def set_provider_enabled(provider_id: str, enabled: dict[str, bool]) -> dict[str, Any]:
    """Enable or disable a provider."""
    try:
        success = update_provider_enabled(DATABASE_FILE, provider_id, enabled.get("enabled", False))
        if success:
            return {"success": True, "message": "Provider status updated"}
        else:
            return {"success": False, "message": "Provider not found"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update provider status: {e}")


# ============================================================================
# Model Management Endpoints
# ============================================================================

@router.post("/providers/{provider_id}/models", response_model=ProviderResponse)
def add_model(provider_id: str, model: ModelUpdateRequest) -> ProviderResponse:
    """Add a model to a provider."""
    try:
        save_model(DATABASE_FILE, provider_id, {
            "name": model.name,
            "modelId": model.modelId,
            "port": model.port,
            "capabilities": model.capabilities,
            "apiKeyId": model.apiKeyId,
            "enabled": model.enabled,
        })
        
        # Return updated provider
        providers = load_all_providers(DATABASE_FILE)
        updated = next((p for p in providers if p["id"] == provider_id), None)
        
        if updated:
            return ProviderResponse(
                success=True,
                provider=Provider(**updated),
                message="Model added successfully"
            )
        else:
            return ProviderResponse(success=False, message="Provider not found")
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add model: {e}")


@router.put("/providers/{provider_id}/models/{model_id}", response_model=ProviderResponse)
def update_model(provider_id: str, model_id: str, model: ModelUpdateRequest) -> ProviderResponse:
    """Update a provider model."""
    try:
        save_model(DATABASE_FILE, provider_id, {
            "id": model_id,
            "name": model.name,
            "modelId": model.modelId,
            "port": model.port,
            "capabilities": model.capabilities,
            "apiKeyId": model.apiKeyId,
            "enabled": model.enabled,
        })
        
        # Return updated provider
        providers = load_all_providers(DATABASE_FILE)
        updated = next((p for p in providers if p["id"] == provider_id), None)
        
        if updated:
            return ProviderResponse(
                success=True,
                provider=Provider(**updated),
                message="Model updated successfully"
            )
        else:
            return ProviderResponse(success=False, message="Provider not found")
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update model: {e}")


@router.delete("/providers/{provider_id}/models/{model_id}")
def delete_model_endpoint(provider_id: str, model_id: str) -> dict[str, Any]:
    """Delete a model from a provider."""
    try:
        success = delete_model(DATABASE_FILE, model_id)
        if success:
            return {"success": True, "message": "Model deleted successfully"}
        else:
            return {"success": False, "message": "Model not found"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete model: {e}")


# ============================================================================
# API Key Management Endpoints (Individual)
# ============================================================================

@router.post("/providers/{provider_id}/apikeys")
def add_api_key(provider_id: str, key: ApiKeyItem) -> dict[str, Any]:
    """Add an API key to a provider."""
    try:
        key_id = save_api_key(DATABASE_FILE, provider_id, {
            "name": key.name,
            "key": key.key,
        })
        return {"success": True, "keyId": key_id, "message": "API key added"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add API key: {e}")


@router.delete("/providers/{provider_id}/apikeys/{key_id}")
def delete_api_key_endpoint(provider_id: str, key_id: str) -> dict[str, Any]:
    """Delete an API key."""
    try:
        success = delete_api_key(DATABASE_FILE, key_id)
        if success:
            return {"success": True, "message": "API key deleted"}
        else:
            return {"success": False, "message": "API key not found"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete API key: {e}")


# ============================================================================
# Utility Endpoints
# ============================================================================

@router.post("/providers/test-decrypt")
def test_decrypt(encrypted_key: dict[str, str]) -> dict[str, str]:
    """Test decrypt an API key (for debugging)."""
    try:
        decrypted = decrypt_api_key(encrypted_key.get("key", ""))
        return {"success": True, "decrypted": decrypted}
    except Exception as e:
        return {"success": False, "error": str(e)}
