import heapq

class PriorityQueue:
    def __init__(self):
        self.queue   = []
        self.counter = 0

    def add_request(self, request):
        # One entry per order — quantity is stored inside the Request object
        heapq.heappush(self.queue, (-request.priority, self.counter, request))
        self.counter += 1

    def get_next(self):
        if self.queue:
            return heapq.heappop(self.queue)[2]
        return None

    def cancel(self, index: int) -> bool:
        """Remove request at position `index` in priority order."""
        sorted_items = sorted(self.queue, key=lambda x: (-x[0], x[1]))
        if index < 0 or index >= len(sorted_items):
            return False
        self.queue.remove(sorted_items[index])
        heapq.heapify(self.queue)
        return True

    def list_requests(self) -> list:
        """Return all pending requests sorted by priority (highest first)."""
        sorted_items = sorted(self.queue, key=lambda x: (-x[0], x[1]))
        return [
            {
                "index":    i,
                "facility": item[2].facility,
                "medicine": item[2].medicine,
                "priority": item[2].priority,
                "quantity": item[2].quantity,
            }
            for i, item in enumerate(sorted_items)
        ]

    def size(self):
        return len(self.queue)

    def total_units(self):
        return sum(item[2].quantity for item in self.queue)

    def is_empty(self):
        return len(self.queue) == 0

    def peek(self):
        if self.queue:
            return min(self.queue, key=lambda x: (-x[0], x[1]))[2]
        return None