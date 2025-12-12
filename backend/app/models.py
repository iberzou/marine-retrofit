from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Text, DECIMAL, Date, DateTime, Enum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    role = Column(Enum('admin', 'project_manager', 'engineer', 'technician'), default='technician')
    phone = Column(String(20))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    projects = relationship("Project", back_populates="creator")
    tasks = relationship("Task", back_populates="assignee")
    blueprints = relationship("Blueprint", back_populates="uploader")
    settings = relationship("UserSettings", back_populates="user", uselist=False)
    reports = relationship("GeneratedReport", back_populates="generator")
    project_assignments = relationship("ProjectAssignment", back_populates="user")

class ProjectAssignment(Base):
    __tablename__ = "project_assignments"

    assignment_id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey('projects.project_id', ondelete='CASCADE'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False)
    assigned_at = Column(DateTime, server_default=func.now())

    # Relationships
    project = relationship("Project", back_populates="assignments")
    user = relationship("User", back_populates="project_assignments")

class Project(Base):
    __tablename__ = "projects"

    project_id = Column(Integer, primary_key=True, index=True)
    project_name = Column(String(100), nullable=False)
    vessel_name = Column(String(100))
    vessel_type = Column(String(50))
    vessel_owner = Column(String(100))  # Renamed from owner_name
    start_date = Column(Date)
    end_date = Column(Date)
    status = Column(Enum('planning', 'in_progress', 'on_hold', 'completed', 'cancelled'), default='planning')
    budget = Column(DECIMAL(15, 2))
    spending = Column(DECIMAL(15, 2))  # No default - allows null to indicate "not tracked"
    description = Column(Text)
    created_by = Column(Integer, ForeignKey('users.user_id'))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    creator = relationship("User", back_populates="projects")
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")
    blueprints = relationship("Blueprint", back_populates="project", cascade="all, delete-orphan")
    stock_transactions = relationship("StockTransaction", back_populates="project")
    assignments = relationship("ProjectAssignment", back_populates="project", cascade="all, delete-orphan")

class Task(Base):
    __tablename__ = "tasks"

    task_id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey('projects.project_id', ondelete='CASCADE'), nullable=False)
    task_name = Column(String(100), nullable=False)
    description = Column(Text)
    assigned_to = Column(Integer, ForeignKey('users.user_id'))
    priority = Column(Enum('low', 'medium', 'high', 'critical'), default='medium')
    status = Column(Enum('pending', 'in_progress', 'completed', 'blocked'), default='pending')
    is_maintenance = Column(Boolean, default=False)
    start_date = Column(Date)
    due_date = Column(Date)
    completion_date = Column(Date)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    project = relationship("Project", back_populates="tasks")
    assignee = relationship("User", back_populates="tasks")

class Inventory(Base):
    __tablename__ = "inventory"

    item_id = Column(Integer, primary_key=True, index=True)
    item_name = Column(String(100), nullable=False)
    category = Column(String(50))
    description = Column(Text)
    quantity = Column(Integer, default=0)
    unit = Column(String(20))
    unit_price = Column(DECIMAL(10, 2))
    reorder_level = Column(Integer, default=10)
    supplier_name = Column(String(100))
    location = Column(String(100))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    transactions = relationship("StockTransaction", back_populates="item", cascade="all, delete-orphan")

class StockTransaction(Base):
    __tablename__ = "stock_transactions"

    transaction_id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey('inventory.item_id', ondelete='CASCADE'), nullable=False)
    project_id = Column(Integer, ForeignKey('projects.project_id'))
    transaction_type = Column(Enum('in', 'out', 'adjustment'), nullable=False)
    quantity = Column(Integer, nullable=False)
    transaction_date = Column(DateTime, server_default=func.now())
    performed_by = Column(Integer, ForeignKey('users.user_id'))
    notes = Column(Text)

    # Relationships
    item = relationship("Inventory", back_populates="transactions")
    project = relationship("Project", back_populates="stock_transactions")

class Blueprint(Base):
    __tablename__ = "blueprints"

    blueprint_id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey('projects.project_id', ondelete='CASCADE'), nullable=False)
    file_name = Column(String(255), nullable=False)
    original_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer)
    file_type = Column(String(50))
    version = Column(String(20), default='1.0')
    description = Column(Text)
    uploaded_by = Column(Integer, ForeignKey('users.user_id'), nullable=False)
    uploaded_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    is_active = Column(Boolean, default=True)

    # Relationships
    project = relationship("Project", back_populates="blueprints")
    uploader = relationship("User", back_populates="blueprints")

class UserSettings(Base):
    __tablename__ = "user_settings"

    setting_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.user_id', ondelete='CASCADE'), unique=True, nullable=False)
    theme = Column(Enum('light', 'dark', 'auto'), default='light')
    language = Column(String(10), default='en')
    timezone = Column(String(50), default='UTC')
    date_format = Column(String(20), default='YYYY-MM-DD')
    notifications_enabled = Column(Boolean, default=True)
    email_notifications = Column(Boolean, default=True)
    dashboard_layout = Column(JSON)
    items_per_page = Column(Integer, default=10)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="settings")

class ReportTemplate(Base):
    __tablename__ = "report_templates"

    template_id = Column(Integer, primary_key=True, index=True)
    template_name = Column(String(100), nullable=False)
    report_type = Column(Enum('project', 'task', 'inventory', 'financial', 'custom'), nullable=False)
    description = Column(Text)
    template_config = Column(JSON)
    created_by = Column(Integer, ForeignKey('users.user_id'))
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())

class GeneratedReport(Base):
    __tablename__ = "generated_reports"

    report_id = Column(Integer, primary_key=True, index=True)
    report_name = Column(String(200), nullable=False)
    report_type = Column(String(50))
    file_path = Column(String(500))
    parameters = Column(JSON)
    generated_by = Column(Integer, ForeignKey('users.user_id'), nullable=False)
    generated_at = Column(DateTime, server_default=func.now())

    # Relationships
    generator = relationship("User", back_populates="reports")
