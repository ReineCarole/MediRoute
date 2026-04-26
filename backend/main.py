from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm

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

# ─── Hardcoded users ──────────────────────────────────────────────────────────
USERS = {
    "superadmin": {
        "username": "superadmin",
        "password": hash_password("superadmin123"),
        "role":     "superadmin",
        "name":     "Super Admin",
    },
    "admin": {
        "username": "admin",
        "password": hash_password("admin123"),
        "role":     "admin",
        "name":     "Administrator",
    },
    "dispatcher": {
        "username": "dispatcher",
        "password": hash_password("dispatch123"),
        "role":     "dispatcher",
        "name":     "Dispatcher",
    },
    "viewer": {
        "username": "viewer",
        "password": hash_password("viewer123"),
        "role":     "viewer",
        "name":     "Viewer",
    },
}

# Role hierarchy — what each role is allowed to do
ROLE_PERMISSIONS = {
    "superadmin": {"read", "dispatch", "block_roads", "manage_inventory", "manage_users"},
    "admin":      {"read", "dispatch", "block_roads", "manage_inventory"},
    "dispatcher": {"read", "dispatch"},
    "viewer":     {"read"},
}

# ─── Auth helpers ─────────────────────────────────────────────────────────────
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
    """Dependency factory — raises 403 if user lacks the required permission."""
    def checker(current_user: dict = Depends(get_current_user)):
        allowed = ROLE_PERMISSIONS.get(current_user["role"], set())
        if permission not in allowed:
            raise HTTPException(
                status_code=403,
                detail=f"Role '{current_user['role']}' does not have '{permission}' permission"
            )
        return current_user
    return checker

# ─── Build graph ──────────────────────────────────────────────────────────────
g = Graph()
for name, data in DOUALA_NODES.items():
    g.add_node(name, data["coords"], meta={
        "type": data["type"],
        "arrondissement": data["arrondissement"],
    })
for from_node, to_node, weight in DOUALA_EDGES:
    g.add_edge(from_node, to_node, weight)

# ─── Data structures ──────────────────────────────────────────────────────────
pq  = PriorityQueue()
inv = Inventory()

DEPOT = "Dépôt Central Akwa"

inv.add_stock(DEPOT, "Oxygen",      20)
inv.add_stock(DEPOT, "Paracetamol", 30)
inv.add_stock(DEPOT, "Bandages",    50)
inv.add_stock(DEPOT, "Syringes",    40)
inv.add_stock(DEPOT, "Gloves",      60)
inv.add_stock(DEPOT, "Antibiotics", 25)

# ─── Auth endpoints ───────────────────────────────────────────────────────────

@app.post("/login")
def login(form: OAuth2PasswordRequestForm = Depends()):
    user = USERS.get(form.username)
    if not user or not verify_password(form.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    token = create_token({"sub": user["username"], "role": user["role"]})
    return {
        "access_token": token,
        "token_type":   "bearer",
        "role":         user["role"],
        "name":         user["name"],
    }

@app.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "username": current_user["username"],
        "name":     current_user["name"],
        "role":     current_user["role"],
    }

# ─── Public endpoints ─────────────────────────────────────────────────────────

@app.get("/")
def home():
    return {"message": "MediRoute Backend Running", "depot": DEPOT}

# ─── Read-only endpoints (all authenticated users) ────────────────────────────

@app.get("/nodes")
def get_nodes(_: dict = Depends(require_permission("read"))):
    return {
        "nodes": [
            {
                "name":           name,
                "coords":         data["coords"],
                "type":           data["type"],
                "arrondissement": data["arrondissement"],
            }
            for name, data in DOUALA_NODES.items()
        ]
    }

@app.get("/inventory")
def get_inventory(_: dict = Depends(require_permission("read"))):
    return {"inventory": inv.data}

@app.get("/requests")
def list_requests(_: dict = Depends(require_permission("read"))):
    return {
        "requests":    pq.list_requests(),
        "queue_size":  pq.size(),
        "total_units": pq.total_units(),
    }

@app.get("/roads/blocked")
def get_blocked_roads(_: dict = Depends(require_permission("read"))):
    seen  = set()
    pairs = []
    for a, b in g.blocked_edges:
        key = tuple(sorted([a, b]))
        if key not in seen:
            seen.add(key)
            pairs.append([a, b])
    return {"blocked": pairs}

@app.get("/route/{destination}")
def get_dynamic_route(
    destination: str,
    _: dict = Depends(require_permission("read"))
):
    if destination not in g.nodes:
        raise HTTPException(status_code=404, detail=f"Unknown destination: {destination}")
    route = g.dijkstra(DEPOT, destination)
    if not route:
        return {"error": "No route found — all paths may be blocked"}
    return route

# ─── Dispatch endpoints (dispatcher, admin, superadmin) ───────────────────────

@app.post("/request")
def add_request(
    facility: str,
    medicine: str,
    priority: int,
    quantity: int = 1,
    current_user: dict = Depends(require_permission("dispatch"))
):
    if facility not in g.nodes:
        raise HTTPException(status_code=400, detail=f"Unknown facility: {facility}")
    if facility == DEPOT:
        raise HTTPException(status_code=400, detail="Cannot request delivery to the depot")
    if priority < 1 or priority > 5:
        raise HTTPException(status_code=400, detail="Priority must be between 1 and 5")
    if quantity < 1:
        raise HTTPException(status_code=400, detail="Quantity must be at least 1")
    available = inv.check_stock(DEPOT, medicine)
    if available < quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Not enough stock: {available} {medicine} available, {quantity} requested"
        )
    req = Request(facility, medicine, priority, quantity)
    pq.add_request(req)
    return {
        "message":    "Request added",
        "data":       str(req),
        "queue_size": pq.size(),
        "queued_by":  current_user["username"],
    }

@app.get("/process")
def process_request(current_user: dict = Depends(require_permission("dispatch"))):
    req = pq.get_next()
    if not req:
        return {"message": "No pending requests"}
    available = inv.check_stock(DEPOT, req.medicine)
    if available < req.quantity:
        return {
            "request": str(req),
            "status":  "FAILED",
            "reason":  f"Insufficient stock: {available} available, {req.quantity} needed",
        }
    inv.reduce_stock(DEPOT, req.medicine, req.quantity)
    route = g.dijkstra(DEPOT, req.facility)
    if not route:
        inv.add_stock(DEPOT, req.medicine, req.quantity)
        return {
            "request": str(req),
            "status":  "FAILED",
            "reason":  "No route found — all paths may be blocked",
        }
    return {
        "request":         str(req),
        "status":          "APPROVED",
        "quantity":        req.quantity,
        "remaining_stock": inv.check_stock(DEPOT, req.medicine),
        "route":           route,
        "dispatched_by":   current_user["username"],
    }

@app.delete("/request/{index}")
def cancel_request(
    index: int,
    _: dict = Depends(require_permission("dispatch"))
):
    success = pq.cancel(index)
    if not success:
        raise HTTPException(status_code=404, detail=f"No request at index {index}")
    return {"message": f"Request at position {index} cancelled", "queue_size": pq.size()}

# ─── Road control endpoints (admin, superadmin) ───────────────────────────────

@app.post("/road/block")
def block_road(
    from_node: str,
    to_node: str,
    _: dict = Depends(require_permission("block_roads"))
):
    if from_node not in g.nodes or to_node not in g.nodes:
        raise HTTPException(status_code=400, detail="Unknown node(s)")
    g.block_road(from_node, to_node)
    return {"message": f"Road {from_node} → {to_node} blocked"}

@app.post("/road/unblock")
def unblock_road(
    from_node: str,
    to_node: str,
    _: dict = Depends(require_permission("block_roads"))
):
    g.unblock_road(from_node, to_node)
    return {"message": f"Road {from_node} → {to_node} unblocked"}

@app.post("/road/delay")
def delay_road(
    from_node: str,
    to_node: str,
    extra_time: int,
    _: dict = Depends(require_permission("block_roads"))
):
    if from_node not in g.nodes or to_node not in g.nodes:
        raise HTTPException(status_code=400, detail="Unknown node(s)")
    g.add_delay(from_node, to_node, extra_time)
    return {"message": f"Delay of {extra_time} min added on {from_node} → {to_node}"}

# ─── Inventory management (admin, superadmin) ─────────────────────────────────

@app.post("/inventory/restock")
def restock(
    medicine: str,
    quantity: int,
    current_user: dict = Depends(require_permission("manage_inventory"))
):
    if quantity < 1:
        raise HTTPException(status_code=400, detail="Quantity must be at least 1")
    inv.add_stock(DEPOT, medicine, quantity)
    return {
        "message":       f"Restocked {quantity}× {medicine}",
        "new_stock":     inv.check_stock(DEPOT, medicine),
        "restocked_by":  current_user["username"],
    }

# ─── User management (superadmin only) ───────────────────────────────────────

@app.get("/users")
def list_users(_: dict = Depends(require_permission("manage_users"))):
    return {
        "users": [
            {"username": u["username"], "name": u["name"], "role": u["role"]}
            for u in USERS.values()
        ]
    }