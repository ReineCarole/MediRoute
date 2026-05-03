from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import Optional
from collections import deque

from graph import Graph, DOUALA_NODES, DOUALA_EDGES
from priority_queue import PriorityQueue
from models import Request
from inventory import Inventory
from auth.jwt_handler import create_token, decode_token
from auth.password import hash_password, verify_password

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Users ────────────────────────────────────────────────────────────────────
USERS: dict = {
    "superadmin": {
        "username": "superadmin", "password": hash_password("superadmin123"),
        "role": "superadmin", "name": "Super Admin",
        "phone": "", "address": "", "profession": "",
    },
    "admin": {
        "username": "admin", "password": hash_password("admin123"),
        "role": "admin", "name": "Administrator",
        "phone": "", "address": "", "profession": "",
    },
    "dispatcher": {
        "username": "dispatcher", "password": hash_password("dispatch123"),
        "role": "dispatcher", "name": "Dispatcher",
        "phone": "", "address": "", "profession": "",
    },
    "viewer": {
        "username": "viewer", "password": hash_password("viewer123"),
        "role": "viewer", "name": "Viewer",
        "phone": "", "address": "", "profession": "",
    },
}

ROLE_PERMISSIONS = {
    "superadmin": {"read", "dispatch", "block_roads", "manage_inventory", "manage_users"},
    "admin":      {"read", "dispatch", "block_roads", "manage_inventory"},
    "dispatcher": {"read", "dispatch"},
    "viewer":     {"read"},
}

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = decode_token(token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    username = payload.get("sub")
    if username not in USERS:
        raise HTTPException(status_code=401, detail="User not found")
    return USERS[username]

def require_permission(permission: str):
    def checker(current_user: dict = Depends(get_current_user)):
        allowed = ROLE_PERMISSIONS.get(current_user["role"], set())
        if permission not in allowed:
            raise HTTPException(
                status_code=403,
                detail=f"Role '{current_user['role']}' does not have '{permission}' permission"
            )
        return current_user
    return checker

# ─── Graph ────────────────────────────────────────────────────────────────────
g = Graph()
for name, data in DOUALA_NODES.items():
    g.add_node(name, data["coords"], meta={"type": data["type"], "arrondissement": data["arrondissement"]})
for from_node, to_node, weight in DOUALA_EDGES:
    g.add_edge(from_node, to_node, weight)

# ─── Data structures ──────────────────────────────────────────────────────────
pq           = PriorityQueue()
inv          = Inventory()
delivery_stack: list  = []          # LIFO — last 10 dispatched deliveries
fifo_queue:   deque   = deque()     # FIFO demo queue

DEPOT = "Dépôt Central Akwa"
inv.add_stock(DEPOT, "Oxygen",      20)
inv.add_stock(DEPOT, "Paracetamol", 30)
inv.add_stock(DEPOT, "Bandages",    50)
inv.add_stock(DEPOT, "Syringes",    40)
inv.add_stock(DEPOT, "Gloves",      60)
inv.add_stock(DEPOT, "Antibiotics", 25)

# ─── BST (simple in-memory BST for facility lookup) ───────────────────────────
class BSTNode:
    def __init__(self, key: str, value: dict):
        self.key   = key
        self.value = value
        self.left  = None
        self.right = None

class BST:
    def __init__(self):
        self.root = None

    def insert(self, key: str, value: dict):
        self.root = self._insert(self.root, key, value)

    def _insert(self, node, key, value):
        if node is None:
            return BSTNode(key, value)
        if key < node.key:
            node.left  = self._insert(node.left,  key, value)
        elif key > node.key:
            node.right = self._insert(node.right, key, value)
        return node

    def search(self, key: str) -> list:
        """Return search path + result."""
        path   = []
        result = self._search(self.root, key, path)
        return {"path": path, "found": result is not None, "node": result}

    def _search(self, node, key, path):
        if node is None:
            return None
        path.append(node.key)
        if key == node.key:
            return node.value
        elif key < node.key:
            return self._search(node.left,  key, path)
        else:
            return self._search(node.right, key, path)

    def to_list(self) -> list:
        """In-order traversal."""
        result = []
        self._inorder(self.root, result)
        return result

    def _inorder(self, node, result):
        if node:
            self._inorder(node.left, result)
            result.append({"key": node.key, "value": node.value})
            self._inorder(node.right, result)

# Build BST from facilities
facility_bst = BST()
for name, data in DOUALA_NODES.items():
    facility_bst.insert(name, {
        "type":           data["type"],
        "arrondissement": data["arrondissement"],
        "coords":         data["coords"],
    })

# ─── Hash Table (Python dict with hash visualization) ────────────────────────
class HashTable:
    def __init__(self, size: int = 16):
        self.size    = size
        self.buckets = [[] for _ in range(size)]

    def _hash(self, key: str) -> int:
        return sum(ord(c) for c in key) % self.size

    def set(self, key: str, value):
        idx = self._hash(key)
        for pair in self.buckets[idx]:
            if pair[0] == key:
                pair[1] = value
                return
        self.buckets[idx].append([key, value])

    def get(self, key: str):
        idx = self._hash(key)
        for pair in self.buckets[idx]:
            if pair[0] == key:
                return pair[1]
        return None

    def snapshot(self):
        return [
            {
                "bucket": i,
                "entries": [{"key": p[0], "value": p[1]} for p in bucket],
            }
            for i, bucket in enumerate(self.buckets)
            if bucket  # only non-empty buckets
        ]

# Build hash table from inventory
inv_hash = HashTable()
for med, qty in (inv.data.get(DEPOT) or {}).items():
    inv_hash.set(med, qty)

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

# ─── Auth endpoints ───────────────────────────────────────────────────────────
@app.post("/login")
def login(form: OAuth2PasswordRequestForm = Depends()):
    user = USERS.get(form.username)
    if not user or not verify_password(form.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    token = create_token({"sub": user["username"], "role": user["role"]})
    return {"access_token": token, "token_type": "bearer", "role": user["role"], "name": user["name"]}

@app.post("/register")
def register(body: RegisterBody):
    if body.username in USERS:
        raise HTTPException(status_code=400, detail="Username already taken")
    if len(body.username) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters")
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="Full name is required")
    USERS[body.username] = {
        "username": body.username, "password": hash_password(body.password),
        "role": "viewer", "name": body.name.strip(),
        "phone": body.phone or "", "address": body.address or "", "profession": body.profession or "",
    }
    return {"message": "Account created successfully. Please sign in.", "username": body.username}

@app.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "username": current_user["username"], "name": current_user["name"],
        "role": current_user["role"], "phone": current_user.get("phone", ""),
        "address": current_user.get("address", ""), "profession": current_user.get("profession", ""),
    }

# ─── Public ───────────────────────────────────────────────────────────────────
@app.get("/")
def home():
    return {"message": "MediRoute Backend Running", "depot": DEPOT}

# ─── Read endpoints ───────────────────────────────────────────────────────────
@app.get("/nodes")
def get_nodes(_: dict = Depends(require_permission("read"))):
    return {"nodes": [{"name": n, "coords": d["coords"], "type": d["type"], "arrondissement": d["arrondissement"]} for n, d in DOUALA_NODES.items()]}

@app.get("/inventory")
def get_inventory(_: dict = Depends(require_permission("read"))):
    return {"inventory": inv.data}

@app.get("/requests")
def list_requests(_: dict = Depends(require_permission("read"))):
    return {"requests": pq.list_requests(), "queue_size": pq.size(), "total_units": pq.total_units()}

@app.get("/roads/blocked")
def get_blocked_roads(_: dict = Depends(require_permission("read"))):
    seen, pairs = set(), []
    for a, b in g.blocked_edges:
        key = tuple(sorted([a, b]))
        if key not in seen:
            seen.add(key)
            pairs.append([a, b])
    return {"blocked": pairs}

@app.get("/route/{destination}")
def get_dynamic_route(destination: str, _: dict = Depends(require_permission("read"))):
    if destination not in g.nodes:
        raise HTTPException(status_code=404, detail=f"Unknown destination: {destination}")
    route = g.dijkstra(DEPOT, destination)
    if not route:
        return {"error": "No route found — all paths may be blocked"}
    return route

# ─── Data structures snapshot ─────────────────────────────────────────────────
@app.get("/ds/snapshot")
def ds_snapshot(_: dict = Depends(require_permission("read"))):
    """Returns a full snapshot of all 6 data structures for the DS panel."""

    # 1. Graph — nodes + edges + blocked
    graph_nodes = [
        {"name": name, "type": DOUALA_NODES[name]["type"], "neighbors": len(edges)}
        for name, edges in g.nodes.items()
    ]
    graph_edges = [
        {"from": f, "to": t, "weight": w, "blocked": (f, t) in g.blocked_edges}
        for f, neighbors in g.nodes.items()
        for t, w in neighbors
        if f < t  # avoid duplicates
    ]

    # 2. Priority Queue — current pending requests
    pq_items = pq.list_requests()

    # 3. Stack — last 10 dispatches (LIFO)
    stack_items = list(reversed(delivery_stack[-10:]))

    # 4. BST — in-order facility list
    bst_items = facility_bst.to_list()

    # 5. Hash Table — inventory buckets
    # Sync hash table with current inventory
    current_inv = inv.data.get(DEPOT, {})
    ht = HashTable()
    for med, qty in current_inv.items():
        ht.set(med, qty)
    ht_buckets = ht.snapshot()

    # 6. FIFO Queue — last 10 processed requests
    fifo_items = list(fifo_queue)[-10:]

    return {
        "graph":          {"nodes": graph_nodes, "edges": graph_edges, "node_count": len(graph_nodes), "edge_count": len(graph_edges)},
        "priority_queue": {"items": pq_items,    "size": pq.size()},
        "stack":          {"items": stack_items, "size": len(delivery_stack)},
        "bst":            {"items": bst_items,   "size": len(bst_items)},
        "hash_table":     {"buckets": ht_buckets, "size": len(current_inv), "capacity": 16},
        "fifo_queue":     {"items": fifo_items,  "size": len(fifo_queue)},
    }

@app.get("/ds/bst/search")
def bst_search(query: str, _: dict = Depends(require_permission("read"))):
    """Search the facility BST and return the traversal path."""
    result = facility_bst.search(query)
    return result

@app.get("/ds/dijkstra")
def dijkstra_steps(source: str, destination: str, _: dict = Depends(require_permission("read"))):
    """Run Dijkstra and return the result with path."""
    if source not in g.nodes or destination not in g.nodes:
        raise HTTPException(status_code=400, detail="Unknown node(s)")
    result = g.dijkstra(source, destination)
    if not result:
        return {"error": "No path found"}
    return result

# ─── Dispatch endpoints ───────────────────────────────────────────────────────
@app.post("/request")
def add_request(
    facility: str, medicine: str, priority: int, quantity: int = 1,
    current_user: dict = Depends(require_permission("dispatch"))
):
    if facility not in g.nodes:
        raise HTTPException(status_code=400, detail=f"Unknown facility: {facility}")
    if facility == DEPOT:
        raise HTTPException(status_code=400, detail="Cannot request delivery to the depot")
    if not (1 <= priority <= 5):
        raise HTTPException(status_code=400, detail="Priority must be 1–5")
    if quantity < 1:
        raise HTTPException(status_code=400, detail="Quantity must be at least 1")
    available = inv.check_stock(DEPOT, medicine)
    if available < quantity:
        raise HTTPException(status_code=400, detail=f"Not enough stock: {available} available")
    req = Request(facility, medicine, priority, quantity)
    pq.add_request(req)
    # Also push to FIFO queue
    fifo_queue.append({"facility": facility, "medicine": medicine, "priority": priority, "quantity": quantity})
    if len(fifo_queue) > 20:
        fifo_queue.popleft()
    return {"message": "Request added", "data": str(req), "queue_size": pq.size()}

@app.get("/process")
def process_request(current_user: dict = Depends(require_permission("dispatch"))):
    req = pq.get_next()
    if not req:
        return {"message": "No pending requests"}
    available = inv.check_stock(DEPOT, req.medicine)
    if available < req.quantity:
        return {"request": str(req), "status": "FAILED", "reason": f"Insufficient stock: {available} available"}
    inv.reduce_stock(DEPOT, req.medicine, req.quantity)
    route = g.dijkstra(DEPOT, req.facility)
    if not route:
        inv.add_stock(DEPOT, req.medicine, req.quantity)
        return {"request": str(req), "status": "FAILED", "reason": "No route found"}

    # Push to delivery stack (LIFO)
    delivery_stack.append({
        "facility": req.facility,
        "medicine": req.medicine,
        "quantity": req.quantity,
        "priority": req.priority,
        "path":     route["path"],
        "cost":     route["cost"],
        "by":       current_user["username"],
    })

    return {
        "request": str(req), "status": "APPROVED",
        "quantity": req.quantity,
        "remaining_stock": inv.check_stock(DEPOT, req.medicine),
        "route": route,
    }

@app.delete("/request/{index}")
def cancel_request(index: int, _: dict = Depends(require_permission("dispatch"))):
    if not pq.cancel(index):
        raise HTTPException(status_code=404, detail=f"No request at index {index}")
    return {"message": f"Request {index} cancelled", "queue_size": pq.size()}

# ─── Road controls ────────────────────────────────────────────────────────────
@app.post("/road/block")
def block_road(from_node: str, to_node: str, _: dict = Depends(require_permission("block_roads"))):
    if from_node not in g.nodes or to_node not in g.nodes:
        raise HTTPException(status_code=400, detail="Unknown node(s)")
    g.block_road(from_node, to_node)
    return {"message": f"Road {from_node} → {to_node} blocked"}

@app.post("/road/unblock")
def unblock_road(from_node: str, to_node: str, _: dict = Depends(require_permission("block_roads"))):
    g.unblock_road(from_node, to_node)
    return {"message": f"Road {from_node} → {to_node} unblocked"}

@app.post("/road/delay")
def delay_road(from_node: str, to_node: str, extra_time: int, _: dict = Depends(require_permission("block_roads"))):
    if from_node not in g.nodes or to_node not in g.nodes:
        raise HTTPException(status_code=400, detail="Unknown node(s)")
    g.add_delay(from_node, to_node, extra_time)
    return {"message": f"Delay of {extra_time} min added"}

# ─── Inventory management ─────────────────────────────────────────────────────
@app.post("/inventory/restock")
def restock(body: RestockBody, current_user: dict = Depends(require_permission("manage_inventory"))):
    if body.quantity < 1:
        raise HTTPException(status_code=400, detail="Quantity must be at least 1")
    medicine_name = body.medicine.strip()
    if not medicine_name:
        raise HTTPException(status_code=400, detail="Medicine name cannot be empty")
    depot_stock = inv.data.get(DEPOT, {})
    if body.is_new and medicine_name in depot_stock:
        raise HTTPException(status_code=400, detail=f"'{medicine_name}' already exists — use restock instead")
    if not body.is_new and medicine_name not in depot_stock:
        raise HTTPException(status_code=400, detail=f"'{medicine_name}' not found — use 'Add New' instead")
    inv.add_stock(DEPOT, medicine_name, body.quantity)
    return {
        "message":      f"{'Added' if body.is_new else 'Restocked'} {body.quantity}× {medicine_name}",
        "medicine":     medicine_name,
        "new_stock":    inv.check_stock(DEPOT, medicine_name),
        "restocked_by": current_user["username"],
        "is_new":       body.is_new,
    }

# ─── User management ──────────────────────────────────────────────────────────
@app.get("/users")
def list_users(_: dict = Depends(require_permission("manage_users"))):
    return {
        "users": [
            {"username": u["username"], "name": u["name"], "role": u["role"],
             "phone": u.get("phone", ""), "profession": u.get("profession", "")}
            for u in USERS.values()
        ]
    }

@app.patch("/users/{username}/role")
def update_user_role(username: str, role: str, current_user: dict = Depends(require_permission("manage_users"))):
    if username not in USERS:
        raise HTTPException(status_code=404, detail="User not found")
    if role not in {"superadmin", "admin", "dispatcher", "viewer"}:
        raise HTTPException(status_code=400, detail="Invalid role")
    if username == current_user["username"]:
        raise HTTPException(status_code=400, detail="Cannot change your own role")
    USERS[username]["role"] = role
    return {"message": f"{username}'s role updated to {role}"}