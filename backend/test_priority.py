from priority_queue import PriorityQueue

pq = PriorityQueue()

# Add requests (name, priority)
pq.add_request("Bonassama Hospital - OXYGEN", 10)  # HIGH
pq.add_request("Deido Clinic - Paracetamol", 2)    # LOW
pq.add_request("Akwa Hospital - Blood", 8)         # MEDIUM

while not pq.is_empty():
    print(pq.get_next())