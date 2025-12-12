from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from fastapi.responses import FileResponse
import os
import shutil
from datetime import datetime
from ..database import get_db
from ..models import User, Blueprint, Project
from ..schemas import Blueprint as BlueprintSchema, BlueprintUpdate
from ..auth import get_current_user

router = APIRouter()


def _with_uploader_name(blueprint: Blueprint, db: Session) -> BlueprintSchema:
    uploader = db.query(User).filter(User.user_id == blueprint.uploaded_by).first()
    uploader_name = uploader.full_name if uploader else "[User deleted]"
    b = BlueprintSchema(
        blueprint_id=blueprint.blueprint_id,
        project_id=blueprint.project_id,
        description=blueprint.description,
        version=blueprint.version or "1.0",
        file_name=blueprint.file_name,
        original_name=blueprint.original_name,
        file_path=blueprint.file_path,
        file_size=blueprint.file_size,
        file_type=blueprint.file_type,
        uploaded_by=blueprint.uploaded_by,
        uploader_name=uploader_name
    )
    return b


UPLOAD_DIR = "uploads/blueprints"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.get("/", response_model=List[BlueprintSchema])
def get_blueprints(
    project_id: int = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all blueprints, optionally filtered by project
    - Admin: sees all blueprints
    - Project Manager: sees all blueprints
    - Engineer/Technician: sees only blueprints from projects they're assigned to
    """
    query = db.query(Blueprint).filter(Blueprint.is_active == True)
    
    # Filter by project if specified
    if project_id:
        query = query.filter(Blueprint.project_id == project_id)
    
    # Role-based filtering
    if current_user.role in ['engineer', 'technician']:
        # Get projects the user is assigned to
        from ..models import ProjectAssignment
        assigned_project_ids = db.query(ProjectAssignment.project_id).filter(
            ProjectAssignment.user_id == current_user.user_id
        ).distinct().all()
        assigned_project_ids = [pid[0] for pid in assigned_project_ids]
        
        # Filter blueprints to only those from assigned projects
        query = query.filter(Blueprint.project_id.in_(assigned_project_ids))
    
    blueprints = query.offset(skip).limit(limit).all()
    
    # Add uploader name to each blueprint
    result = []
    for blueprint in blueprints:
        blueprint_dict = BlueprintSchema.from_orm(blueprint).dict()
        # Get uploader info
        uploader = db.query(User).filter(User.user_id == blueprint.uploaded_by).first()
        blueprint_dict['uploader_name'] = uploader.full_name if uploader else "[User deleted]"
        result.append(blueprint_dict)
    
    return result

@router.get("/{blueprint_id}", response_model=BlueprintSchema)
def get_blueprint(
    blueprint_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific blueprint"""
    blueprint = db.query(Blueprint).filter(Blueprint.blueprint_id == blueprint_id).first()
    if not blueprint:
        raise HTTPException(status_code=404, detail="Blueprint not found")
    
    # Add uploader name
    blueprint_dict = BlueprintSchema.from_orm(blueprint).dict()
    uploader = db.query(User).filter(User.user_id == blueprint.uploaded_by).first()
    blueprint_dict['uploader_name'] = uploader.full_name if uploader else "[User deleted]"
    
    return blueprint_dict

@router.post("/upload", response_model=BlueprintSchema)
async def upload_blueprint(
    project_id: int = Form(...),
    file: UploadFile = File(...),
    description: Optional[str] = Form(None),
    version: str = Form("1.0"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload a new blueprint file"""
    if current_user.role not in ['admin', 'project_manager', 'engineer', 'technician']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Check if project exists
    project = db.query(Project).filter(Project.project_id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Generate unique filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    file_extension = os.path.splitext(file.filename)[1]
    new_filename = f"{project_id}_{timestamp}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, new_filename)
    
    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Get file size
    file_size = os.path.getsize(file_path)
    
    # Create blueprint record
    new_blueprint = Blueprint(
        project_id=project_id,
        file_name=new_filename,
        original_name=file.filename,
        file_path=file_path,
        file_size=file_size,
        file_type=file.content_type,
        version=version,
        description=description,
        uploaded_by=current_user.user_id
    )
    
    db.add(new_blueprint)
    db.commit()
    db.refresh(new_blueprint)
    
    # Add uploader name to response
    blueprint_dict = BlueprintSchema.from_orm(new_blueprint).dict()
    blueprint_dict['uploader_name'] = current_user.full_name
    
    return blueprint_dict

@router.get("/{blueprint_id}/download")
async def download_blueprint(
    blueprint_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Download a blueprint file
    - Admin/PM: can download all blueprints
    - Engineer/Technician: can only download blueprints from assigned projects
    """
    blueprint = db.query(Blueprint).filter(Blueprint.blueprint_id == blueprint_id).first()
    if not blueprint:
        raise HTTPException(status_code=404, detail="Blueprint not found")
    
    # Check if engineer/technician has access to this blueprint's project
    if current_user.role in ['engineer', 'technician']:
        from ..models import ProjectAssignment
        is_assigned = db.query(ProjectAssignment).filter(
            ProjectAssignment.project_id == blueprint.project_id,
            ProjectAssignment.user_id == current_user.user_id
        ).first()
        
        if not is_assigned:
            raise HTTPException(status_code=403, detail="You don't have access to this blueprint")
    
    if not os.path.exists(blueprint.file_path):
        raise HTTPException(status_code=404, detail="File not found on server")
    
    return FileResponse(
        path=blueprint.file_path,
        filename=blueprint.original_name,
        media_type=blueprint.file_type or 'application/octet-stream'
    )

@router.put("/{blueprint_id}", response_model=BlueprintSchema)
def update_blueprint(
    blueprint_id: int,
    blueprint_update: BlueprintUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update blueprint metadata"""
    if current_user.role not in ['admin', 'project_manager', 'engineer', 'technician']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    blueprint = db.query(Blueprint).filter(Blueprint.blueprint_id == blueprint_id).first()
    if not blueprint:
        raise HTTPException(status_code=404, detail="Blueprint not found")
    
    update_data = blueprint_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(blueprint, field, value)
    
    db.commit()
    db.refresh(blueprint)
    return blueprint

@router.delete("/{blueprint_id}")
def delete_blueprint(
    blueprint_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a blueprint"""
    if current_user.role not in ['admin', 'project_manager']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    blueprint = db.query(Blueprint).filter(Blueprint.blueprint_id == blueprint_id).first()
    if not blueprint:
        raise HTTPException(status_code=404, detail="Blueprint not found")
    
    # Delete file if it exists
    if os.path.exists(blueprint.file_path):
        os.remove(blueprint.file_path)
    
    # Soft delete - just mark as inactive
    blueprint.is_active = False
    db.commit()
    
    return {"message": "Blueprint deleted successfully"}


@router.get("/list-fixed", response_model=List[BlueprintSchema])
def list_blueprints_fixed(
    project_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return get_blueprints(project_id, db, current_user)


@router.get("/detail-fixed/{blueprint_id}", response_model=BlueprintSchema)
def blueprint_detail_fixed(blueprint_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return get_blueprint(blueprint_id, db, current_user)
