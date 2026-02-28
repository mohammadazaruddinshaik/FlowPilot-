from dotenv import load_dotenv
import os

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.database import engine
from app.models import db_models

from app.api.dataset_routes import router as dataset_router
from app.api.campaign_template_routes import router as template_router
from app.api.execution_routes import router as execution_router
from app.api.auth_routes import router as auth_router
from app.api.analytics_routes import router as analytics_router
from app.api.integration_routes import router as integration_router
from app.api import dashboard_routes
from app.api.ws_routes import router as ws_router


# =====================================================
# App Initialization
# =====================================================

app = FastAPI(
    title="AudienceOS SaaS",
    version="1.0.0"
)


# =====================================================
# CORS (TEMPORARY OPEN FOR DEPLOYMENT)
# =====================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ⚠️ Restrict later in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =====================================================
# Health Check (IMPORTANT for Render)
# =====================================================

@app.get("/")
def health_check():
    return {"status": "ok", "service": "AudienceOS Backend"}


@app.get("/health")
def health():
    return {"status": "healthy"}


# =====================================================
# Database Init (Run Once at Startup)
# =====================================================

@app.on_event("startup")
def startup():
    db_models.Base.metadata.create_all(bind=engine)


# =====================================================
# Register Routers
# =====================================================

app.include_router(auth_router)
app.include_router(dataset_router)
app.include_router(template_router)
app.include_router(execution_router)
app.include_router(analytics_router)
app.include_router(integration_router)
app.include_router(dashboard_routes.router)
app.include_router(ws_router)