# 更新日誌

## 2025-12-31 16:42:15

### 修復登出和瀏覽器關閉時的狀態同步

1. **修復登出時的狀態廣播**
   - 確保登出時廣播給所有用戶（不只是好友）
   - 使用 `broadcast_to_all_users=True` 參數確保所有在線用戶都能收到登出通知

2. **修復瀏覽器關閉時的狀態同步**
   - 當 WebSocket 斷開時（WebSocketDisconnect），現在會廣播給所有用戶
   - 無論是正常斷開還是異常斷開，都會正確更新用戶狀態並通知所有用戶
   - 添加錯誤日誌以便調試

3. **前端改進**
   - 添加 `beforeunload` 事件處理，確保瀏覽器關閉時正確斷開 WebSocket
   - 添加 `visibilitychange` 事件處理（用於調試）
   - 確保組件卸載時正確清理 WebSocket 連接

### 技術細節

- **後端改進**：
  - `api/websocket/chat.py`: 在 WebSocket 斷開時使用 `broadcast_to_all_users=True`
  - 改進錯誤處理，添加詳細的錯誤日誌

- **前端改進**：
  - `frontend/App.tsx`: 添加瀏覽器關閉事件處理
  - 確保 WebSocket 在各種情況下都能正確斷開

## 2025-12-31 16:36:49

### 修復 WebSocket 狀態同步問題

1. **修復登入狀態同步問題**
   - 當用戶連接 WebSocket 時，現在會主動發送所有好友的當前狀態給新連接的用戶
   - 確保新連接的用戶能立即看到所有好友的當前在線/離線狀態
   - 解決了用戶登入後無法看到其他已登入好友狀態的問題

2. **改進狀態更新處理**
   - 在 `user_status_update` 訊息中添加時間戳
   - 改進前端狀態更新邏輯，添加日誌以便調試
   - 確保狀態更新時正確更新用戶列表

3. **改進錯誤處理**
   - 添加更詳細的日誌輸出，方便追蹤狀態同步問題
   - 改進前端狀態更新的容錯處理

### 技術細節

- **後端改進**：
  - `api/websocket/chat.py`: 在 WebSocket 連接時發送所有好友的當前狀態
  - 在 `user_status_update` 訊息中添加時間戳

- **前端改進**：
  - `frontend/App.tsx`: 改進狀態更新處理邏輯，添加日誌
  - 確保狀態更新時正確查找和更新用戶

## 2025-12-31 16:31:45

### 新增完整的 WebSocket 訊息通知系統

1. **全用戶登入/登出廣播**
   - 添加 `broadcast_to_all` 函數，可廣播訊息給所有連接的用戶
   - 用戶登入時，所有在線用戶都會收到登入通知
   - 用戶登出時，所有在線用戶都會收到登出通知
   - 訊息包含用戶 ID、用戶名稱和時間戳

2. **群組成員加入/離開系統訊息**
   - 當用戶加入群組時，所有群組成員會收到系統訊息
   - 當用戶離開群組時，所有群組成員會收到系統訊息
   - 系統訊息會顯示在群組聊天視窗中
   - 訊息格式：`{用戶名} 加入/離開了群組 {群組名}`

3. **聊天訊息動態通知**
   - 當收到新訊息時，如果用戶不在聊天視窗中，會收到通知
   - 個人聊天：通知收件人
   - 群組聊天：通知所有群組成員（除了發送者）
   - 通知包含發送者名稱和訊息預覽（前 50 個字符）

4. **改進的用戶狀態廣播**
   - `broadcast_user_status` 函數現在支持 `broadcast_to_all_users` 參數
   - 可以選擇只廣播給好友，或廣播給所有用戶
   - 登入/登出時廣播給所有用戶，狀態更新時只廣播給好友

5. **前端訊息處理增強**
   - 添加 `user_login` 訊息類型處理
   - 添加 `user_logout` 訊息類型處理
   - 添加 `system_message` 訊息類型處理（顯示在聊天視窗中）
   - 添加 `message_notification` 訊息類型處理（控制台日誌，可擴展為 UI 通知）
   - 改進群組變更訊息的處理，自動顯示系統訊息

### 技術細節

- **新增 WebSocket 訊息類型**：
  - `user_login`: 用戶登入通知
  - `user_logout`: 用戶登出通知
  - `system_message`: 系統訊息（加入/離開群組）
  - `message_notification`: 聊天訊息通知

- **後端改進**：
  - `api/websocket/chat.py`: 添加 `broadcast_to_all` 函數
  - 改進 `broadcast_user_status` 支持全用戶廣播
  - 改進 `broadcast_group_change` 添加系統訊息
  - 改進 `handle_message` 添加訊息通知
  - `api/routers/auth.py`: 登入/登出時廣播給所有用戶

- **前端改進**：
  - `frontend/services/websocket.ts`: 更新 `WebSocketMessage` 接口
  - `frontend/App.tsx`: 添加新訊息類型的處理邏輯

## 2025-12-31 16:22:13

### 修復 WebSocket 身份驗證錯誤處理

1. **修復身份驗證失敗時的連接關閉問題**
   - 修改 `get_user_from_session` 函數，當身份驗證失敗時返回 `None` 而不是拋出 `HTTPException`
   - 避免在已關閉的 WebSocket 連接上再次嘗試關閉
   - 改進錯誤處理邏輯，使用 `try-except` 包裹所有 `websocket.close()` 調用

2. **改進 WebSocket 異常處理**
   - 在 `websocket_endpoint` 中檢查 `user` 是否為 `None`，如果是則直接返回
   - 在所有異常處理中添加連接狀態檢查，避免重複關閉連接
   - 優化連接清理邏輯，確保資源正確釋放

3. **修復前端 TypeScript 編譯錯誤**
   - 將 `NodeJS.Timeout` 類型改為 `ReturnType<typeof setInterval>`，更適合瀏覽器環境
   - 修復 `ChatWebSocket` 類的語法錯誤

## 2025-12-31 16:16:01

### 新增即時同步功能

1. **跨瀏覽器狀態同步**
   - 用戶上線/離線狀態即時廣播給所有好友
   - 登入時立即更新狀態並通知好友
   - 登出時立即更新狀態並通知好友（不再需要等待1分鐘）

2. **好友變更通知**
   - 添加好友時，雙方即時收到通知
   - 移除好友時，雙方即時收到通知
   - 前端自動重新載入好友列表

3. **群組變更通知**
   - 創建群組時，所有成員即時收到通知
   - 更新群組時，所有成員即時收到通知
   - 刪除群組時，所有成員即時收到通知
   - 添加/移除成員時，所有成員即時收到通知
   - 前端自動重新載入群組列表

4. **訊息已讀狀態**
   - 新增 `message_reads` 資料表
   - 實作 `POST /api/messages/{message_id}/read` API
   - 訊息已讀時通知發送者

5. **WebSocket 心跳機制**
   - 添加 ping/pong 機制以檢測連接狀態
   - 改進錯誤處理和連接管理

6. **即時訊息顯示優化**
   - 發送訊息時立即顯示（使用臨時 ID）
   - WebSocket 回應時更新為真實訊息 ID
   - 重新加入聊天時自動載入所有歷史訊息
   - 自動滾動到最後一條訊息
   - 訊息按時間順序排列（從舊到新）

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
- `message_reads`: 訊息已讀表（新增）

### 注意事項

1. 確保 MySQL 服務正在運行
2. 建立 `chat-room` 資料庫
3. 設定 `.env` 檔案中的環境變數
4. 使用 `uv sync` 安裝後端依賴
5. 後端服務運行在 `http://localhost:8000`
6. 前端服務運行在 `http://localhost:3000`
