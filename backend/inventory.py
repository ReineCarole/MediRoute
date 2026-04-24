class Inventory:
    def __init__(self):
        # { location: { medicine: quantity } }
        self.data = {}

    def add_stock(self, location, medicine, quantity):
        if location not in self.data:
            self.data[location] = {}
        
        if medicine not in self.data[location]:
            self.data[location][medicine] = 0
        
        self.data[location][medicine] += quantity

    def check_stock(self, location, medicine):
        return self.data.get(location, {}).get(medicine, 0)

    def reduce_stock(self, location, medicine, quantity):
        if self.check_stock(location, medicine) >= quantity:
            self.data[location][medicine] -= quantity
            return True
        return False