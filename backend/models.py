class Request:
    def __init__(self, facility: str, medicine: str, priority: int, quantity: int = 1):
        self.facility = facility
        self.medicine = medicine
        self.priority = priority
        self.quantity = quantity

    def __repr__(self):
        return f"{self.facility} needs {self.quantity}× {self.medicine} (priority {self.priority})"