class Request:
    def __init__(self, facility, medicine, priority):
        self.facility = facility
        self.medicine = medicine
        self.priority = priority

    def __repr__(self):
        return f"{self.facility} needs {self.medicine} (priority {self.priority})"