# 更新日誌

## 2024-12-19

### 修復問題

1. **修復 uv 構建錯誤**
   - 在 `pyproject.toml` 中添加 `[tool.hatch.build.targets.wheel]` 配置
   - 指定 `packages = ["."]` 以包含所有文件

2. **修復 FastAPI 依賴注入錯誤**
   - 創建 `get_current_user_dependency` 函數作為 FastAPI 依賴
   - 修復 `logout` 端點的參數順序問題
   - 更新所有 routers 以使用正確的依賴函數

### 新增功能

1. **後端 API 建立**
   - 建立 FastAPI 後端服務
   - 使用 uv 管理 Python 依賴
   - 實作 MySQL 資料庫連接與模型
   - 實作 Session-based 認證系統

2. **認證功能**
   - 用戶註冊 (`POST /api/auth/register`)
   - 用戶登入 (`POST /api/auth/login`)
   - 用戶登出 (`POST /api/auth/logout`)
   - 取得當前用戶 (`GET /api/auth/me`)

3. **用戶管理**
   - 取得所有用戶列表 (`GET /api/users`)
   - 取得特定用戶資訊 (`GET /api/users/{user_id}`)
   - 更新個人資料 (`PUT /api/users/me`)
   - 上傳頭像 (`POST /api/users/me/avatar`) - 自動轉換為 webp，使用 UUID 檔名

4. **好友管理**
   - 取得好友列表 (`GET /api/friends`)
   - 添加好友 (`POST /api/friends/{user_id}`)
   - 移除好友 (`DELETE /api/friends/{user_id}`)
   - 新註冊用戶預設為 Stranger，直到被添加為 Friend

5. **群組管理**
   - 取得群組列表 (`GET /api/groups`)
   - 建立群組 (`POST /api/groups`)
   - 取得群組詳情 (`GET /api/groups/{group_id}`)
   - 更新群組 (`PUT /api/groups/{group_id}`)
   - 刪除群組 (`DELETE /api/groups/{group_id}`)
   - 成員管理（添加/移除）
   - 拒絕列表管理

6. **訊息功能**
   - 取得歷史訊息 (`GET /api/messages`)
   - 發送文字訊息 (`POST /api/messages`)
   - 上傳附件 (`POST /api/messages/upload`) - 圖片自動轉換為 webp，使用 UUID 檔名

7. **WebSocket 即時聊天**
   - WebSocket 連接 (`/ws/chat`)
   - 即時訊息傳遞
   - 連接管理與斷線重連

8. **前端整合**
   - 建立 API 服務層 (`frontend/services/api.ts`)
   - 建立 WebSocket 客戶端 (`frontend/services/websocket.ts`)
   - 整合所有前端組件與後端 API
   - 更新類型定義以匹配 API 響應格式

### 技術細節

- **後端框架**: FastAPI
- **資料庫**: MySQL (使用 SQLAlchemy ORM)
- **認證方式**: Session-based (Cookie)
- **圖片處理**: Pillow (自動轉換為 webp)
- **依賴管理**: uv
- **前端框架**: React + TypeScript
- **即時通訊**: WebSocket

### 檔案結構

```
chat-room/
├── api/                    # 後端 API
│   ├── main.py            # FastAPI 應用入口
│   ├── database.py        # 資料庫連接
│   ├── models/            # SQLAlchemy 模型
│   ├── routers/           # API 路由
│   ├── websocket/         # WebSocket 處理
│   ├── utils/             # 工具函數
│   ├── uploads/           # 上傳檔案目錄
│   ├── pyproject.toml    # uv 專案配置
│   └── README.md         # API 說明文件
├── frontend/             # 前端應用
│   ├── services/         # API 服務層
│   └── components/       # React 組件
└── CHANGED.md           # 更新日誌
```

### 資料庫表結構

- `users`: 用戶表
- `friendships`: 好友關係表
- `groups`: 群組表
- `group_members`: 群組成員表
- `group_denied_members`: 群組拒絕列表
- `messages`: 訊息表

### 注意事項

1. 確保 MySQL 服務正在運行
2. 建立 `chat-room` 資料庫
3. 設定 `.env` 檔案中的環境變數
4. 使用 `uv sync` 安裝後端依賴
5. 後端服務運行在 `http://localhost:8000`
6. 前端服務運行在 `http://localhost:3000`
