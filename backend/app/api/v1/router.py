from fastapi import APIRouter

from app.api.v1.routes import health, pull_request, repository

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(repository.router)
api_router.include_router(pull_request.router)
