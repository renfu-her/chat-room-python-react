# Chat Room Backend API

後端 API 服務，使用 FastAPI 構建，提供聊天室功能，包括用戶認證、好友管理、群組聊天和即時訊息傳遞。

## 專案簡介

本 API 提供以下核心功能：

- **用戶認證**：註冊、登入、登出（Session-based）
- **用戶管理**：用戶列表、個人資料更新、頭像上傳
- **好友管理**：添加/移除好友，Friends 和 Strangers 分類
- **群組管理**：建立、更新、刪除群組，成員管理，拒絕列表
- **訊息功能**：文字訊息、附件上傳（圖片自動轉換為 webp）
- **WebSocket**：即時聊天功能

## 環境設定

### 資料庫

使用 MySQL 資料庫：

- **Host**: localhost
- **Database**: chat-room
- **Username**: root
- **Password**: (空)

確保 MySQL 服務正在運行，並已建立 `chat-room` 資料庫：

```sql
CREATE DATABASE IF NOT EXISTS `chat-room` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 環境變數

複製 `.env.example` 到 `.env` 並設定以下變數：

```env
DATABASE_URL=mysql+pymysql://root@localhost/chat-room
UPLOAD_DIR=uploads
SECRET_KEY=your-secret-key-here-change-in-production
```

## 安裝與啟動

### 使用 uv 安裝依賴

```bash
cd api
uv sync
```

或使用 uv pip：

```bash
cd api
uv pip install -e .
```

### 啟動服務

```bash
cd api
python main.py
```

或使用 uvicorn：

```bash
cd api
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

服務將在 `http://localhost:8000` 啟動。

### API 文檔

啟動後可訪問：

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## API 端點

### 認證相關 (`/api/auth`)

#### `POST /api/auth/register`
註冊新用戶

**Request:**
```json
{
  "name": "User Name",
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "name": "User Name",
    "email": "user@example.com",
    "avatar": "https://...",
    "status": "offline"
  },
  "session_id": "..."
}
```

#### `POST /api/auth/login`
用戶登入

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "name": "User Name",
    "email": "user@example.com",
    "avatar": "https://...",
    "status": "online"
  },
  "session_id": "..."
}
```

#### `POST /api/auth/logout`
登出

#### `GET /api/auth/me`
取得當前用戶資訊

### 用戶相關 (`/api/users`)

#### `GET /api/users`
取得所有用戶列表（用於 Strangers 列表）

#### `GET /api/users/{user_id}`
取得特定用戶資訊

#### `PUT /api/users/me`
更新個人資料

**Request:**
```json
{
  "name": "New Name",
  "email": "newemail@example.com"
}
```

#### `POST /api/users/me/avatar`
上傳頭像（自動轉換為 webp，使用 UUID 檔名）

### 好友相關 (`/api/friends`)

#### `GET /api/friends`
取得好友列表

#### `POST /api/friends/{user_id}`
添加好友（將 Stranger 轉為 Friend）

#### `DELETE /api/friends/{user_id}`
移除好友

### 群組相關 (`/api/groups`)

#### `GET /api/groups`
取得用戶的群組列表

#### `POST /api/groups`
建立群組

**Request:**
```json
{
  "name": "Group Name",
  "member_ids": [2, 3, 4]
}
```

#### `GET /api/groups/{group_id}`
取得群組詳情

#### `PUT /api/groups/{group_id}`
更新群組

#### `DELETE /api/groups/{group_id}`
刪除群組

#### `POST /api/groups/{group_id}/members`
添加成員

#### `DELETE /api/groups/{group_id}/members/{user_id}`
移除成員

#### `POST /api/groups/{group_id}/deny/{user_id}`
拒絕用戶加入

#### `DELETE /api/groups/{group_id}/deny/{user_id}`
取消拒絕

### 訊息相關 (`/api/messages`)

#### `GET /api/messages`
取得訊息列表

**Query Parameters:**
- `chat_type`: `personal` 或 `group`
- `target_id`: 用戶 ID 或群組 ID
- `limit`: 每頁數量（預設 50）
- `offset`: 偏移量（預設 0）

#### `POST /api/messages`
發送文字訊息

**Request:**
```json
{
  "text": "Hello!",
  "recipient_id": 2
}
```

或群組訊息：
```json
{
  "text": "Hello everyone!",
  "group_id": 1
}
```

#### `POST /api/messages/upload`
上傳附件（圖片/檔案）

**Form Data:**
- `file`: 檔案
- `recipient_id`: 接收者 ID（可選）
- `group_id`: 群組 ID（可選）

**注意**：圖片會自動轉換為 webp 格式，檔名使用 UUID。

## WebSocket 使用說明

### 連接

```
ws://localhost:8000/ws/chat
```

連接時需要攜帶 `session_id` cookie（由登入 API 設定）。

### 訊息格式

#### 發送訊息

```json
{
  "type": "message",
  "text": "Hello!",
  "recipient_id": 2
}
```

或群組訊息：
```json
{
  "type": "message",
  "text": "Hello everyone!",
  "group_id": 1
}
```

帶附件：
```json
{
  "type": "message",
  "attachment": {
    "url": "/api/uploads/uuid.webp",
    "name": "image.webp",
    "mimeType": "image/webp",
    "size": 12345,
    "isImage": true
  },
  "recipient_id": 2
}
```

#### 接收訊息

```json
{
  "type": "message",
  "id": 1,
  "sender_id": 2,
  "recipient_id": 1,
  "group_id": null,
  "text": "Hello!",
  "attachment": null,
  "timestamp": "2024-01-01T12:00:00"
}
```

#### 連接確認

```json
{
  "type": "connected",
  "user_id": 1,
  "message": "Connected to chat"
}
```

## 資料庫結構

### users 表
- `id`: 主鍵
- `name`: 用戶名稱
- `email`: 電子郵件（唯一）
- `password_hash`: 密碼雜湊
- `avatar`: 頭像 URL
- `status`: 狀態（online/offline）
- `created_at`: 建立時間
- `updated_at`: 更新時間

### friendships 表
- `id`: 主鍵
- `user_id`: 用戶 ID
- `friend_id`: 好友 ID
- `status`: 狀態（pending/accepted）
- `created_at`: 建立時間

### groups 表
- `id`: 主鍵
- `name`: 群組名稱
- `creator_id`: 建立者 ID
- `created_at`: 建立時間
- `updated_at`: 更新時間

### group_members 表
- `id`: 主鍵
- `group_id`: 群組 ID
- `user_id`: 用戶 ID
- `role`: 角色（member/admin）
- `joined_at`: 加入時間

### group_denied_members 表
- `id`: 主鍵
- `group_id`: 群組 ID
- `user_id`: 用戶 ID
- `created_at`: 建立時間

### messages 表
- `id`: 主鍵
- `sender_id`: 發送者 ID
- `recipient_id`: 接收者 ID（個人聊天）
- `group_id`: 群組 ID（群組聊天）
- `text`: 訊息文字
- `attachment_url`: 附件 URL
- `attachment_name`: 附件名稱
- `attachment_type`: 附件類型
- `timestamp`: 時間戳

## 開發指南

### 專案結構

```
api/
├── main.py              # FastAPI 應用入口
├── database.py          # 資料庫連接
├── models/              # SQLAlchemy 模型
│   ├── user.py
│   ├── friendship.py
│   ├── group.py
│   └── message.py
├── routers/             # API 路由
│   ├── auth.py
│   ├── users.py
│   ├── friends.py
│   ├── groups.py
│   └── messages.py
├── websocket/           # WebSocket 處理
│   └── chat.py
├── utils/               # 工具函數
│   ├── auth.py          # Session 認證
│   └── image.py         # 圖片處理
├── uploads/             # 上傳檔案目錄
├── pyproject.toml       # uv 專案配置
└── .env                 # 環境變數
```

### Session 認證

使用 Session-based 認證：
- Session ID 透過 Cookie 傳遞
- Session 儲存在伺服器記憶體中（生產環境建議使用 Redis）
- 所有需要認證的端點使用 `get_current_user` 依賴

### 圖片上傳

- 使用 UUID 生成唯一檔名
- 圖片自動轉換為 webp 格式
- 儲存在 `uploads/` 目錄
- 透過 `/api/uploads/{filename}` 訪問

### 好友邏輯

- 新註冊用戶預設為 Stranger（不在任何 friendship 中）
- 添加好友時建立雙向 friendship（status='accepted'）
- Friends 列表：查詢 friendships 表
- Strangers 列表：所有用戶 - 當前用戶 - Friends

## 注意事項

1. **生產環境**：
   - 更改 `SECRET_KEY`
   - 使用 Redis 儲存 Session
   - 設定適當的 CORS 來源
   - 使用 HTTPS

2. **資料庫**：
   - 首次運行會自動建立資料表
   - 建議使用資料庫遷移工具（如 Alembic）管理 schema

3. **檔案上傳**：
   - 確保 `uploads/` 目錄有寫入權限
   - 考慮設定檔案大小限制

4. **WebSocket**：
   - 連接池儲存在記憶體中，重啟服務會斷開所有連接
   - 生產環境建議使用 Redis 或專門的 WebSocket 服務
