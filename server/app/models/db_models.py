from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    JSON,
    Text,
    DateTime,
    ForeignKey,
    Index,
    UniqueConstraint,
    Enum
)
from sqlalchemy.orm import relationship, validates
from datetime import datetime
from app.database import Base
import uuid
from sqlalchemy.dialects.postgresql import UUID

# =====================================================
# ORGANIZATION (Tenant Root)
# =====================================================

class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    users = relationship("User", back_populates="organization", cascade="all, delete")
    datasets = relationship("Dataset", back_populates="organization", cascade="all, delete")
    templates = relationship("CampaignTemplate", back_populates="organization", cascade="all, delete")
    executions = relationship("CampaignExecution", back_populates="organization", cascade="all, delete")
    integrations = relationship("ChannelIntegration", back_populates="organization", cascade="all, delete")


# =====================================================
# USER
# =====================================================

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)

    organization_id = Column(
        Integer,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)

    is_active = Column(Boolean, default=True)
    refresh_token_hash = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    organization = relationship("Organization", back_populates="users")


# =====================================================
# DATASET
# =====================================================

class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True)

    organization_id = Column(
        Integer,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    original_filename = Column(String, nullable=False)
    storage_path = Column(String, nullable=False)

    file_size = Column(Integer)
    checksum = Column(String)

    row_count = Column(Integer)
    schema = Column(JSON)

    uploaded_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True
    )

    created_at = Column(DateTime, default=datetime.utcnow)

    organization = relationship("Organization", back_populates="datasets")


# =====================================================
# CHANNEL INTEGRATION
# =====================================================

class ChannelIntegration(Base):
    __tablename__ = "channel_integrations"

    id = Column(Integer, primary_key=True)

    organization_id = Column(
        Integer,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    channel_type = Column(String, nullable=False, index=True)
    provider_name = Column(String, nullable=False)

    api_key_encrypted = Column(Text)
    sender_identifier = Column(String)

    is_active = Column(Boolean, default=True)
    is_deleted = Column(Boolean, default=False)

    rate_limit_per_minute = Column(Integer, default=100)

    created_at = Column(DateTime, default=datetime.utcnow)

    organization = relationship("Organization", back_populates="integrations")

    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "channel_type",
            "provider_name",
            name="uq_org_channel_provider"
        ),
    )


# =====================================================
# CAMPAIGN TEMPLATE
# =====================================================

class CampaignTemplate(Base):
    __tablename__ = "campaign_templates"

    id = Column(Integer, primary_key=True)

    logical_id = Column(String, index=True)
    version = Column(Integer, nullable=False)

    organization_id = Column(
        Integer,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    dataset_id = Column(
        Integer,
        ForeignKey("datasets.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    name = Column(String, nullable=False)
    description = Column(Text)

    filter_dsl = Column(JSON)
    template = Column(Text, nullable=False)
    variables = Column(JSON)

    status = Column(String, default="draft")

    is_active = Column(Boolean, default=True)
    is_deleted = Column(Boolean, default=False)

    created_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True
    )

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

    organization = relationship("Organization", back_populates="templates")
    dataset = relationship("Dataset")

    __table_args__ = (
        Index("idx_template_logical_org", "logical_id", "organization_id"),
        UniqueConstraint("logical_id", "version", name="uq_template_version"),
    )


# =====================================================
# CAMPAIGN EXECUTION
# =====================================================

class CampaignExecution(Base):
    __tablename__ = "campaign_executions"

    id = Column(Integer, primary_key=True)

    organization_id = Column(
        Integer,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    campaign_template_id = Column(
        Integer,
        ForeignKey("campaign_templates.id", ondelete="CASCADE"),
        nullable=False
    )

    file_path = Column(String, nullable=False)

    channel_type = Column(String, nullable=False)
    recipient_column = Column(String, nullable=False)

    channel_integration_id = Column(
        Integer,
        ForeignKey("channel_integrations.id"),
        nullable=True
    )

    status = Column(
        Enum("queued", "running", "completed", "failed", "cancelled",
             name="execution_status_enum"),
        default="queued",
        nullable=False,
        index=True
    )

    # 🔥 FIXED: Non-nullable + defaults
    total_count = Column(Integer, default=0, nullable=False)
    processed_count = Column(Integer, default=0, nullable=False)
    success_count = Column(Integer, default=0, nullable=False)
    failure_count = Column(Integer, default=0, nullable=False)

    failure_reason = Column(Text)

    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    execution_duration_seconds = Column(Integer)

    triggered_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True
    )

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    organization = relationship("Organization", back_populates="executions")
    logs = relationship("ExecutionLog", back_populates="execution", cascade="all, delete")

    __table_args__ = (
        Index("idx_execution_org_status", "organization_id", "status"),
        Index("idx_execution_created_at", "created_at"),
    )

    @validates("recipient_column")
    def normalize_recipient(self, key, value):
        return value.strip().lower()


# =====================================================
# EXECUTION LOG
# =====================================================

class ExecutionLog(Base):
    __tablename__ = "execution_logs"

    id = Column(Integer, primary_key=True)

    campaign_execution_id = Column(
        Integer,
        ForeignKey("campaign_executions.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    channel_type = Column(String, nullable=False)

    recipient_value = Column(String, index=True, nullable=False)
    rendered_message = Column(Text)

    delivery_status = Column(String, nullable=False, index=True)
    is_failed = Column(Boolean, default=False, nullable=False)

    provider_message_id = Column(String)
    provider_response_code = Column(String)
    provider_response_message = Column(Text)

    retry_count = Column(Integer, default=0, nullable=False)
    is_retried = Column(Boolean, default=False, nullable=False)

    sent_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    execution = relationship("CampaignExecution", back_populates="logs")

    __table_args__ = (
        Index(
            "idx_logs_execution_created",
            "campaign_execution_id",
            "created_at"
        ),
    )




class TempDataset(Base):
    __tablename__ = "temp_datasets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    organization_id = Column(
        Integer,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    original_filename = Column(String, nullable=False)
    storage_path = Column(String, nullable=False)

    schema = Column(JSON)
    row_count = Column(Integer)

    created_at = Column(DateTime, default=datetime.utcnow)