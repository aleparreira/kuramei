"""SQLAlchemy models for Kuramei architecture models domain."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.sqlite import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base


class Model(Base):
    """Architecture Model SQLAlchemy model."""

    __tablename__ = "models"
    __table_args__ = (Index("ix_models_project_id", "project_id"),)

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    project_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(50), default="draft", server_default="draft"
    )
    version: Mapped[str | None] = mapped_column(String(50), nullable=True)
    viewport: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )  # JSON {x, y, zoom}
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        server_default=func.now(),
    )


class Node(Base):
    """Node (element) SQLAlchemy model."""

    __tablename__ = "nodes"
    __table_args__ = (
        Index("ix_nodes_model_id", "model_id"),
        Index("ix_nodes_parent_node_id", "parent_node_id"),
        Index("ix_nodes_level", "level"),
    )

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    model_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("models.id", ondelete="CASCADE"),
        nullable=False,
    )
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    tags: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON array
    properties: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON
    level: Mapped[str | None] = mapped_column(String(10), nullable=True)
    parent_node_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("nodes.id", ondelete="SET NULL"),
        nullable=True,
    )
    position: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON {x, y}
    size: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON {w, h}
    cost: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        server_default=func.now(),
    )


class Edge(Base):
    """Edge (relation/flow) SQLAlchemy model."""

    __tablename__ = "edges"
    __table_args__ = (
        Index("ix_edges_model_id", "model_id"),
        Index("ix_edges_source_node_id", "source_node_id"),
        Index("ix_edges_target_node_id", "target_node_id"),
    )

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    model_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("models.id", ondelete="CASCADE"),
        nullable=False,
    )
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    source_node_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("nodes.id", ondelete="CASCADE"),
        nullable=False,
    )
    target_node_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("nodes.id", ondelete="CASCADE"),
        nullable=False,
    )
    label: Mapped[str | None] = mapped_column(Text, nullable=True)
    properties: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        server_default=func.now(),
    )


class Conversation(Base):
    """Conversation SQLAlchemy model for chat sessions."""

    __tablename__ = "conversations"
    __table_args__ = (Index("ix_conversations_model_id", "model_id"),)

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    model_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("models.id", ondelete="CASCADE"),
        nullable=False,
    )
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        server_default=func.now(),
    )

    # Relationships
    messages: Mapped[list["Message"]] = relationship(
        "Message", back_populates="conversation", cascade="all, delete-orphan"
    )


class Message(Base):
    """Message SQLAlchemy model for chat messages."""

    __tablename__ = "messages"
    __table_args__ = (Index("ix_messages_conversation_id", "conversation_id"),)

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    conversation_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
    )
    role: Mapped[str] = mapped_column(String(50), nullable=False)  # "user" | "assistant"
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        server_default=func.now(),
    )

    # Relationships
    conversation: Mapped["Conversation"] = relationship(
        "Conversation", back_populates="messages"
    )
    changesets: Mapped[list["ChangeSet"]] = relationship(
        "ChangeSet", back_populates="message"
    )


class ChangeSet(Base):
    """ChangeSet SQLAlchemy model for tracking graph modifications."""

    __tablename__ = "changesets"
    __table_args__ = (
        Index("ix_changesets_model_id", "model_id"),
        Index("ix_changesets_message_id", "message_id"),
    )

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    model_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("models.id", ondelete="CASCADE"),
        nullable=False,
    )
    message_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("messages.id", ondelete="SET NULL"),
        nullable=True,
    )
    source: Mapped[str] = mapped_column(String(50), nullable=False)  # "chat" | "manual"
    summary: Mapped[str | None] = mapped_column(String(500), nullable=True)
    operations: Mapped[list] = mapped_column(JSON, nullable=False)  # JSON array of ops
    status: Mapped[str] = mapped_column(
        String(50), default="applied", server_default="applied"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        server_default=func.now(),
    )

    # Relationships
    message: Mapped["Message | None"] = relationship(
        "Message", back_populates="changesets"
    )
