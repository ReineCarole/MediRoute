from sqlalchemy import Column, Integer, String, DateTime, Text, Float
from sqlalchemy.sql import func
from database import Base


class UserModel(Base):
    __tablename__ = "users"

    id             = Column(Integer, primary_key=True, index=True)
    username       = Column(String(50),  unique=True, nullable=False, index=True)
    name           = Column(String(100), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role           = Column(String(20),  nullable=False, default="viewer")
    phone          = Column(String(20),  nullable=True,  default="")
    address        = Column(String(200), nullable=True,  default="")
    profession     = Column(String(100), nullable=True,  default="")
    created_at     = Column(DateTime(timezone=True), server_default=func.now())


class InventoryModel(Base):
    __tablename__ = "inventory"

    id       = Column(Integer, primary_key=True, index=True)
    medicine = Column(String(100), unique=True, nullable=False, index=True)
    quantity = Column(Integer, nullable=False, default=0)


class DeliveryModel(Base):
    __tablename__ = "deliveries"

    id           = Column(Integer, primary_key=True, index=True)
    facility     = Column(String(200), nullable=False)
    medicine     = Column(String(100), nullable=False)
    quantity     = Column(Integer,     nullable=False)
    priority     = Column(Integer,     nullable=False)
    path         = Column(Text,        nullable=True)   # JSON-serialized list
    cost         = Column(Float,       nullable=True)
    dispatched_by = Column(String(50), nullable=True)
    status       = Column(String(20),  nullable=False, default="APPROVED")
    created_at   = Column(DateTime(timezone=True), server_default=func.now())


class DailyStatModel(Base):
    __tablename__ = "daily_stats"

    id         = Column(Integer, primary_key=True, index=True)
    date       = Column(String(10), unique=True, nullable=False, index=True)  # "2024-05-01"
    count      = Column(Integer, nullable=False, default=0)


class BlockedRoadModel(Base):
    __tablename__ = "blocked_roads"

    id        = Column(Integer, primary_key=True, index=True)
    from_node = Column(String(200), nullable=False)
    to_node   = Column(String(200), nullable=False)


class RoadDelayModel(Base):
    __tablename__ = "road_delays"

    id         = Column(Integer, primary_key=True, index=True)
    from_node  = Column(String(200), nullable=False)
    to_node    = Column(String(200), nullable=False)
    extra_time = Column(Integer,     nullable=False)
    

class QueuedRequestModel(Base):
    __tablename__ = "queued_requests"

    id         = Column(Integer, primary_key=True, index=True)
    facility   = Column(String(200), nullable=False)
    medicine   = Column(String(100), nullable=False)
    priority   = Column(Integer,     nullable=False)
    quantity   = Column(Integer,     nullable=False)
    counter    = Column(Integer,     nullable=False)  # preserves original order
    created_at = Column(DateTime(timezone=True), server_default=func.now())