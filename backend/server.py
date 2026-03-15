from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, WebSocket, WebSocketDisconnect
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import httpx
import bcrypt
from datetime import datetime, timezone, timedelta
from pathlib import Path
from pydantic import BaseModel
from typing import List, Optional

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class UserCreate(BaseModel):
    email: str
    password: str
    name: str

class UserLogin(BaseModel):
    email: str
    password: str

class BoardCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    color: Optional[str] = "#4F46E5"

class BoardUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None

class ListCreate(BaseModel):
    title: str
    board_id: str

class ListUpdate(BaseModel):
    title: Optional[str] = None

class ListReorder(BaseModel):
    board_id: str
    list_ids: List[str]

class CardCreate(BaseModel):
    title: str
    list_id: str
    description: Optional[str] = ""
    priority: Optional[str] = "medium"
    due_date: Optional[str] = None
    tags: Optional[List[str]] = []

class CardUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[str] = None
    tags: Optional[List[str]] = None
    list_id: Optional[str] = None
    position: Optional[int] = None

class CardMove(BaseModel):
    card_id: str
    source_list_id: str
    target_list_id: str
    new_position: int

class ChecklistItemCreate(BaseModel):
    text: str

class ChecklistItemUpdate(BaseModel):
    text: Optional[str] = None
    completed: Optional[bool] = None

class CommentCreate(BaseModel):
    card_id: str
    text: str

class ProfileUpdate(BaseModel):
    name: Optional[str] = None

# ==================== AUTH HELPERS ====================

async def get_current_user(request: Request) -> dict:
    session_token = request.cookies.get("session_token")
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header[7:]
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")

    expires_at = session["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")

    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

async def create_session(user_id: str):
    session_token = f"session_{uuid.uuid4().hex}"
    await db.user_sessions.insert_one({
        "session_token": session_token,
        "user_id": user_id,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    return session_token

def set_session_cookie(response: Response, session_token: str):
    response.set_cookie(
        key="session_token",
        value=session_token,
        path="/",
        secure=True,
        httponly=True,
        samesite="none",
        max_age=7 * 24 * 60 * 60
    )

# ==================== WEBSOCKET MANAGER ====================

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict = {}

    async def connect(self, websocket: WebSocket, board_id: str):
        await websocket.accept()
        if board_id not in self.active_connections:
            self.active_connections[board_id] = []
        self.active_connections[board_id].append(websocket)

    def disconnect(self, websocket: WebSocket, board_id: str):
        if board_id in self.active_connections:
            if websocket in self.active_connections[board_id]:
                self.active_connections[board_id].remove(websocket)
            if not self.active_connections[board_id]:
                del self.active_connections[board_id]

    async def broadcast(self, board_id: str, message: dict):
        if board_id in self.active_connections:
            for conn in self.active_connections[board_id][:]:
                try:
                    await conn.send_json(message)
                except Exception:
                    pass

ws_manager = ConnectionManager()

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register")
async def register(data: UserCreate, response: Response):
    existing = await db.users.find_one({"email": data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_id = f"user_{uuid.uuid4().hex[:12]}"
    hashed = bcrypt.hashpw(data.password.encode(), bcrypt.gensalt()).decode()

    user_doc = {
        "user_id": user_id,
        "email": data.email,
        "name": data.name,
        "password_hash": hashed,
        "picture": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)

    session_token = await create_session(user_id)
    set_session_cookie(response, session_token)

    return {"user_id": user_id, "email": data.email, "name": data.name, "picture": None, "created_at": user_doc["created_at"]}

@api_router.post("/auth/login")
async def login(data: UserLogin, response: Response):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="Please use Google login for this account")
    if not bcrypt.checkpw(data.password.encode(), user["password_hash"].encode()):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    session_token = await create_session(user["user_id"])
    set_session_cookie(response, session_token)

    return {"user_id": user["user_id"], "email": user["email"], "name": user["name"], "picture": user.get("picture"), "created_at": user["created_at"]}

@api_router.get("/auth/session")
async def exchange_session(session_id: str, response: Response):
    async with httpx.AsyncClient() as http_client:
        resp = await http_client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session")

    data = resp.json()
    existing = await db.users.find_one({"email": data["email"]}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": data["name"], "picture": data.get("picture")}}
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": data["email"],
            "name": data["name"],
            "picture": data.get("picture"),
            "password_hash": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        })

    session_token = await create_session(user_id)
    set_session_cookie(response, session_token)

    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    return user

@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    return {"user_id": user["user_id"], "email": user["email"], "name": user["name"], "picture": user.get("picture"), "created_at": user["created_at"]}

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    response.delete_cookie("session_token", path="/")
    return {"message": "Logged out"}

# ==================== BOARD ROUTES ====================

@api_router.get("/boards")
async def get_boards(request: Request):
    user = await get_current_user(request)
    boards = await db.boards.find(
        {"$or": [{"user_id": user["user_id"]}, {"collaborators": user["user_id"]}]},
        {"_id": 0}
    ).to_list(100)

    for board in boards:
        lists = await db.lists.find({"board_id": board["board_id"]}, {"_id": 0, "list_id": 1}).to_list(100)
        list_ids = [l["list_id"] for l in lists]
        total_cards = await db.cards.count_documents({"list_id": {"$in": list_ids}})
        board["total_cards"] = total_cards
        board["list_count"] = len(lists)
    return boards

@api_router.post("/boards/from-template")
async def create_board_from_template(request: Request):
    user = await get_current_user(request)
    body = await request.json()
    template_id = body.get("template_id")
    custom_title = body.get("title")

    template = next((t for t in BOARD_TEMPLATES if t["template_id"] == template_id), None)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    board_id = f"board_{uuid.uuid4().hex[:12]}"
    board_doc = {
        "board_id": board_id,
        "title": custom_title or template["name"],
        "description": template["description"],
        "color": template["color"],
        "user_id": user["user_id"],
        "collaborators": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.boards.insert_one(board_doc)

    for i, lst_tmpl in enumerate(template["lists"]):
        list_id = f"list_{uuid.uuid4().hex[:12]}"
        await db.lists.insert_one({
            "list_id": list_id, "title": lst_tmpl["title"], "board_id": board_id,
            "position": i, "created_at": datetime.now(timezone.utc).isoformat()
        })
        for j, card_tmpl in enumerate(lst_tmpl.get("cards", [])):
            card_id = f"card_{uuid.uuid4().hex[:12]}"
            checklists = []
            for cl in card_tmpl.get("checklists", []):
                checklists.append({"item_id": f"check_{uuid.uuid4().hex[:12]}", "text": cl["text"], "completed": cl["completed"]})
            await db.cards.insert_one({
                "card_id": card_id, "title": card_tmpl["title"], "description": "",
                "list_id": list_id, "position": j,
                "priority": card_tmpl.get("priority", "medium"),
                "due_date": None, "tags": card_tmpl.get("tags", []),
                "checklists": checklists, "created_by": user["user_id"],
                "created_at": datetime.now(timezone.utc).isoformat()
            })

    board_doc.pop("_id", None)
    return board_doc

@api_router.post("/boards")
async def create_board(data: BoardCreate, request: Request):
    user = await get_current_user(request)
    board_id = f"board_{uuid.uuid4().hex[:12]}"

    board_doc = {
        "board_id": board_id,
        "title": data.title,
        "description": data.description or "",
        "color": data.color or "#4F46E5",
        "user_id": user["user_id"],
        "collaborators": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.boards.insert_one(board_doc)

    default_lists = ["A faire", "En cours", "Termine"]
    for i, title in enumerate(default_lists):
        list_id = f"list_{uuid.uuid4().hex[:12]}"
        await db.lists.insert_one({
            "list_id": list_id, "title": title, "board_id": board_id,
            "position": i, "created_at": datetime.now(timezone.utc).isoformat()
        })

    board_doc.pop("_id", None)
    return board_doc

@api_router.get("/boards/{board_id}")
async def get_board(board_id: str, request: Request):
    user = await get_current_user(request)
    board = await db.boards.find_one({"board_id": board_id}, {"_id": 0})
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    if board["user_id"] != user["user_id"] and user["user_id"] not in board.get("collaborators", []):
        raise HTTPException(status_code=403, detail="Access denied")

    lists = await db.lists.find({"board_id": board_id}, {"_id": 0}).sort("position", 1).to_list(100)
    for lst in lists:
        cards = await db.cards.find({"list_id": lst["list_id"]}, {"_id": 0}).sort("position", 1).to_list(1000)
        lst["cards"] = cards
    board["lists"] = lists
    return board

@api_router.put("/boards/{board_id}")
async def update_board(board_id: str, data: BoardUpdate, request: Request):
    user = await get_current_user(request)
    board = await db.boards.find_one({"board_id": board_id}, {"_id": 0})
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    if board["user_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    update = {}
    if data.title is not None: update["title"] = data.title
    if data.description is not None: update["description"] = data.description
    if data.color is not None: update["color"] = data.color

    if update:
        await db.boards.update_one({"board_id": board_id}, {"$set": update})
    updated = await db.boards.find_one({"board_id": board_id}, {"_id": 0})
    await ws_manager.broadcast(board_id, {"type": "board_updated", "board_id": board_id})
    return updated

@api_router.delete("/boards/{board_id}")
async def delete_board(board_id: str, request: Request):
    user = await get_current_user(request)
    board = await db.boards.find_one({"board_id": board_id}, {"_id": 0})
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    if board["user_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    lists = await db.lists.find({"board_id": board_id}, {"_id": 0}).to_list(100)
    for lst in lists:
        await db.cards.delete_many({"list_id": lst["list_id"]})
    await db.lists.delete_many({"board_id": board_id})
    await db.boards.delete_one({"board_id": board_id})
    return {"message": "Board deleted"}

# ==================== LIST ROUTES ====================

@api_router.put("/lists/reorder")
async def reorder_lists(data: ListReorder, request: Request):
    await get_current_user(request)
    for i, list_id in enumerate(data.list_ids):
        await db.lists.update_one({"list_id": list_id}, {"$set": {"position": i}})
    await ws_manager.broadcast(data.board_id, {"type": "lists_reordered", "board_id": data.board_id})
    return {"message": "Lists reordered"}

@api_router.post("/lists")
async def create_list(data: ListCreate, request: Request):
    await get_current_user(request)
    board = await db.boards.find_one({"board_id": data.board_id}, {"_id": 0})
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")

    last_list = await db.lists.find({"board_id": data.board_id}).sort("position", -1).to_list(1)
    position = (last_list[0]["position"] + 1) if last_list else 0

    list_id = f"list_{uuid.uuid4().hex[:12]}"
    list_doc = {
        "list_id": list_id, "title": data.title, "board_id": data.board_id,
        "position": position, "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.lists.insert_one(list_doc)
    list_doc.pop("_id", None)
    await ws_manager.broadcast(data.board_id, {"type": "list_created", "board_id": data.board_id})
    return list_doc

@api_router.put("/lists/{list_id}")
async def update_list(list_id: str, data: ListUpdate, request: Request):
    await get_current_user(request)
    lst = await db.lists.find_one({"list_id": list_id}, {"_id": 0})
    if not lst:
        raise HTTPException(status_code=404, detail="List not found")

    update = {}
    if data.title is not None: update["title"] = data.title
    if update:
        await db.lists.update_one({"list_id": list_id}, {"$set": update})

    updated = await db.lists.find_one({"list_id": list_id}, {"_id": 0})
    await ws_manager.broadcast(lst["board_id"], {"type": "list_updated", "board_id": lst["board_id"]})
    return updated

@api_router.delete("/lists/{list_id}")
async def delete_list(list_id: str, request: Request):
    await get_current_user(request)
    lst = await db.lists.find_one({"list_id": list_id}, {"_id": 0})
    if not lst:
        raise HTTPException(status_code=404, detail="List not found")

    await db.cards.delete_many({"list_id": list_id})
    await db.lists.delete_one({"list_id": list_id})
    await ws_manager.broadcast(lst["board_id"], {"type": "list_deleted", "board_id": lst["board_id"]})
    return {"message": "List deleted"}

# ==================== CARD ROUTES ====================

@api_router.put("/cards/move")
async def move_card(data: CardMove, request: Request):
    await get_current_user(request)
    card = await db.cards.find_one({"card_id": data.card_id}, {"_id": 0})
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    await db.cards.update_one(
        {"card_id": data.card_id},
        {"$set": {"list_id": data.target_list_id, "position": data.new_position}}
    )

    target_cards = await db.cards.find({"list_id": data.target_list_id}).sort("position", 1).to_list(1000)
    for i, c in enumerate(target_cards):
        await db.cards.update_one({"card_id": c["card_id"]}, {"$set": {"position": i}})

    if data.source_list_id != data.target_list_id:
        source_cards = await db.cards.find({"list_id": data.source_list_id}).sort("position", 1).to_list(1000)
        for i, c in enumerate(source_cards):
            await db.cards.update_one({"card_id": c["card_id"]}, {"$set": {"position": i}})

    lst = await db.lists.find_one({"list_id": data.target_list_id}, {"_id": 0})
    if lst:
        await ws_manager.broadcast(lst["board_id"], {"type": "card_moved", "board_id": lst["board_id"]})
    return {"message": "Card moved"}

@api_router.post("/cards")
async def create_card(data: CardCreate, request: Request):
    user = await get_current_user(request)
    lst = await db.lists.find_one({"list_id": data.list_id}, {"_id": 0})
    if not lst:
        raise HTTPException(status_code=404, detail="List not found")

    last_card = await db.cards.find({"list_id": data.list_id}).sort("position", -1).to_list(1)
    position = (last_card[0]["position"] + 1) if last_card else 0

    card_id = f"card_{uuid.uuid4().hex[:12]}"
    card_doc = {
        "card_id": card_id, "title": data.title, "description": data.description or "",
        "list_id": data.list_id, "position": position,
        "priority": data.priority or "medium", "due_date": data.due_date,
        "tags": data.tags or [], "checklists": [],
        "created_by": user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.cards.insert_one(card_doc)
    card_doc.pop("_id", None)
    await ws_manager.broadcast(lst["board_id"], {"type": "card_created", "board_id": lst["board_id"]})
    return card_doc

@api_router.get("/cards/{card_id}")
async def get_card(card_id: str, request: Request):
    await get_current_user(request)
    card = await db.cards.find_one({"card_id": card_id}, {"_id": 0})
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    comments = await db.comments.find({"card_id": card_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    for comment in comments:
        cu = await db.users.find_one({"user_id": comment["user_id"]}, {"_id": 0, "password_hash": 0})
        comment["user"] = cu
    card["comments"] = comments
    return card

@api_router.put("/cards/{card_id}")
async def update_card(card_id: str, data: CardUpdate, request: Request):
    await get_current_user(request)
    card = await db.cards.find_one({"card_id": card_id}, {"_id": 0})
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    update = {}
    if data.title is not None: update["title"] = data.title
    if data.description is not None: update["description"] = data.description
    if data.priority is not None: update["priority"] = data.priority
    if data.due_date is not None: update["due_date"] = data.due_date
    if data.tags is not None: update["tags"] = data.tags
    if data.list_id is not None: update["list_id"] = data.list_id
    if data.position is not None: update["position"] = data.position

    if update:
        await db.cards.update_one({"card_id": card_id}, {"$set": update})
    updated = await db.cards.find_one({"card_id": card_id}, {"_id": 0})

    lst = await db.lists.find_one({"list_id": card["list_id"]}, {"_id": 0})
    if lst:
        await ws_manager.broadcast(lst["board_id"], {"type": "card_updated", "board_id": lst["board_id"]})
    return updated

@api_router.delete("/cards/{card_id}")
async def delete_card(card_id: str, request: Request):
    await get_current_user(request)
    card = await db.cards.find_one({"card_id": card_id}, {"_id": 0})
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    lst = await db.lists.find_one({"list_id": card["list_id"]}, {"_id": 0})
    await db.comments.delete_many({"card_id": card_id})
    await db.cards.delete_one({"card_id": card_id})

    if lst:
        await ws_manager.broadcast(lst["board_id"], {"type": "card_deleted", "board_id": lst["board_id"]})
    return {"message": "Card deleted"}

# ==================== CHECKLIST ROUTES ====================

@api_router.post("/cards/{card_id}/checklist")
async def add_checklist_item(card_id: str, data: ChecklistItemCreate, request: Request):
    await get_current_user(request)
    card = await db.cards.find_one({"card_id": card_id}, {"_id": 0})
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    item_id = f"check_{uuid.uuid4().hex[:12]}"
    item = {"item_id": item_id, "text": data.text, "completed": False}
    await db.cards.update_one({"card_id": card_id}, {"$push": {"checklists": item}})

    lst = await db.lists.find_one({"list_id": card["list_id"]}, {"_id": 0})
    if lst:
        await ws_manager.broadcast(lst["board_id"], {"type": "card_updated", "board_id": lst["board_id"]})
    return item

@api_router.put("/cards/{card_id}/checklist/{item_id}")
async def update_checklist_item(card_id: str, item_id: str, data: ChecklistItemUpdate, request: Request):
    await get_current_user(request)
    update = {}
    if data.text is not None: update["checklists.$.text"] = data.text
    if data.completed is not None: update["checklists.$.completed"] = data.completed

    await db.cards.update_one(
        {"card_id": card_id, "checklists.item_id": item_id},
        {"$set": update}
    )

    card = await db.cards.find_one({"card_id": card_id}, {"_id": 0})
    if card:
        lst = await db.lists.find_one({"list_id": card["list_id"]}, {"_id": 0})
        if lst:
            await ws_manager.broadcast(lst["board_id"], {"type": "card_updated", "board_id": lst["board_id"]})
    return {"message": "Updated"}

@api_router.delete("/cards/{card_id}/checklist/{item_id}")
async def delete_checklist_item(card_id: str, item_id: str, request: Request):
    await get_current_user(request)
    await db.cards.update_one({"card_id": card_id}, {"$pull": {"checklists": {"item_id": item_id}}})
    return {"message": "Deleted"}

# ==================== COMMENT ROUTES ====================

@api_router.get("/comments/{card_id}")
async def get_comments(card_id: str, request: Request):
    await get_current_user(request)
    comments = await db.comments.find({"card_id": card_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    for comment in comments:
        cu = await db.users.find_one({"user_id": comment["user_id"]}, {"_id": 0, "password_hash": 0})
        comment["user"] = cu
    return comments

@api_router.post("/comments")
async def create_comment(data: CommentCreate, request: Request):
    user = await get_current_user(request)
    comment_id = f"comment_{uuid.uuid4().hex[:12]}"
    comment_doc = {
        "comment_id": comment_id, "card_id": data.card_id,
        "user_id": user["user_id"], "text": data.text,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.comments.insert_one(comment_doc)
    comment_doc.pop("_id", None)
    comment_doc["user"] = {"user_id": user["user_id"], "name": user["name"], "email": user["email"], "picture": user.get("picture")}

    card = await db.cards.find_one({"card_id": data.card_id}, {"_id": 0})
    if card:
        lst = await db.lists.find_one({"list_id": card["list_id"]}, {"_id": 0})
        if lst:
            await ws_manager.broadcast(lst["board_id"], {"type": "comment_added", "board_id": lst["board_id"]})
    return comment_doc

# ==================== TEMPLATES ====================

BOARD_TEMPLATES = [
    {
        "template_id": "school_project",
        "name": "Projet Scolaire",
        "description": "Gerez un projet scolaire du debut a la fin",
        "color": "#4F46E5",
        "icon": "graduation-cap",
        "lists": [
            {"title": "Recherche", "cards": [
                {"title": "Definir le sujet", "priority": "high", "tags": ["Recherche"], "checklists": [{"text": "Choisir le theme", "completed": False}, {"text": "Valider avec le prof", "completed": False}]},
                {"title": "Sources bibliographiques", "priority": "medium", "tags": ["Recherche"]},
            ]},
            {"title": "Redaction", "cards": [
                {"title": "Plan detaille", "priority": "high", "tags": ["Redaction"]},
                {"title": "Introduction", "priority": "medium", "tags": ["Redaction"]},
                {"title": "Developpement", "priority": "medium", "tags": ["Redaction"]},
            ]},
            {"title": "Revision", "cards": [
                {"title": "Relecture orthographe", "priority": "medium", "tags": ["Revision"]},
            ]},
            {"title": "Rendu", "cards": []},
        ],
    },
    {
        "template_id": "exam_revision",
        "name": "Revisions Examens",
        "description": "Planifiez et suivez vos revisions",
        "color": "#10B981",
        "icon": "book-open",
        "lists": [
            {"title": "A reviser", "cards": [
                {"title": "Chapitre 1 - Bases", "priority": "high", "tags": ["Maths"], "checklists": [{"text": "Lire le cours", "completed": False}, {"text": "Faire les exercices", "completed": False}, {"text": "QCM entrainement", "completed": False}]},
                {"title": "Chapitre 2 - Avance", "priority": "medium", "tags": ["Maths"]},
                {"title": "Dates cles", "priority": "high", "tags": ["Histoire"]},
            ]},
            {"title": "En cours de revision", "cards": []},
            {"title": "Maitrise", "cards": []},
        ],
    },
    {
        "template_id": "semester_plan",
        "name": "Planning Semestre",
        "description": "Organisez votre semestre entier",
        "color": "#F59E0B",
        "icon": "calendar",
        "lists": [
            {"title": "Ce mois-ci", "cards": [
                {"title": "Devoir de maths", "priority": "urgent", "tags": ["Maths", "Devoir"]},
                {"title": "Expose histoire", "priority": "high", "tags": ["Histoire", "Projet"]},
            ]},
            {"title": "Mois prochain", "cards": [
                {"title": "Examen partiel", "priority": "high", "tags": ["Examen"]},
            ]},
            {"title": "Plus tard", "cards": []},
            {"title": "Termine", "cards": []},
        ],
    },
    {
        "template_id": "agile_sprint",
        "name": "Sprint Agile",
        "description": "Pour les projets informatiques en equipe",
        "color": "#8B5CF6",
        "icon": "rocket",
        "lists": [
            {"title": "Backlog", "cards": [
                {"title": "User story: Connexion", "priority": "high", "tags": ["Feature"], "checklists": [{"text": "Maquette UI", "completed": False}, {"text": "API backend", "completed": False}, {"text": "Tests", "completed": False}]},
                {"title": "User story: Dashboard", "priority": "medium", "tags": ["Feature"]},
                {"title": "Bug: Responsive menu", "priority": "urgent", "tags": ["Bug"]},
            ]},
            {"title": "Sprint en cours", "cards": []},
            {"title": "En review", "cards": []},
            {"title": "Done", "cards": []},
        ],
    },
    {
        "template_id": "reading_notes",
        "name": "Lecture & Recherche",
        "description": "Suivez vos lectures et prises de notes",
        "color": "#EC4899",
        "icon": "book",
        "lists": [
            {"title": "A lire", "cards": [
                {"title": "Article scientifique X", "priority": "medium", "tags": ["Article"]},
                {"title": "Livre: Introduction a...", "priority": "low", "tags": ["Livre"]},
            ]},
            {"title": "En lecture", "cards": []},
            {"title": "Notes prises", "cards": []},
            {"title": "Termine", "cards": []},
        ],
    },
]

@api_router.get("/templates")
async def get_templates():
    return BOARD_TEMPLATES

# ==================== STATS ====================

@api_router.get("/stats")
async def get_stats(request: Request):
    user = await get_current_user(request)
    user_id = user["user_id"]

    boards = await db.boards.find(
        {"$or": [{"user_id": user_id}, {"collaborators": user_id}]}, {"_id": 0}
    ).to_list(100)
    board_ids = [b["board_id"] for b in boards]

    all_lists = await db.lists.find({"board_id": {"$in": board_ids}}, {"_id": 0}).to_list(1000)
    list_ids = [l["list_id"] for l in all_lists]

    total_cards = await db.cards.count_documents({"list_id": {"$in": list_ids}})

    done_list_ids = [l["list_id"] for l in all_lists if any(w in l["title"].lower() for w in ["termine", "done", "maitrise", "rendu"])]
    completed_cards = await db.cards.count_documents({"list_id": {"$in": done_list_ids}}) if done_list_ids else 0

    now = datetime.now(timezone.utc)
    week_later = (now + timedelta(days=7)).isoformat()
    now_iso = now.isoformat()
    upcoming = await db.cards.find(
        {"list_id": {"$in": list_ids}, "due_date": {"$ne": None, "$gte": now_iso, "$lte": week_later}},
        {"_id": 0}
    ).to_list(50)

    overdue = await db.cards.find(
        {"list_id": {"$in": list_ids}, "due_date": {"$ne": None, "$lt": now_iso}},
        {"_id": 0}
    ).to_list(50)
    overdue = [c for c in overdue if c["list_id"] not in done_list_ids]

    all_cards = await db.cards.find({"list_id": {"$in": list_ids}}, {"_id": 0, "tags": 1}).to_list(5000)
    tag_counts = {}
    for c in all_cards:
        for tag in c.get("tags", []):
            tag_counts[tag] = tag_counts.get(tag, 0) + 1
    top_tags = sorted(tag_counts.items(), key=lambda x: -x[1])[:8]

    all_checks = await db.cards.find({"list_id": {"$in": list_ids}, "checklists": {"$ne": []}}, {"_id": 0, "checklists": 1}).to_list(5000)
    total_items = sum(len(c.get("checklists", [])) for c in all_checks)
    done_items = sum(sum(1 for i in c.get("checklists", []) if i.get("completed")) for c in all_checks)

    return {
        "total_boards": len(boards),
        "total_cards": total_cards,
        "completed_cards": completed_cards,
        "completion_rate": round((completed_cards / total_cards * 100) if total_cards else 0),
        "upcoming_deadlines": len(upcoming),
        "overdue_cards": len(overdue),
        "overdue_list": overdue[:5],
        "upcoming_list": upcoming[:5],
        "top_tags": top_tags,
        "checklist_total": total_items,
        "checklist_done": done_items,
    }

# ==================== PROFILE ====================

@api_router.get("/profile")
async def get_profile(request: Request):
    user = await get_current_user(request)
    return {"user_id": user["user_id"], "email": user["email"], "name": user["name"], "picture": user.get("picture"), "created_at": user["created_at"]}

@api_router.put("/profile")
async def update_profile(data: ProfileUpdate, request: Request):
    user = await get_current_user(request)
    update = {}
    if data.name is not None: update["name"] = data.name
    if update:
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": update})
    updated = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0, "password_hash": 0})
    return updated

# ==================== WEBSOCKET ====================

@app.websocket("/api/ws/{board_id}")
async def websocket_endpoint(websocket: WebSocket, board_id: str):
    await ws_manager.connect(websocket, board_id)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, board_id)
    except Exception:
        ws_manager.disconnect(websocket, board_id)

# ==================== SETUP ====================

app.include_router(api_router)

origins = os.environ.get('CORS_ORIGINS', '').split(',')

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()