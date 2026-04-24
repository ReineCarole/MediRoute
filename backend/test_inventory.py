from inventory import Inventory

inv = Inventory()

inv.add_stock("Akwa Depot", "Oxygen", 10)

print(inv.check_stock("Akwa Depot", "Oxygen"))  # expect 10

inv.reduce_stock("Akwa Depot", "Oxygen", 3)

print(inv.check_stock("Akwa Depot", "Oxygen"))  # expect 7