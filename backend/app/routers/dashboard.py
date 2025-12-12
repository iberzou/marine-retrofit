from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Project, Task, Inventory, User, ProjectAssignment
from app.schemas import DashboardStats
from app.auth import get_current_active_user

router = APIRouter()

@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Role-aware dashboard stats with strict filtering:
    - admin: global data across all projects
    - project_manager: ONLY projects they created + tasks within those projects
    - engineer/technician: ONLY projects they're assigned to + ONLY their own tasks
    """
    # Explicit role checking - fail fast if role is missing or invalid
    if not hasattr(current_user, 'role') or current_user.role is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="User role not properly set"
        )
    
    role = current_user.role
    uid = current_user.user_id
    
    # Initialize counters
    total_projects = 0
    total_tasks = 0
    completed_tasks = 0

    if role == 'admin':
        # Admin sees ALL data (no filtering)
        total_projects = db.query(Project).count()
        total_tasks = db.query(Task).filter(Task.status != 'completed').count()
        completed_tasks = db.query(Task).filter(Task.status == 'completed').count()
        
    elif role == 'project_manager':
        # Project managers see ONLY projects they created
        pm_project_ids = db.query(Project.project_id).filter(
            Project.created_by == uid
        ).all()
        pm_project_ids = [pid[0] for pid in pm_project_ids]
        
        if pm_project_ids:
            # Count only their projects
            total_projects = len(pm_project_ids)
            
            # Count ONLY tasks within their projects
            total_tasks = db.query(Task).filter(
                Task.project_id.in_(pm_project_ids),
                Task.status != 'completed'
            ).count()
            
            completed_tasks = db.query(Task).filter(
                Task.project_id.in_(pm_project_ids),
                Task.status == 'completed'
            ).count()
        else:
            # No projects created yet
            total_projects = 0
            total_tasks = 0
            completed_tasks = 0
            
    elif role in ('engineer', 'technician'):
        # Engineers and technicians see ONLY data assigned to them
        
        # Step 1: Get ONLY projects this user is assigned to via ProjectAssignment table
        assigned_project_ids = db.query(ProjectAssignment.project_id).filter(
            ProjectAssignment.user_id == uid
        ).distinct().all()
        assigned_project_ids = [pid[0] for pid in assigned_project_ids]
        
        # Count ONLY assigned projects
        total_projects = len(assigned_project_ids)
        
        # Step 2: Count ONLY tasks that are:
        # 1. Directly assigned to this user (assigned_to = uid)
        # 2. AND belong to projects they're assigned to
        if assigned_project_ids:
            total_tasks = db.query(Task).filter(
                Task.assigned_to == uid,
                Task.project_id.in_(assigned_project_ids),
                Task.status != 'completed'
            ).count()
            
            completed_tasks = db.query(Task).filter(
                Task.assigned_to == uid,
                Task.project_id.in_(assigned_project_ids),
                Task.status == 'completed'
            ).count()
        else:
            # No assigned projects means no tasks
            total_tasks = 0
            completed_tasks = 0
        
    else:
        # Invalid role - should never happen but defensive programming
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Invalid user role: {role}"
        )

    # Inventory stats are global for all users
    total_inventory = db.query(Inventory).count()
    low_stock_items = db.query(Inventory).filter(
        Inventory.quantity <= Inventory.reorder_level
    ).count()

    return {
        "total_projects": int(total_projects),
        "total_tasks": int(total_tasks),
        "completed_tasks": int(completed_tasks),
        "total_inventory": int(total_inventory),
        "low_stock_items": int(low_stock_items),
    }
