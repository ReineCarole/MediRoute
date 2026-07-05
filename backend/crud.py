import json
from datetime import date
from sqlalchemy.orm import Session
from db_models import (
    UserModel, InventoryModel, DeliveryModel,
    DailyStatModel, BlockedRoadModel, RoadDelayModel,
)
from auth.password import hash_password


# ─── Users ────────────────────────────────────────────────────────────────────

def get_user(db: Session, username: str):
    return db.query(UserModel).filter(UserModel.username == username).first()

def get_all_users(db: Session):
    return db.query(UserModel).all()

def create_user(db: Session, username: str, name: str, password: str,
                role: str = "viewer", phone: str = "", address: str = "", profession: str = ""):
    user = UserModel(
        username=username, name=name,
        hashed_password=hash_password(password),
        role=role, phone=phone, address=address, profession=profession,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def update_user_role(db: Session, username: str, role: str):
    user = get_user(db, username)
    if user:
        user.role = role
        db.commit()
        db.refresh(user)
    return user

def seed_users(db: Session):
    """Create default users if they don't exist."""
    defaults = [
        {"username": "superadmin", "name": "Super Admin",    "password": "superadmin123", "role": "superadmin"},
        {"username": "admin",      "name": "Administrator",  "password": "admin123",      "role": "admin"},
        {"username": "dispatcher", "name": "Dispatcher",     "password": "dispatch123",   "role": "dispatcher"},
        {"username": "viewer",     "name": "Viewer",         "password": "viewer123",     "role": "viewer"},
    ]
    for u in defaults:
        if not get_user(db, u["username"]):
            create_user(db, u["username"], u["name"], u["password"], u["role"])


# ─── Inventory ────────────────────────────────────────────────────────────────

def get_inventory(db: Session) -> dict:
    items = db.query(InventoryModel).all()
    return {item.medicine: item.quantity for item in items}

def get_stock(db: Session, medicine: str) -> int:
    item = db.query(InventoryModel).filter(InventoryModel.medicine == medicine).first()
    return item.quantity if item else 0

def set_stock(db: Session, medicine: str, quantity: int):
    item = db.query(InventoryModel).filter(InventoryModel.medicine == medicine).first()
    if item:
        item.quantity = quantity
    else:
        item = InventoryModel(medicine=medicine, quantity=quantity)
        db.add(item)
    db.commit()

def add_stock(db: Session, medicine: str, quantity: int):
    current = get_stock(db, medicine)
    set_stock(db, medicine, current + quantity)

def reduce_stock(db: Session, medicine: str, quantity: int) -> bool:
    current = get_stock(db, medicine)
    if current < quantity:
        return False
    set_stock(db, medicine, current - quantity)
    return True

def seed_inventory(db: Session):
    """Seed default inventory if empty."""
    defaults = {
        "Oxygen":      20,
        "Paracetamol": 30,
        "Bandages":    50,
        "Syringes":    40,
        "Gloves":      60,
        "Antibiotics": 25,
    }
    for medicine, qty in defaults.items():
        if not db.query(InventoryModel).filter(InventoryModel.medicine == medicine).first():
            db.add(InventoryModel(medicine=medicine, quantity=qty))
    db.commit()


# ─── Deliveries ───────────────────────────────────────────────────────────────

def create_delivery(db: Session, facility: str, medicine: str, quantity: int,
                    priority: int, path: list, cost: float, dispatched_by: str):
    delivery = DeliveryModel(
        facility=facility, medicine=medicine, quantity=quantity,
        priority=priority, path=json.dumps(path), cost=cost,
        dispatched_by=dispatched_by, status="APPROVED",
    )
    db.add(delivery)
    db.commit()
    db.refresh(delivery)
    return delivery

def get_recent_deliveries(db: Session, limit: int = 10):
    items = db.query(DeliveryModel).order_by(DeliveryModel.created_at.desc()).limit(limit).all()
    result = []
    for d in items:
        result.append({
            "facility":      d.facility,
            "medicine":      d.medicine,
            "quantity":      d.quantity,
            "priority":      d.priority,
            "path":          json.loads(d.path) if d.path else [],
            "cost":          d.cost,
            "by":            d.dispatched_by,
            "status":        d.status,
            "created_at":    str(d.created_at),
        })
    return result


# ─── Daily stats ──────────────────────────────────────────────────────────────

def increment_daily_stat(db: Session):
    today = str(date.today())
    stat  = db.query(DailyStatModel).filter(DailyStatModel.date == today).first()
    if stat:
        stat.count += 1
    else:
        stat = DailyStatModel(date=today, count=1)
        db.add(stat)
    db.commit()

def get_daily_stats(db: Session, days: int = 30) -> list:
    from datetime import timedelta
    today  = date.today()
    result = []
    for i in range(days - 1, -1, -1):
        day   = today - timedelta(days=i)
        label = day.strftime("%b %d")
        stat  = db.query(DailyStatModel).filter(DailyStatModel.date == str(day)).first()
        result.append({"day": label, "deliveries": stat.count if stat else 0})
    return result


# ─── Blocked roads ────────────────────────────────────────────────────────────

def get_blocked_roads(db: Session) -> list:
    return [(r.from_node, r.to_node) for r in db.query(BlockedRoadModel).all()]

def block_road(db: Session, from_node: str, to_node: str):
    # Check not already blocked
    exists = db.query(BlockedRoadModel).filter(
        BlockedRoadModel.from_node == from_node,
        BlockedRoadModel.to_node   == to_node,
    ).first()
    if not exists:
        db.add(BlockedRoadModel(from_node=from_node, to_node=to_node))
        db.commit()

def unblock_road(db: Session, from_node: str, to_node: str):
    db.query(BlockedRoadModel).filter(
        BlockedRoadModel.from_node == from_node,
        BlockedRoadModel.to_node   == to_node,
    ).delete()
    db.query(BlockedRoadModel).filter(
        BlockedRoadModel.from_node == to_node,
        BlockedRoadModel.to_node   == from_node,
    ).delete()
    db.commit()


# ─── Road delays ──────────────────────────────────────────────────────────────

def get_road_delays(db: Session) -> list:
    return [(r.from_node, r.to_node, r.extra_time) for r in db.query(RoadDelayModel).all()]

def set_road_delay(db: Session, from_node: str, to_node: str, extra_time: int):
    existing = db.query(RoadDelayModel).filter(
        RoadDelayModel.from_node == from_node,
        RoadDelayModel.to_node   == to_node,
    ).first()
    if existing:
        existing.extra_time = extra_time
    else:
        db.add(RoadDelayModel(from_node=from_node, to_node=to_node, extra_time=extra_time))
    db.commit()
    
    
# ─── Queued requests ──────────────────────────────────────────────────────────
from db_models import QueuedRequestModel

def save_queued_request(db: Session, facility: str, medicine: str,
                         priority: int, quantity: int, counter: int):
    db.add(QueuedRequestModel(
        facility=facility, medicine=medicine,
        priority=priority, quantity=quantity, counter=counter,
    ))
    db.commit()

def get_all_queued_requests(db: Session) -> list:
    return db.query(QueuedRequestModel).order_by(QueuedRequestModel.counter).all()

def delete_queued_request(db: Session, facility: str, medicine: str,
                           priority: int, quantity: int):
    """Delete the first matching queued request (highest priority = lowest counter)."""
    item = db.query(QueuedRequestModel).filter(
        QueuedRequestModel.facility == facility,
        QueuedRequestModel.medicine == medicine,
        QueuedRequestModel.priority == priority,
        QueuedRequestModel.quantity == quantity,
    ).order_by(QueuedRequestModel.counter).first()
    if item:
        db.delete(item)
        db.commit()

def clear_queued_request_by_index(db: Session, index: int):
    """Delete by position in priority-sorted order."""
    items = db.query(QueuedRequestModel).order_by(
        QueuedRequestModel.priority,
        QueuedRequestModel.counter
    ).all()
    if 0 <= index < len(items):
        db.delete(items[index])
        db.commit()
        return True
    return False