from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, UserSettings
from ..schemas import UserSettings as UserSettingsSchema, UserSettingsUpdate
from ..auth import get_current_user

router = APIRouter()

@router.get("/me", response_model=UserSettingsSchema)
def get_user_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user's settings"""
    settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.user_id).first()
    
    if not settings:
        # Create default settings if they don't exist
        settings = UserSettings(user_id=current_user.user_id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    
    return settings

@router.put("/me", response_model=UserSettingsSchema)
def update_user_settings(
    settings_update: UserSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update current user's settings"""
    settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.user_id).first()
    
    if not settings:
        # Create settings if they don't exist
        settings = UserSettings(user_id=current_user.user_id)
        db.add(settings)
    
    # Update settings
    update_data = settings_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(settings, field, value)
    
    db.commit()
    db.refresh(settings)
    return settings

@router.post("/reset", response_model=UserSettingsSchema)
def reset_user_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Reset user settings to default"""
    settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.user_id).first()
    
    if settings:
        # Delete and recreate with defaults
        db.delete(settings)
        db.commit()
    
    # Create new settings with defaults
    new_settings = UserSettings(user_id=current_user.user_id)
    db.add(new_settings)
    db.commit()
    db.refresh(new_settings)
    
    return new_settings
