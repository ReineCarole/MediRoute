import json
from collections import deque
from datetime import date, timedelta

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session

from database  import engine, get_db, Base
from db_models import (UserModel, InventoryModel, DeliveryModel,
                       DailyStatModel, BlockedRoadModel, RoadDelayModel)
import crud

from graph          import Graph, DOUALA_NODES, DOUALA_EDGES
from priority_queue import PriorityQueue
from models         import Request
from auth.jwt_handler import create_token, decode_token
from auth.password    import verify_password, hash_password

# ─── Create all tables ────────────────────────────────────────────────────────
Base.metadata.create_all(bind=engine)

app = FastAPI(title = "MEDIROUTE API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Seed default data on startup ─────────────────────────────────────────────
@app.on_event("startup")
def startup():
    db = next(get_db())
    crud.seed_users(db)
    crud.seed_inventory(db)

    # Restore blocked roads
    for from_node, to_node in crud.get_blocked_roads(db):
        if from_node in g.nodes and to_node in g.nodes:
            g.block_road(from_node, to_node)

    # Restore road delays
    for from_node, to_node, extra_time in crud.get_road_delays(db):
        if from_node in g.nodes and to_node in g.nodes:
            g.add_delay(from_node, to_node, extra_time)

    # ← ADD THIS: Restore priority queue from DB
    for item in crud.get_all_queued_requests(db):
        req = Request(item.facility, item.medicine, item.priority, item.quantity)
        pq.add_request(req)

    db.close()

# ─── Graph ────────────────────────────────────────────────────────────────────
g = Graph()
for name, data in DOUALA_NODES.items():
    g.add_node(name, data["coords"], meta={
        "type": data["type"],
        "arrondissement": data["arrondissement"],
    })
for from_node, to_node, weight in DOUALA_EDGES:
    g.add_edge(from_node, to_node, weight)

# ─── In-memory runtime structures (no need to persist) ───────────────────────
pq         = PriorityQueue()
fifo_queue: deque = deque()

# ─── BST ──────────────────────────────────────────────────────────────────────
class BSTNode:
    def __init__(self, key, value):
        self.key = key; self.value = value; self.left = None; self.right = None

class BST:
    def __init__(self): self.root = None
    def insert(self, key, value): self.root = self._ins(self.root, key, value)
    def _ins(self, node, key, value):
        if node is None: return BSTNode(key, value)
        if key < node.key: node.left  = self._ins(node.left,  key, value)
        elif key > node.key: node.right = self._ins(node.right, key, value)
        return node
    def search(self, key):
        path = []; result = self._srch(self.root, key, path)
        return {"path": path, "found": result is not None, "node": result}
    def _srch(self, node, key, path):
        if node is None: return None
        path.append(node.key)
        if key == node.key: return node.value
        return self._srch(node.left, key, path) if key < node.key else self._srch(node.right, key, path)
    def to_list(self):
        result = []; self._inorder(self.root, result); return result
    def _inorder(self, node, result):
        if node: self._inorder(node.left, result); result.append({"key": node.key, "value": node.value}); self._inorder(node.right, result)

class HashTable:
    def __init__(self, size=16): self.size = size; self.buckets = [[] for _ in range(size)]
    def _hash(self, key): return sum(ord(c) for c in key) % self.size
    def set(self, key, value):
        idx = self._hash(key)
        for pair in self.buckets[idx]:
            if pair[0] == key: pair[1] = value; return
        self.buckets[idx].append([key, value])
    def snapshot(self):
        return [{"bucket": i, "entries": [{"key": p[0], "value": p[1]} for p in b]} for i, b in enumerate(self.buckets) if b]

facility_bst = BST()
for name, data in DOUALA_NODES.items():
    facility_bst.insert(name, {"type": data["type"], "arrondissement": data["arrondissement"], "coords": data["coords"]})

# ─── Auth helpers ─────────────────────────────────────────────────────────────
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

ROLE_PERMISSIONS = {
    "superadmin": {"read", "dispatch", "block_roads", "manage_inventory", "manage_users"},
    "admin":      {"read", "dispatch", "block_roads", "manage_inventory"},
    "dispatcher": {"read", "dispatch"},
    "viewer":     {"read"},
}

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    payload = decode_token(token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = crud.get_user(db, payload.get("sub"))
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

def require_permission(permission: str):
    def checker(current_user = Depends(get_current_user)):
        allowed = ROLE_PERMISSIONS.get(current_user.role, set())
        if permission not in allowed:
            raise HTTPException(status_code=403, detail=f"Role '{current_user.role}' lacks '{permission}'")
        return current_user
    return checker

# ─── Schemas ──────────────────────────────────────────────────────────────────
class RegisterBody(BaseModel):
    username:   str
    name:       str
    password:   str
    role:       str = "viewer"
    phone:      Optional[str] = ""
    address:    Optional[str] = ""
    profession: Optional[str] = ""

class RestockBody(BaseModel):
    medicine: str
    quantity: int
    is_new:   bool = False

# ─── Auth ─────────────────────────────────────────────────────────────────────
@app.get("/")
def home(): return {"message": "MediRoute Backend Running"}

@app.post("/login")
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = crud.get_user(db, form.username)
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    token = create_token({"sub": user.username, "role": user.role})
    return {"access_token": token, "token_type": "bearer", "role": user.role, "name": user.name}

@app.post("/register")
def register(body: RegisterBody, db: Session = Depends(get_db)):
    if crud.get_user(db, body.username):
        raise HTTPException(status_code=400, detail="Username already taken")
    if len(body.username) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters")
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="Full name is required")
    crud.create_user(db, body.username, body.name.strip(), body.password,
                     "viewer", body.phone or "", body.address or "", body.profession or "")
    return {"message": "Account created successfully. Please sign in.", "username": body.username}

@app.get("/me")
def get_me(current_user = Depends(get_current_user)):
    return {"username": current_user.username, "name": current_user.name,
            "role": current_user.role, "phone": current_user.phone or "",
            "address": current_user.address or "", "profession": current_user.profession or ""}

# ─── Read endpoints ───────────────────────────────────────────────────────────
@app.get("/nodes")
def get_nodes(_=Depends(require_permission("read"))):
    return {"nodes": [{"name": n, "coords": d["coords"], "type": d["type"],
                        "arrondissement": d["arrondissement"]} for n, d in DOUALA_NODES.items()]}

@app.get("/inventory")
def get_inventory(_=Depends(require_permission("read")), db: Session = Depends(get_db)):
    return {"inventory": {"Dépôt Central Akwa": crud.get_inventory(db)}}

@app.get("/requests")
def list_requests(_=Depends(require_permission("read"))):
    return {"requests": pq.list_requests(), "queue_size": pq.size(), "total_units": pq.total_units()}

@app.get("/roads/blocked")
def get_blocked_roads(_=Depends(require_permission("read"))):
    seen, pairs = set(), []
    for a, b in g.blocked_edges:
        key = tuple(sorted([a, b]))
        if key not in seen:
            seen.add(key); pairs.append([a, b])
    return {"blocked": pairs}

@app.get("/route/{destination}")
def get_dynamic_route(destination: str, _=Depends(require_permission("read"))):
    if destination not in g.nodes:
        raise HTTPException(status_code=404, detail=f"Unknown destination: {destination}")
    route = g.dijkstra(DEPOT, destination)
    if not route: return {"error": "No route found"}
    return route

@app.get("/stats")
def get_stats(_=Depends(require_permission("read")), db: Session = Depends(get_db)):
    return {"stats": crud.get_daily_stats(db, 30)}

# ─── Dispatch ─────────────────────────────────────────────────────────────────
DEPOT = "FRPSL Bonanjo"

@app.post("/request")
def add_request(facility: str, medicine: str, priority: int, quantity: int = 1,
                current_user=Depends(require_permission("dispatch")), db: Session = Depends(get_db)):
    if facility not in g.nodes:
        raise HTTPException(status_code=400, detail=f"Unknown facility: {facility}")
    if facility == DEPOT:
        raise HTTPException(status_code=400, detail="Cannot request delivery to the depot")
    if not (1 <= priority <= 5):
        raise HTTPException(status_code=400, detail="Priority must be 1–5")
    if quantity < 1:
        raise HTTPException(status_code=400, detail="Quantity must be at least 1")
    available = crud.get_stock(db, medicine)
    if available < quantity:
        raise HTTPException(status_code=400, detail=f"Not enough stock: {available} available")
    req = Request(facility, medicine, priority, quantity)
    pq.add_request(req)
    crud.save_queued_request(db, facility, medicine, priority, quantity, pq.counter - 1)
    fifo_queue.append({"facility": facility, "medicine": medicine, "priority": priority, "quantity": quantity})
    if len(fifo_queue) > 20: fifo_queue.popleft()
    return {"message": "Request added", "data": str(req), "queue_size": pq.size()}

@app.get("/process")
def process_request(current_user=Depends(require_permission("dispatch")), db: Session = Depends(get_db)):
    req = pq.get_next()
    if not req: return {"message": "No pending requests"}
    available = crud.get_stock(db, req.medicine)
    if available < req.quantity:
        return {"request": str(req), "status": "FAILED", "reason": f"Insufficient stock: {available} available"}
    crud.reduce_stock(db, req.medicine, req.quantity)
    route = g.dijkstra(DEPOT, req.facility)
    if not route:
        crud.add_stock(db, req.medicine, req.quantity)
        return {"request": str(req), "status": "FAILED", "reason": "No route found"}
    # Persist delivery
    crud.delete_queued_request(db, req.facility, req.medicine, req.priority, req.quantity)
    crud.create_delivery(db, req.facility, req.medicine, req.quantity,
                         req.priority, route["path"], route["cost"], current_user.username)
    crud.increment_daily_stat(db)
    return {
        "request": str(req), "status": "APPROVED",
        "quantity": req.quantity,
        "remaining_stock": crud.get_stock(db, req.medicine),
        "route": route,
    }

@app.delete("/request/{index}")
def cancel_request(index: int, _=Depends(require_permission("dispatch")),
                   db: Session = Depends(get_db)):
    if not pq.cancel(index):
        raise HTTPException(status_code=404, detail=f"No request at index {index}")
    crud.clear_queued_request_by_index(db, index)
    return {"message": f"Request {index} cancelled", "queue_size": pq.size()}

# ─── Road controls ────────────────────────────────────────────────────────────
@app.post("/road/block")
def block_road(from_node: str, to_node: str, _=Depends(require_permission("block_roads")), db: Session = Depends(get_db)):
    if from_node not in g.nodes or to_node not in g.nodes:
        raise HTTPException(status_code=400, detail="Unknown node(s)")
    g.block_road(from_node, to_node)
    crud.block_road(db, from_node, to_node)
    crud.block_road(db, to_node, from_node)
    return {"message": f"Road {from_node} → {to_node} blocked"}

@app.post("/road/unblock")
def unblock_road(from_node: str, to_node: str, _=Depends(require_permission("block_roads")), db: Session = Depends(get_db)):
    g.unblock_road(from_node, to_node)
    crud.unblock_road(db, from_node, to_node)
    return {"message": f"Road {from_node} → {to_node} unblocked"}

@app.post("/road/delay")
def delay_road(from_node: str, to_node: str, extra_time: int,
               _=Depends(require_permission("block_roads")), db: Session = Depends(get_db)):
    if from_node not in g.nodes or to_node not in g.nodes:
        raise HTTPException(status_code=400, detail="Unknown node(s)")
    g.add_delay(from_node, to_node, extra_time)
    crud.set_road_delay(db, from_node, to_node, extra_time)
    crud.set_road_delay(db, to_node, from_node, extra_time)
    return {"message": f"Delay of {extra_time} min added"}

# ─── Inventory management ─────────────────────────────────────────────────────
@app.post("/inventory/restock")
def restock(body: RestockBody, current_user=Depends(require_permission("manage_inventory")), db: Session = Depends(get_db)):
    if body.quantity < 1:
        raise HTTPException(status_code=400, detail="Quantity must be at least 1")
    medicine_name = body.medicine.strip()
    if not medicine_name:
        raise HTTPException(status_code=400, detail="Medicine name cannot be empty")
    depot_stock = crud.get_inventory(db)
    if body.is_new and medicine_name in depot_stock:
        raise HTTPException(status_code=400, detail=f"'{medicine_name}' already exists")
    if not body.is_new and medicine_name not in depot_stock:
        raise HTTPException(status_code=400, detail=f"'{medicine_name}' not found — use Add New")
    crud.add_stock(db, medicine_name, body.quantity)
    return {
        "message":      f"{'Added' if body.is_new else 'Restocked'} {body.quantity}× {medicine_name}",
        "medicine":     medicine_name,
        "new_stock":    crud.get_stock(db, medicine_name),
        "restocked_by": current_user.username,
        "is_new":       body.is_new,
    }

# ─── User management ──────────────────────────────────────────────────────────
@app.get("/users")
def list_users(_=Depends(require_permission("manage_users")), db: Session = Depends(get_db)):
    return {
        "users": [
            {"username": u.username, "name": u.name, "role": u.role,
             "phone": u.phone or "", "profession": u.profession or ""}
            for u in crud.get_all_users(db)
        ]
    }

@app.patch("/users/{username}/role")
def update_user_role(username: str, role: str,
                     current_user=Depends(require_permission("manage_users")), db: Session = Depends(get_db)):
    if not crud.get_user(db, username):
        raise HTTPException(status_code=404, detail="User not found")
    if role not in {"superadmin", "admin", "dispatcher", "viewer"}:
        raise HTTPException(status_code=400, detail="Invalid role")
    if username == current_user.username:
        raise HTTPException(status_code=400, detail="Cannot change your own role")
    crud.update_user_role(db, username, role)
    return {"message": f"{username}'s role updated to {role}"}

# ─── Data structures snapshot ─────────────────────────────────────────────────
@app.get("/ds/snapshot")
def ds_snapshot(_=Depends(require_permission("read")), db: Session = Depends(get_db)):
    graph_nodes = [{"name": n, "type": DOUALA_NODES[n]["type"], "neighbors": len(e)} for n, e in g.nodes.items()]
    graph_edges = [{"from": f, "to": t, "weight": w, "blocked": (f, t) in g.blocked_edges}
                   for f, neighbors in g.nodes.items() for t, w in neighbors if f < t]
    inventory   = crud.get_inventory(db)
    ht          = HashTable()
    for med, qty in inventory.items(): ht.set(med, qty)
    deliveries  = crud.get_recent_deliveries(db, 10)
    return {
        "graph":          {"nodes": graph_nodes, "edges": graph_edges, "node_count": len(graph_nodes), "edge_count": len(graph_edges)},
        "priority_queue": {"items": pq.list_requests(), "size": pq.size()},
        "stack":          {"items": list(reversed(deliveries)), "size": len(deliveries)},
        "bst":            {"items": facility_bst.to_list(), "size": len(DOUALA_NODES)},
        "hash_table":     {"buckets": ht.snapshot(), "size": len(inventory), "capacity": 16},
        "fifo_queue":     {"items": list(fifo_queue)[-10:], "size": len(fifo_queue)},
    }

@app.get("/ds/bst/search")
def bst_search(query: str, _=Depends(require_permission("read"))):
    return facility_bst.search(query)

@app.get("/ds/dijkstra")
def dijkstra_steps(source: str, destination: str, _=Depends(require_permission("read"))):
    if source not in g.nodes or destination not in g.nodes:
        raise HTTPException(status_code=400, detail="Unknown node(s)")
    result = g.dijkstra(source, destination)
    if not result: return {"error": "No path found"}
    return result