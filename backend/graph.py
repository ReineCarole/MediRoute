import heapq

class Graph:
    def __init__(self):
        self.nodes = {}
        self.blocked_edges = set()
        self.delayed_edges = {}

    def add_edge(self, from_node, to_node, weight):
        if from_node not in self.nodes:
            self.nodes[from_node] = []
        if to_node not in self.nodes:
            self.nodes[to_node] = []
        
        self.nodes[from_node].append((to_node, weight))
        self.nodes[to_node].append((from_node, weight))

    def block_road(self, from_node, to_node):
        self.blocked_edges.add((from_node, to_node))
        self.blocked_edges.add((to_node, from_node))

    def add_delay(self, from_node, to_node, extra_time):
        self.delayed_edges[(from_node, to_node)] = extra_time
        self.delayed_edges[(to_node, from_node)] = extra_time

    def dijkstra(self, start, end):
        queue = [(0, start, [])]
        visited = set()

        while queue:
            cost, node, path = heapq.heappop(queue)

            if node in visited:
                continue

            visited.add(node)
            path = path + [node]

            if node == end:
                return {"path": path, "cost": cost}

            for neighbor, weight in self.nodes.get(node, []):

                # 🚫 skip blocked roads
                if (node, neighbor) in self.blocked_edges:
                    continue

                # ⏱ apply delay if exists
                delay = self.delayed_edges.get((node, neighbor), 0)

                if neighbor not in visited:
                    heapq.heappush(queue, (cost + weight + delay, neighbor, path))

        return None