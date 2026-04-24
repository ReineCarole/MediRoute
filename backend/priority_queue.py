import heapq

class PriorityQueue:
    def __init__(self):
        self.queue = []
    
    def add_request(self, request):
        heapq.heappush(self.queue, (-request.priority, request))
    
    def get_next(self):
        if self.queue:
            return heapq.heappop(self.queue)[1]
        return None