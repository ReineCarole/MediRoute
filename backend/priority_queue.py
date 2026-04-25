import heapq

class PriorityQueue:
    def __init__(self):
        self.queue   = []
        self.counter = 0       # tie-breaker: ensures no two entries are ever compared directly

    def add_request(self, request):
        # (-priority, counter, request)
        # negative priority because heapq is a min-heap — we want highest priority first
        # counter guarantees unique ordering when priorities are equal
        heapq.heappush(self.queue, (-request.priority, self.counter, request))
        self.counter += 1

    def get_next(self):
        if self.queue:
            return heapq.heappop(self.queue)[2]   # [2] = the Request object
        return None

    def size(self):
        return len(self.queue)

    def peek(self):
        """Return the next request without removing it."""
        if self.queue:
            return self.queue[0][2]
        return None

    def is_empty(self):
        return len(self.queue) == 0