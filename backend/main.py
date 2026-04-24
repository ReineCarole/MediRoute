from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from graph import Graph
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

g = Graph()
pq = PriorityQueue()
inv = Inventory()

# Graph setup
g.add_edge("Akwa Depot", "Deido", 5)
g.add_edge("Deido", "Bonassama", 3)
g.add_edge("Akwa Depot", "Bonassama", 10)

# Inventory setup
inv.add_stock("Akwa Depot", "Oxygen", 10)
inv.add_stock("Akwa Depot", "Paracetamol", 5)

@app.get("/")
def home():
    return {"message": "MediRoute Backend Running"}

@app.post("/request")
def add_request(facility: str, medicine: str, priority: int):
    req = Request(facility, medicine, priority)
    pq.add_request(req)
    return {"message": "Request added", "data": str(req)}

@app.get("/process")
def process_request():
    req = pq.get_next()

    if not req:
        return {"message": "No pending requests"}

    # CHECK INVENTORY FIRST
    stock = inv.check_stock("Akwa Depot", req.medicine)

    if stock <= 0:
        return {
            "request": str(req),
            "status": "FAILED",
            "reason": "Out of stock"
        }

    # reduce stock
    inv.reduce_stock("Akwa Depot", req.medicine, 1)

    # compute route
    route = g.dijkstra("Akwa Depot", req.facility)

    return {
        "request": str(req),
        "status": "APPROVED",
        "remaining_stock": inv.check_stock("Akwa Depot", req.medicine),
        "route": route
    }
    
@app.post("/road/block")
def block_road(from_node: str, to_node: str):
    g.block_road(from_node, to_node)
    return {"message": f"Road {from_node} → {to_node} blocked"}

@app.post("/road/delay")
def delay_road(from_node: str, to_node: str, extra_time: int):
    g.add_delay(from_node, to_node, extra_time)
    return {"message": f"Delay added on {from_node} → {to_node}"}

@app.get("/route")
def get_route():
    return g.dijkstra("Akwa Depot", "Bonassama")

@app.get("/route/{destination}")
def get_dynamic_route(destination: str):
    route = g.dijkstra("Akwa Depot", destination)

    if not route:
        return {"error": "No route found"}

    return route
@app.get("/roads/blocked")
def get_blocked_roads():
    return {"blocked": list(g.blocked_edges)}