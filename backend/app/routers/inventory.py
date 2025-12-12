from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import Inventory, User
from ..schemas import InventoryCreate, InventoryUpdate, InventoryResponse
from ..auth import get_current_user

router = APIRouter()

@router.get("/", response_model=List[InventoryResponse])
def get_inventory(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all inventory items"""
    items = db.query(Inventory).offset(skip).limit(limit).all()
    return items

@router.get("/low-stock", response_model=List[InventoryResponse])
def get_low_stock(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get inventory items with low stock"""
    items = db.query(Inventory).filter(
        Inventory.quantity <= Inventory.reorder_level
    ).all()
    return items

@router.get("/{item_id}", response_model=InventoryResponse)
def get_inventory_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific inventory item"""
    item = db.query(Inventory).filter(Inventory.item_id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    return item

@router.post("/", response_model=InventoryResponse, status_code=status.HTTP_201_CREATED)
def create_inventory_item(
    item: InventoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new inventory item"""
    if current_user.role not in ['admin', 'project_manager']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    new_item = Inventory(**item.dict())
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item

@router.put("/{item_id}", response_model=InventoryResponse)
def update_inventory_item(
    item_id: int,
    item_update: InventoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an inventory item"""
    if current_user.role not in ['admin', 'project_manager']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    item = db.query(Inventory).filter(Inventory.item_id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    
    update_data = item_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)
    
    db.commit()
    db.refresh(item)
    return item

@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_inventory_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an inventory item"""
    if current_user.role not in ['admin', 'project_manager']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    item = db.query(Inventory).filter(Inventory.item_id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    
    db.delete(item)
    db.commit()
    return None
