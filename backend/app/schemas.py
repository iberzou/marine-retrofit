from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from enum import Enum

# Enums
class UserRole(str, Enum):
    admin = "admin"
    project_manager = "project_manager"
    engineer = "engineer"
    technician = "technician"

class ProjectStatus(str, Enum):
    planning = "planning"
    in_progress = "in_progress"
    on_hold = "on_hold"
    completed = "completed"
    cancelled = "cancelled"

class TaskPriority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"

class TaskStatus(str, Enum):
    pending = "pending"
    in_progress = "in_progress"
    completed = "completed"
    blocked = "blocked"

class TransactionType(str, Enum):
    in_stock = "in"
    out_stock = "out"
    adjustment = "adjustment"

class Theme(str, Enum):
    light = "light"
    dark = "dark"
    auto = "auto"

class ReportType(str, Enum):
    project = "project"
    task = "task"
    inventory = "inventory"
    financial = "financial"
    custom = "custom"

# User Schemas
class UserBase(BaseModel):
    username: str
    email: EmailStr
    full_name: str
    role: UserRole = UserRole.technician
    phone: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None

class User(UserBase):
    user_id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Inventory Schemas
class InventoryBase(BaseModel):
    item_name: str
    category: Optional[str] = None
    description: Optional[str] = None
    quantity: int = 0
    unit: Optional[str] = None
    unit_price: Optional[float] = None
    reorder_level: int = 10
    supplier_name: Optional[str] = None
    location: Optional[str] = None

class InventoryCreate(InventoryBase):
    pass

class InventoryUpdate(BaseModel):
    item_name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    quantity: Optional[int] = None
    unit: Optional[str] = None
    unit_price: Optional[float] = None
    reorder_level: Optional[int] = None
    supplier_name: Optional[str] = None
    location: Optional[str] = None

class InventoryResponse(InventoryBase):
    item_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Blueprint Schemas
class BlueprintBase(BaseModel):
    project_id: int
    description: Optional[str] = None
    version: str = "1.0"

class BlueprintCreate(BlueprintBase):
    pass

class BlueprintUpdate(BaseModel):
    description: Optional[str] = None
    version: Optional[str] = None
    is_active: Optional[bool] = None

class Blueprint(BlueprintBase):
    blueprint_id: int
    file_name: str
    original_name: str
    file_path: str
    file_size: Optional[int]
    file_type: Optional[str]
    uploaded_by: int
    uploader_name: Optional[str] = None  # Add uploader's full name
    uploaded_at: datetime
    updated_at: datetime
    is_active: bool

    class Config:
        from_attributes = True

# User Settings Schemas
class UserSettingsBase(BaseModel):
    theme: Theme = Theme.light
    language: str = "en"
    timezone: str = "UTC"
    date_format: str = "YYYY-MM-DD"
    notifications_enabled: bool = True
    email_notifications: bool = True
    dashboard_layout: Optional[Dict[str, Any]] = None
    items_per_page: int = 10

class UserSettingsCreate(UserSettingsBase):
    user_id: int

class UserSettingsUpdate(BaseModel):
    theme: Optional[Theme] = None
    language: Optional[str] = None
    timezone: Optional[str] = None
    date_format: Optional[str] = None
    notifications_enabled: Optional[bool] = None
    email_notifications: Optional[bool] = None
    dashboard_layout: Optional[Dict[str, Any]] = None
    items_per_page: Optional[int] = None

class UserSettings(UserSettingsBase):
    setting_id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Report Template Schemas
class ReportTemplateBase(BaseModel):
    template_name: str
    report_type: ReportType
    description: Optional[str] = None
    template_config: Optional[Dict[str, Any]] = None
    is_default: bool = False

class ReportTemplateCreate(ReportTemplateBase):
    pass

class ReportTemplate(ReportTemplateBase):
    template_id: int
    created_by: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True

# Report Generation Schemas
class ReportGenerateRequest(BaseModel):
    report_name: str
    report_type: ReportType
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    project_id: Optional[int] = None  # Single project for validation
    project_ids: Optional[List[int]] = None
    custom_filters: Optional[Dict[str, Any]] = None

class GeneratedReport(BaseModel):
    report_id: int
    report_name: str
    report_type: str
    file_path: str
    parameters: Optional[Dict[str, Any]]
    generated_by: int
    generated_at: datetime
    project_name: Optional[str] = None  # Project name for display

    class Config:
        from_attributes = True

# Project Schemas
class ProjectBase(BaseModel):
    project_name: str
    vessel_name: Optional[str] = None
    vessel_type: Optional[str] = None
    vessel_owner: Optional[str] = None  # Renamed from owner_name to avoid conflict
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: ProjectStatus = ProjectStatus.planning
    budget: Optional[float] = None
    spending: Optional[float] = None  # No default - allows null to indicate "not tracked"
    description: Optional[str] = None

class ProjectCreate(ProjectBase):
    assigned_user_ids: Optional[List[int]] = []

class ProjectUpdate(BaseModel):
    project_name: Optional[str] = None
    vessel_name: Optional[str] = None
    vessel_type: Optional[str] = None
    vessel_owner: Optional[str] = None  # Renamed from owner_name
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[ProjectStatus] = None
    budget: Optional[float] = None
    spending: Optional[float] = None
    description: Optional[str] = None
    assigned_user_ids: Optional[List[int]] = None

class Project(ProjectBase):
    project_id: int
    created_by: Optional[int]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ProjectResponse(Project):
    assigned_users: List[int] = []
    owner_name: Optional[str] = None
    team_members: List[dict] = []

    class Config:
        from_attributes = True

# Additional schema for login response
class UserResponse(User):
    pass

class UserLogin(BaseModel):
    username: str
    password: str

# Task Schemas
class TaskBase(BaseModel):
    project_id: int
    task_name: str
    description: Optional[str] = None
    assigned_to: Optional[int] = None
    priority: TaskPriority = TaskPriority.medium
    status: TaskStatus = TaskStatus.pending
    is_maintenance: bool = False
    start_date: Optional[date] = None
    due_date: Optional[date] = None

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    project_id: Optional[int] = None
    task_name: Optional[str] = None
    description: Optional[str] = None
    assigned_to: Optional[int] = None
    priority: Optional[TaskPriority] = None
    status: Optional[TaskStatus] = None
    is_maintenance: Optional[bool] = None
    start_date: Optional[date] = None
    due_date: Optional[date] = None
    completion_date: Optional[date] = None

class Task(TaskBase):
    task_id: int
    completion_date: Optional[date]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Enhanced response with related names
class TaskResponse(Task):
    project_name: Optional[str] = None
    assigned_to_name: Optional[str] = None

    class Config:
        from_attributes = True

# Token
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# Dashboard Stats Schema
class DashboardStats(BaseModel):
    total_projects: int
    total_tasks: int
    completed_tasks: int
    total_inventory: int
    low_stock_items: int
