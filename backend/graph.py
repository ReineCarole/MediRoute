import heapq

# ─── Real Douala medical facilities with GPS coordinates ─────────────────────
# type: depot | hospital | clinic | pharmacy | lab

DOUALA_NODES = {
    # ── DEPOT ────────────────────────────────────────────────────────────────
    "Dépôt Central Akwa": {
        "coords": [4.0511, 9.7085],
        "type": "depot",
        "arrondissement": "Douala I",
    },

    # ── HOSPITALS ─────────────────────────────────────────────────────────────
    "Hôpital Laquintinie": {
        "coords": [4.0483695, 9.7034133],
        "type": "hospital",
        "arrondissement": "Douala I",
    },
    "Hôpital Ad Lucem Bali": {
        "coords": [4.0360865, 9.6994998],
        "type": "hospital",
        "arrondissement": "Douala I",
    },
    "Mboppi Baptist Hospital": {
        "coords": [4.041195699999999, 9.7162274],
        "type": "hospital",
        "arrondissement": "Douala I",
    },
    "Hôpital Garnison Militaire": {
        "coords": [4.0338347, 9.6853609],
        "type": "hospital",
        "arrondissement": "Douala I",
    },
    "Polyclinique Bonanjo": {
        "coords": [4.0371388999999995, 9.689523999999999],
        "type": "hospital",
        "arrondissement": "Douala I",
    },
    "Hôpital District New Bell": {
        "coords": [4.029208, 9.7112159],
        "type": "hospital",
        "arrondissement": "Douala II",
    },
    "Hôpital District Deido": {
        "coords": [4.0648826, 9.7143093],
        "type": "hospital",
        "arrondissement": "Douala II",
    },
    "Hôpital District Bonassama": {
        "coords": [4.0719766, 9.685737699999999],
        "type": "hospital",
        "arrondissement": "Douala II",
    },
    "Hôpital District Logbaba": {
        "coords": [4.0359335, 9.754378899999999],
        "type": "hospital",
        "arrondissement": "Douala III",
    },
    "Hôpital District Cité des Palmiers": {
        "coords": [4.0520816, 9.7618914],
        "type": "hospital",
        "arrondissement": "Douala V",
    },
    "General Hospital of Douala": {
        "coords": [4.0644010999999995, 9.7588071],
        "type": "hospital",
        "arrondissement": "Douala V",
    },
    "Hôpital Protestant Cité SIC": {
        "coords": [4.0487437, 9.7277306],
        "type": "hospital",
        "arrondissement": "Douala V",
    },
    "Ad Lucem Hospital Logbessou": {
        "coords": [4.0822343, 9.7845558],
        "type": "hospital",
        "arrondissement": "Douala V",
    },

    # ── CLINICS ───────────────────────────────────────────────────────────────
    "Clinique du Gros Chêne": {
        "coords": [4.0502209, 9.6998669],
        "type": "clinic",
        "arrondissement": "Douala I",
    },
    "Polyclinique Idimed": {
        "coords": [4.0276719, 9.7038379],
        "type": "clinic",
        "arrondissement": "Douala I",
    },
    "Clinique Makepe": {
        "coords": [4.0858148, 9.7494975],
        "type": "clinic",
        "arrondissement": "Douala V",
    },
    "Clinique Saint Nicolas": {
        "coords": [4.0201022, 9.761481600000002],
        "type": "clinic",
        "arrondissement": "Douala III",
    },

    # ── PHARMACIES ────────────────────────────────────────────────────────────
    "Pharmacie de la Jouvence": {
        "coords": [4.0507716, 9.6982657],
        "type": "pharmacy",
        "arrondissement": "Douala I",
    },
    "Pharmacie des Hôpitaux": {
        "coords": [4.0488485999999995, 9.7012188],
        "type": "pharmacy",
        "arrondissement": "Douala I",
    },
    "Pharmacie du Centre Akwa": {
        "coords": [4.054257, 9.6981516],
        "type": "pharmacy",
        "arrondissement": "Douala I",
    },
    "Pharmacie de Makepe": {
        "coords": [4.0848423, 9.755203],
        "type": "pharmacy",
        "arrondissement": "Douala V",
    },
    "Pharmacie de Bonamoussadi": {
        "coords": [4.0868475, 9.7354947],
        "type": "pharmacy",
        "arrondissement": "Douala V",
    },
    "Pharmacie Carrefour PK11": {
        "coords": [4.0201022, 9.761481600000002],
        "type": "pharmacy",
        "arrondissement": "Douala III",
    },
    "Pharmacie de Logpom": {
        "coords": [4.0828082, 9.770474499999999],
        "type": "pharmacy",
        "arrondissement": "Douala V",
    },

    # ── LABS ──────────────────────────────────────────────────────────────────
    "Centre Pasteur Douala": {
        "coords": [4.0296273, 9.6972974],
        "type": "lab",
        "arrondissement": "Douala I",
    },
    "Douala Labo": {
        "coords": [4.0483109, 9.6960411],
        "type": "lab",
        "arrondissement": "Douala I",
    },
    "Laboratoire Drouot": {
        "coords": [4.0531406, 9.7029552],
        "type": "lab",
        "arrondissement": "Douala I",
    },
    "Laboratoire Biodiagnostics": {
        "coords": [4.0593063, 9.710325899999999],
        "type": "lab",
        "arrondissement": "Douala II",
    },
    "Laboratoire du Rail": {
        "coords": [4.0266573999999995, 9.7046647],
        "type": "lab",
        "arrondissement": "Douala I",
    },
    "Laboratoire Meka": {
        "coords": [4.0891849, 9.7428407],
        "type": "lab",
        "arrondissement": "Douala V",
    },
    "Biomedicam": {
        "coords": [4.0277986, 9.6980726],
        "type": "lab",
        "arrondissement": "Douala I",
    },
}

# ─── Road edges (approximate travel time in minutes) ─────────────────────────
DOUALA_EDGES = [
    # Depot connections
    ("Dépôt Central Akwa",          "Hôpital Laquintinie",                    4),
    ("Dépôt Central Akwa",          "Clinique du Gros Chêne",                 3),
    ("Dépôt Central Akwa",          "Pharmacie de la Jouvence",               3),
    ("Dépôt Central Akwa",          "Pharmacie des Hôpitaux",                 4),
    ("Dépôt Central Akwa",          "Pharmacie du Centre Akwa",               4),
    ("Dépôt Central Akwa",          "Laboratoire Drouot",                     5),
    ("Dépôt Central Akwa",          "Douala Labo",                            5),

    # Akwa cluster
    ("Hôpital Laquintinie",         "Pharmacie des Hôpitaux",                 2),
    ("Hôpital Laquintinie",         "Laboratoire Drouot",                     3),
    ("Hôpital Laquintinie",         "Mboppi Baptist Hospital",                6),
    ("Clinique du Gros Chêne",      "Pharmacie de la Jouvence",               2),
    ("Clinique du Gros Chêne",      "Hôpital Ad Lucem Bali",                  7),
    ("Douala Labo",                 "Biomedicam",                             4),
    ("Douala Labo",                 "Centre Pasteur Douala",                  5),
    ("Biomedicam",                  "Centre Pasteur Douala",                  3),
    ("Biomedicam",                  "Polyclinique Idimed",                    4),
    ("Biomedicam",                  "Hôpital Ad Lucem Bali",                  5),
    ("Pharmacie du Centre Akwa",    "Laboratoire Drouot",                     3),

    # Bonanjo / Garnison
    ("Hôpital Ad Lucem Bali",       "Hôpital Garnison Militaire",             5),
    ("Hôpital Ad Lucem Bali",       "Polyclinique Bonanjo",                   4),
    ("Hôpital Garnison Militaire",  "Polyclinique Bonanjo",                   3),
    ("Polyclinique Idimed",         "Hôpital District New Bell",              5),
    ("Polyclinique Idimed",         "Laboratoire du Rail",                    3),
    ("Laboratoire du Rail",         "Hôpital District New Bell",              4),

    # Akwa → Deido / Bonassama
    ("Mboppi Baptist Hospital",     "Hôpital District Deido",                 7),
    ("Mboppi Baptist Hospital",     "Laboratoire Biodiagnostics",             6),
    ("Hôpital District Deido",      "Hôpital District Bonassama",            10),
    ("Hôpital District Deido",      "Laboratoire Biodiagnostics",             4),

    # Central → East
    ("Hôpital Laquintinie",         "Hôpital Protestant Cité SIC",           10),
    ("Hôpital Protestant Cité SIC", "Hôpital District Logbaba",              12),
    ("Hôpital Protestant Cité SIC", "Hôpital District Cité des Palmiers",     8),
    ("Hôpital District Logbaba",    "Clinique Saint Nicolas",                 8),
    ("Hôpital District Logbaba",    "Pharmacie Carrefour PK11",               6),
    ("Hôpital District Cité des Palmiers", "General Hospital of Douala",      5),
    ("Hôpital District Cité des Palmiers", "Pharmacie Carrefour PK11",        7),

    # North (Makepe, Bonamoussadi, Logpom, Logbessou)
    ("Hôpital District Deido",      "Clinique Makepe",                       12),
    ("Clinique Makepe",             "Pharmacie de Makepe",                    3),
    ("Clinique Makepe",             "Laboratoire Meka",                       5),
    ("Clinique Makepe",             "Pharmacie de Bonamoussadi",              8),
    ("Clinique Makepe",             "Pharmacie de Logpom",                    6),
    ("Laboratoire Meka",            "Pharmacie de Bonamoussadi",              4),
    ("Pharmacie de Logpom",         "Ad Lucem Hospital Logbessou",            7),
    ("General Hospital of Douala",  "Ad Lucem Hospital Logbessou",           10),
    ("General Hospital of Douala",  "Clinique Makepe",                        8),
]


class Graph:
    def __init__(self):
        self.nodes = {}
        self.coordinates = {}
        self.metadata = {}
        self.blocked_edges = set()
        self.delayed_edges = {}

    def add_node(self, name, coords, meta=None):
        if name not in self.nodes:
            self.nodes[name] = []
        self.coordinates[name] = coords
        if meta:
            self.metadata[name] = meta

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

    def unblock_road(self, from_node, to_node):
        self.blocked_edges.discard((from_node, to_node))
        self.blocked_edges.discard((to_node, from_node))

    def add_delay(self, from_node, to_node, extra_time):
        self.delayed_edges[(from_node, to_node)] = extra_time
        self.delayed_edges[(to_node, from_node)] = extra_time

    def dijkstra(self, start, end):
        if start not in self.nodes or end not in self.nodes:
            return None

        queue = [(0, start, [])]
        visited = set()

        while queue:
            cost, node, path = heapq.heappop(queue)

            if node in visited:
                continue
            visited.add(node)
            path = path + [node]

            if node == end:
                return {
                    "path": path,
                    "cost": cost,
                    "coords": [
                        self.coordinates[n]
                        for n in path
                        if n in self.coordinates
                    ],
                }

            for neighbor, weight in self.nodes.get(node, []):
                if (node, neighbor) in self.blocked_edges:
                    continue
                delay = self.delayed_edges.get((node, neighbor), 0)
                if neighbor not in visited:
                    heapq.heappush(
                        queue, (cost + weight + delay, neighbor, path)
                    )

        return None