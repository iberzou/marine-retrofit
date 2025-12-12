from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import Project, User, ProjectAssignment
from ..schemas import ProjectCreate, ProjectUpdate, ProjectResponse
from ..auth import get_current_user

router = APIRouter()

def _require_role(user: User, allowed: list[str]):
    if user.role not in allowed:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")


@router.get("/", response_model=List[ProjectResponse])
def get_projects(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get projects based on user role:
    - Admin: sees all projects
    - Project Manager: sees only projects they created
    - Engineer/Technician: sees only projects they're assigned to
    """
    if current_user.role == 'admin':
        # Admin sees all projects
        projects = db.query(Project).offset(skip).limit(limit).all()
    elif current_user.role == 'project_manager':
        # Project managers see only their created projects
        projects = db.query(Project).filter(Project.created_by == current_user.user_id).offset(skip).limit(limit).all()
    else:
        # Engineers and technicians see only assigned projects
        project_ids = db.query(ProjectAssignment.project_id).filter(
            ProjectAssignment.user_id == current_user.user_id
        ).all()
        project_ids = [pid[0] for pid in project_ids]
        projects = db.query(Project).filter(Project.project_id.in_(project_ids)).offset(skip).limit(limit).all()
    
    # Add assigned users to each project
    result = []
    for project in projects:
        assigned_user_ids = [assignment.user_id for assignment in project.assignments]
        project_dict = ProjectResponse.from_orm(project).dict()
        project_dict['assigned_users'] = assigned_user_ids
        
        # Get owner name
        if project.created_by:
            owner = db.query(User).filter(User.user_id == project.created_by).first()
            project_dict['owner_name'] = owner.full_name if owner else None
        
        # Get team member details
        team_members = []
        for assignment in project.assignments:
            user = db.query(User).filter(User.user_id == assignment.user_id).first()
            if user:
                team_members.append({
                    'user_id': user.user_id,
                    'full_name': user.full_name,
                    'role': user.role
                })
        project_dict['team_members'] = team_members
        
        result.append(ProjectResponse(**project_dict))
    
    return result

@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.project_id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Add assigned users
    assigned_user_ids = [assignment.user_id for assignment in project.assignments]
    project_dict = ProjectResponse.from_orm(project).dict()
    project_dict['assigned_users'] = assigned_user_ids
    
    # Get owner name
    if project.created_by:
        owner = db.query(User).filter(User.user_id == project.created_by).first()
        project_dict['owner_name'] = owner.full_name if owner else None
    
    # Get team member details
    team_members = []
    for assignment in project.assignments:
        user = db.query(User).filter(User.user_id == assignment.user_id).first()
        if user:
            team_members.append({
                'user_id': user.user_id,
                'full_name': user.full_name,
                'role': user.role
            })
    project_dict['team_members'] = team_members
    
    return ProjectResponse(**project_dict)

@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    project: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Only admin and project_manager can create projects
    if current_user.role not in ['admin', 'project_manager']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and project managers can create projects"
        )
    
    # Create project without assigned_user_ids
    project_data = project.dict(exclude={'assigned_user_ids'})
    new_project = Project(**project_data, created_by=current_user.user_id)
    db.add(new_project)
    db.flush()  # Flush to get the project_id
    
    # Add user assignments
    if project.assigned_user_ids:
        for user_id in project.assigned_user_ids:
            assignment = ProjectAssignment(project_id=new_project.project_id, user_id=user_id)
            db.add(assignment)
    
    db.commit()
    db.refresh(new_project)
    
    # Return with assigned users
    assigned_user_ids = [assignment.user_id for assignment in new_project.assignments]
    project_dict = ProjectResponse.from_orm(new_project).dict()
    project_dict['assigned_users'] = assigned_user_ids
    
    return ProjectResponse(**project_dict)

@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: int,
    project_update: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.project_id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Update project fields (excluding assigned_user_ids)
    update_data = project_update.dict(exclude_unset=True, exclude={'assigned_user_ids'})
    for field, value in update_data.items():
        setattr(project, field, value)
    
    # Update user assignments if provided
    if project_update.assigned_user_ids is not None:
        # Remove existing assignments
        db.query(ProjectAssignment).filter(ProjectAssignment.project_id == project_id).delete()
        # Add new assignments
        for user_id in project_update.assigned_user_ids:
            assignment = ProjectAssignment(project_id=project_id, user_id=user_id)
            db.add(assignment)
    
    db.commit()
    db.refresh(project)
    
    # Return with assigned users
    assigned_user_ids = [assignment.user_id for assignment in project.assignments]
    project_dict = ProjectResponse.from_orm(project).dict()
    project_dict['assigned_users'] = assigned_user_ids
    
    return ProjectResponse(**project_dict)

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.project_id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    db.delete(project)
    db.commit()
    return None
