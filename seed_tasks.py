#!/usr/bin/env python3
"""Seed sample tasks. Run: python seed_tasks.py"""
import urllib.request, urllib.error, json, datetime

BASE = "http://localhost:8000"

req = urllib.request.Request(f"{BASE}/api/v1/auth/dev-token", method="POST")
with urllib.request.urlopen(req) as r:
    token = json.loads(r.read())["access_token"]

headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
today = datetime.date.today()

def post(path, body=None):
    data = json.dumps(body or {}).encode()
    req = urllib.request.Request(f"{BASE}{path}", data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        print(f"  ERROR {e.code}: {e.read().decode()}")
        return None

def patch(path, body):
    data = json.dumps(body).encode()
    req = urllib.request.Request(f"{BASE}{path}", data=data, headers=headers, method="PATCH")
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        print(f"  PATCH ERROR {e.code}: {e.read().decode()}")
        return None

TASKS = [
    {"description": "Prepare Q3 investor update deck",               "priority": 1, "due_date": (today+datetime.timedelta(3)).isoformat()},
    {"description": "Review SAP integration proposal from vendor",   "priority": 2, "due_date": (today+datetime.timedelta(5)).isoformat()},
    {"description": "Set up WhatsApp bridge on production server",   "priority": 2, "due_date": (today+datetime.timedelta(7)).isoformat()},
    {"description": "Book flights TLV-Warsaw for partner meeting",   "priority": 1, "due_date": (today+datetime.timedelta(2)).isoformat()},
    {"description": "Follow up with Sarah Levi re contract renewal", "priority": 2, "due_date": (today+datetime.timedelta(4)).isoformat()},
]

IN_PROGRESS = [
    {"description": "Build global AI search across tasks, contacts, WhatsApp", "priority": 1, "due_date": today.isoformat()},
    {"description": "Integrate Outlook email feed via MS Graph",               "priority": 2, "due_date": (today+datetime.timedelta(6)).isoformat()},
    {"description": "Design onboarding flow for new team members",             "priority": 3, "due_date": (today+datetime.timedelta(10)).isoformat()},
]

# Last 10 completed tasks from the project task tracker
DONE = [
    {"description": "1B - Service status panel (sidebar dots)",                     "priority": 2},
    {"description": "1C - Archive panel (sidebar icon)",                            "priority": 3},
    {"description": "2A - Big search bar in centre panel",                          "priority": 2},
    {"description": "2B+2C - Toolbar local clock + weather + world clocks",         "priority": 1},
    {"description": "2D - Critical countdown timer in toolbar",                     "priority": 1},
    {"description": "2B - Add local Israel time + weather to Toolbar (right side)", "priority": 2},
    {"description": "2C - Add world clocks to LeftPanel (Poland, Dubai, USA, India)","priority": 2},
    {"description": "2D - Critical countdown timer in Toolbar centre",              "priority": 1},
    {"description": "Fix - Bigger world clocks + local weather display",            "priority": 3},
    {"description": "Fix - Service panel label + double-click restart",             "priority": 3},
]

print("Seeding To-Do tasks...")
for t in TASKS:
    task = post("/api/v1/tasks", t)
    if task: print(f"  + {task['description'][:60]}")

print("\nSeeding In-Progress tasks...")
for t in IN_PROGRESS:
    task = post("/api/v1/tasks", t)
    if task:
        result = patch(f"/api/v1/tasks/{task['id']}", {"status": "in_progress"})
        mark = "~" if result else "?"
        print(f"  {mark} {task['description'][:60]}")

print("\nSeeding Done tasks (last 10 from project history)...")
for t in DONE:
    task = post("/api/v1/tasks", t)
    if task:
        result = post(f"/api/v1/tasks/{task['id']}/complete")
        mark = "v" if result else "?"
        print(f"  {mark} {task['description'][:60]}")

print("\nDone! Refresh the board.")
