"""Quick migration: rename 'Zone A - Live Cam' to 'Zone A' in all existing logs."""
import sqlite3

conn = sqlite3.connect("warehouse.db")
c = conn.cursor()
c.execute("UPDATE logs SET location='Zone A' WHERE location='Zone A - Live Cam'")
print(f"Updated {c.rowcount} logs from 'Zone A - Live Cam' to 'Zone A'")
conn.commit()
conn.close()
