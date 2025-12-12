from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models import Task, User, Project, ProjectAssignment
from ..schemas import TaskCreate, TaskUpdate, TaskResponse, Task as TaskSchema
from ..auth import get_current_user

router = APIRouter()

def validate_task_assignment(db: Session, project_id: int, assigned_to: Optional[int]):
    """
    Validate that the assigned_to user is part of the project team.
    Raises HTTPException if validation fails.
    """
    if assigned_to is None:
        # Unassigned tasks are allowed
        return
    
    # Check if the assigned user exists
    user = db.query(User).filter(User.user_id == assigned_to).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {assigned_to} not found"
        )
    
    # Check if the project exists
    project = db.query(Project).filter(Project.project_id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found"
        )
    
    # Check if the user is assigned to this project
    is_assigned = db.query(ProjectAssignment).filter(
        ProjectAssignment.project_id == project_id,
        ProjectAssignment.user_id == assigned_to
    ).first()
    
    if not is_assigned:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User '{user.full_name}' is not assigned to project '{project.project_name}'. "
                   f"Only team members of this project can be assigned tasks."
        )

@router.get("/", response_model=List[TaskResponse])
def get_tasks(
    project_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get tasks based on user role:
    - Admin: sees all tasks
    - Project Manager: sees tasks from their projects
    - Engineer/Technician: sees only tasks assigned to them
    """
    query = db.query(Task)
    
    if current_user.role == 'admin':
        # Admin sees all tasks
        pass
    elif current_user.role == 'project_manager':
        # Project managers see tasks from their projects
        from app.models import Project as ProjectModel
        project_ids = db.query(ProjectModel.project_id).filter(
            ProjectModel.created_by == current_user.user_id
        ).all()
        project_ids = [pid[0] for pid in project_ids]
        query = query.filter(Task.project_id.in_(project_ids))
    else:
        # Engineers and technicians see only their assigned tasks
        query = query.filter(Task.assigned_to == current_user.user_id)
    
    if project_id:
        query = query.filter(Task.project_id == project_id)
        
    tasks = query.offset(skip).limit(limit).all()
    
    # Enrich tasks with related names
    result = []
    for task in tasks:
        task_dict = TaskResponse.from_orm(task).dict()
        
        # Get project name
        project = db.query(Project).filter(Project.project_id == task.project_id).first()
        task_dict['project_name'] = project.project_name if project else 'Unknown'
        
        # Get assigned user name
        if task.assigned_to:
            assignee = db.query(User).filter(User.user_id == task.assigned_to).first()
            task_dict['assigned_to_name'] = assignee.full_name if assignee else 'Unknown'
        else:
            task_dict['assigned_to_name'] = 'Unassigned'
        
        result.append(TaskResponse(**task_dict))
    
    return result

@router.get("/{task_id}", response_model=TaskResponse)
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.query(Task).filter(Task.task_id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Enrich with related names
    task_dict = TaskResponse.from_orm(task).dict()
    
    # Get project name
    project = db.query(Project).filter(Project.project_id == task.project_id).first()
    task_dict['project_name'] = project.project_name if project else 'Unknown'
    
    # Get assigned user name
    if task.assigned_to:
        assignee = db.query(User).filter(User.user_id == task.assigned_to).first()
        task_dict['assigned_to_name'] = assignee.full_name if assignee else 'Unknown'
    else:
        task_dict['assigned_to_name'] = 'Unassigned'
    
    return TaskResponse(**task_dict)

@router.post("/", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    task: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Validate that assigned user is part of the project team
    validate_task_assignment(db, task.project_id, task.assigned_to)
    
    new_task = Task(**task.dict())
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    
    # Enrich with related names
    task_dict = TaskResponse.from_orm(new_task).dict()
    
    # Get project name
    project = db.query(Project).filter(Project.project_id == new_task.project_id).first()
    task_dict['project_name'] = project.project_name if project else 'Unknown'
    
    # Get assigned user name
    if new_task.assigned_to:
        assignee = db.query(User).filter(User.user_id == new_task.assigned_to).first()
        task_dict['assigned_to_name'] = assignee.full_name if assignee else 'Unknown'
    else:
        task_dict['assigned_to_name'] = 'Unassigned'
    
    return TaskResponse(**task_dict)

@router.put("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    task_update: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.query(Task).filter(Task.task_id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    update_data = task_update.dict(exclude_unset=True)
    
    # Determine the final project_id (either updated or current)
    final_project_id = update_data.get('project_id', task.project_id)
    
    # Validate project_id change if provided
    if 'project_id' in update_data and update_data['project_id'] is not None:
        new_project_id = update_data['project_id']
        
        # Verify the new project exists
        new_project = db.query(Project).filter(Project.project_id == new_project_id).first()
        if not new_project:
            raise HTTPException(status_code=404, detail=f"Project with ID {new_project_id} not found")
        
        # For project managers, ensure they can only move tasks to projects they created
        if current_user.role == 'project_manager':
            # Check if user owns the new project
            if new_project.created_by != current_user.user_id:
                raise HTTPException(
                    status_code=403, 
                    detail="You can only move tasks to projects you created"
                )
            
            # Also verify they own the current project (to edit the task)
            current_project = db.query(Project).filter(Project.project_id == task.project_id).first()
            if current_project and current_project.created_by != current_user.user_id:
                raise HTTPException(
                    status_code=403, 
                    detail="You can only edit tasks from your own projects"
                )
    
    # Validate assignment change if provided
    # Use the task's current assigned_to if not being updated
    final_assigned_to = update_data.get('assigned_to', task.assigned_to)
    
    # Only validate if assigned_to is being changed or if project_id is being changed
    if 'assigned_to' in update_data or 'project_id' in update_data:
        # If assigned_to is explicitly set to None/null, that's allowed (unassigning)
        if 'assigned_to' in update_data and update_data['assigned_to'] is None:
            pass  # Unassigning is allowed
        else:
            # Validate the assignment
            validate_task_assignment(db, final_project_id, final_assigned_to)
    
    # Apply all updates
    for field, value in update_data.items():
        setattr(task, field, value)
    
    db.commit()
    db.refresh(task)
    
    # Enrich with related names
    task_dict = TaskResponse.from_orm(task).dict()
    
    # Get project name
    project = db.query(Project).filter(Project.project_id == task.project_id).first()
    task_dict['project_name'] = project.project_name if project else 'Unknown'
    
    # Get assigned user name
    if task.assigned_to:
        assignee = db.query(User).filter(User.user_id == task.assigned_to).first()
        task_dict['assigned_to_name'] = assignee.full_name if assignee else 'Unknown'
    else:
        task_dict['assigned_to_name'] = 'Unassigned'
    
    return TaskResponse(**task_dict)

@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.query(Task).filter(Task.task_id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    db.delete(task)
    db.commit()
    return None

@router.patch("/{task_id}/complete", response_model=TaskResponse)
def mark_task_done(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark a task as completed. Available to engineers, technicians, and project managers."""
    task = db.query(Task).filter(Task.task_id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Check if user has permission to complete this task
    if current_user.role not in ['admin', 'project_manager', 'engineer', 'technician']:
        raise HTTPException(status_code=403, detail="Not authorized to complete tasks")
    
    # Engineers and technicians can only complete their assigned tasks
    if current_user.role in ['engineer', 'technician'] and task.assigned_to != current_user.user_id:
        raise HTTPException(status_code=403, detail="You can only complete tasks assigned to you")
    
    # Project managers can complete tasks from their projects
    if current_user.role == 'project_manager':
        project = db.query(Project).filter(Project.project_id == task.project_id).first()
        if project and project.created_by != current_user.user_id:
            raise HTTPException(status_code=403, detail="You can only complete tasks from your projects")
    
    from datetime import date
    task.status = 'completed'
    task.completion_date = date.today()
    
    db.commit()
    db.refresh(task)
    
    # Enrich with related names
    task_dict = TaskResponse.from_orm(task).dict()
    
    # Get project name
    project = db.query(Project).filter(Project.project_id == task.project_id).first()
    task_dict['project_name'] = project.project_name if project else 'Unknown'
    
    # Get assigned user name
    if task.assigned_to:
        assignee = db.query(User).filter(User.user_id == task.assigned_to).first()
        task_dict['assigned_to_name'] = assignee.full_name if assignee else 'Unknown'
    else:
        task_dict['assigned_to_name'] = 'Unassigned'
    
    return TaskResponse(**task_dict)