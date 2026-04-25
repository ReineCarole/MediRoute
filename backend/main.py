from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from graph import Graph, DOUALA_NODES, DOUALA_EDGES
from priority_queue import PriorityQueue
from models import Request
from inventory import Inventory


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Build graph ─────────────────────────────────────────────────────────────
g = Graph()

for name, data in DOUALA_NODES.items():
    g.add_node(name, data["coords"], meta={
        "type": data["type"],
        "arrondissement": data["arrondissement"],
    })

for from_node, to_node, weight in DOUALA_EDGES:
    g.add_edge(from_node, to_node, weight)

# ─── Other data structures ────────────────────────────────────────────────────
pq = PriorityQueue()
inv = Inventory()

DEPOT = "Dépôt Central Akwa"

inv.add_stock(DEPOT, "Oxygen",       20)
inv.add_stock(DEPOT, "Paracetamol",  30)
inv.add_stock(DEPOT, "Bandages",     50)
inv.add_stock(DEPOT, "Syringes",     40)
inv.add_stock(DEPOT, "Gloves",       60)
inv.add_stock(DEPOT, "Antibiotics",  25)

# ─── Routes ──────────────────────────────────────────────────────────────────

@app.get("/")
def home():
    return {"message": "MediRoute Backend Running", "depot": DEPOT}


@app.get("/nodes")
def get_nodes():
    """All nodes with coords, type, and arrondissement — used by the frontend map."""
    return {
        "nodes": [
            {
                "name": name,
                "coords": data["coords"],
                "type": data["type"],
                "arrondissement": data["arrondissement"],
            }
            for name, data in DOUALA_NODES.items()
        ]
    }


@app.get("/inventory")
def get_inventory():
    return {"inventory": inv.data}


@app.post("/request")
def add_request(facility: str, medicine: str, priority: int):
    if facility not in g.nodes:
        raise HTTPException(status_code=400, detail=f"Unknown facility: {facility}")
    if facility == DEPOT:
        raise HTTPException(status_code=400, detail="Cannot request delivery to the depot itself")
    req = Request(facility, medicine, priority)
    pq.add_request(req)
    return {"message": "Request added", "data": str(req)}


@app.get("/process")
def process_request():
    req = pq.get_next()
    if not req:
        return {"message": "No pending requests"}

    stock = inv.check_stock(DEPOT, req.medicine)
    if stock <= 0:
        return {"request": str(req), "status": "FAILED", "reason": "Out of stock"}

    inv.reduce_stock(DEPOT, req.medicine, 1)
    route = g.dijkstra(DEPOT, req.facility)

    if not route:
        return {
            "request": str(req),
            "status": "FAILED",
            "reason": "No route found — all paths may be blocked",
        }

    return {
        "request": str(req),
        "status": "APPROVED",
        "remaining_stock": inv.check_stock(DEPOT, req.medicine),
        "route": route,
    }


@app.post("/road/block")
def block_road(from_node: str, to_node: str):
    if from_node not in g.nodes or to_node not in g.nodes:
        raise HTTPException(status_code=400, detail="Unknown node(s)")
    g.block_road(from_node, to_node)
    return {"message": f"Road {from_node} → {to_node} blocked"}


@app.post("/road/unblock")
def unblock_road(from_node: str, to_node: str):
    g.unblock_road(from_node, to_node)
    return {"message": f"Road {from_node} → {to_node} unblocked"}


@app.post("/road/delay")
def delay_road(from_node: str, to_node: str, extra_time: int):
    if from_node not in g.nodes or to_node not in g.nodes:
        raise HTTPException(status_code=400, detail="Unknown node(s)")
    g.add_delay(from_node, to_node, extra_time)
    return {"message": f"Delay of {extra_time} min added on {from_node} → {to_node}"}


@app.get("/route/{destination}")
def get_dynamic_route(destination: str):
    if destination not in g.nodes:
        raise HTTPException(status_code=404, detail=f"Unknown destination: {destination}")
    route = g.dijkstra(DEPOT, destination)
    if not route:
        return {"error": "No route found — all paths may be blocked"}
    return route


@app.get("/roads/blocked")
def get_blocked_roads():
    seen = set()
    pairs = []
    for a, b in g.blocked_edges:
        key = tuple(sorted([a, b]))
        if key not in seen:
            seen.add(key)
            pairs.append([a, b])
    return {"blocked": pairs}