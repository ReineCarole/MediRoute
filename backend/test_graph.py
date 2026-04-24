from graph import Graph

g = Graph()

g.add_edge("Akwa Depot", "Deido", 5)
g.add_edge("Deido", "Bonassama", 3)
g.add_edge("Akwa Depot", "Bonassama", 10)

print("Normal:", g.dijkstra("Akwa Depot", "Bonassama"))

# 🚧 Block road
g.block_road("Deido", "Bonassama")

print("After closure:", g.dijkstra("Akwa Depot", "Bonassama"))

# ⏱ Add delay
g.add_delay("Akwa Depot", "Bonassama", 20)

print("With delay:", g.dijkstra("Akwa Depot", "Bonassama"))