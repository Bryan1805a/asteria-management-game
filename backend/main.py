from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import psycopg2
from psycopg2.extras import RealDictCursor
import asyncio
import json
from decimal import Decimal

app = FastAPI(title="Asteria Station API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:3000", "http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_HOST = "localhost"
DB_NAME = "asteria_db"
DB_USER = "postgres"
DB_PASSWORD = "Buungoc010825!"

def get_db_connection():
    return psycopg2.connect(host=DB_HOST, database=DB_NAME, user=DB_USER, password=DB_PASSWORD)

def serialize_db_row(row):
    return {k: float(v) if isinstance(v, Decimal) else v for k, v in row.items()}

# NEW WEBSOCKET ENDPOINT
@app.websocket("/ws/inventory")
async def websocket_inventory(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            # Open database connection
            conn = get_db_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            # THE GAME TICK: Mine 5 Iron and 2 Water every cycle
            cursor.execute("""
                UPDATE station_inventory 
                SET iron_ore = iron_ore + 5, water = water + 2 
                WHERE player_id = (SELECT id FROM players WHERE username = 'Administrator_Bryan')
                RETURNING credits, iron_ore, water;
            """)
            updated_inventory = cursor.fetchone()
            conn.commit()
            
            # Grab the username to send back as well
            updated_inventory['username'] = 'Administrator_Bryan'
            
            cursor.close()
            conn.close()

            # Push the new data directly to the Next.js frontend
            await websocket.send_text(json.dumps(serialize_db_row(updated_inventory)))
            
            await asyncio.sleep(3)
            
    except WebSocketDisconnect:
        print("Commander disconnected from server.")