
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Theme, User, Group, ChatSession, Message, Attachment } from './types';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import TopNav from './components/TopNav';
import GroupManagement from './components/GroupManagement';
import ProfileModal from './components/ProfileModal';
import Login from './components/Login';
import Register from './components/Register';
import { authApi, usersApi, friendsApi, groupsApi, messagesApi } from './services/api';
import { getWebSocket, WebSocketMessage } from './services/websocket';

const App: React.FC = () => {
  const [theme, setTheme] = useState<Theme>('light');
  const [authView, setAuthView] = useState<'login' | 'register' | 'chat'>('login');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [isManagingGroup, setIsManagingGroup] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  // Track which users are "friends" (can be chatted with)
  const [friendIds, setFriendIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  // Load data when user is logged in
  useEffect(() => {
    if (currentUser) {
      loadData();
      connectWebSocket();
    } else {
      // Check if user is already logged in
      checkAuth();
    }
    
    // Handle browser close/refresh
    const handleBeforeUnload = () => {
      if (currentUser) {
        const ws = getWebSocket();
        // Send a message to server before closing (if possible)
        // The server will detect the disconnect and broadcast logout
        try {
          ws.disconnect();
        } catch (e) {
          // Ignore errors during unload
        }
      }
    };
    
    // Handle page visibility change (tab switch, minimize, etc.)
    const handleVisibilityChange = () => {
      if (document.hidden && currentUser) {
        // Tab is hidden, but don't disconnect WebSocket
        // Just log for debugging
        console.log('Tab hidden, keeping WebSocket connection');
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (currentUser) {
        const ws = getWebSocket();
        ws.disconnect();
      }
    };
  }, [currentUser]);

  const checkAuth = async () => {
    try {
      const user = await authApi.getMe();
      setCurrentUser({
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        status: user.status,
      });
      setAuthView('chat');
    } catch {
      // Not logged in
    }
  };

  const loadData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      // Load users (for Strangers list)
      const allUsers = await usersApi.getUsers();
      setUsers(allUsers);
      
      // Load friends
      const friends = await friendsApi.getFriends();
      setFriendIds(friends.map(f => f.id));
      
      // Load groups
      const userGroups = await groupsApi.getGroups();
      setGroups(userGroups);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const connectWebSocket = () => {
    const ws = getWebSocket();
    ws.connect();
    
    ws.onMessage((message: WebSocketMessage) => {
      if (message.type === 'message' && message.id) {
        const newMessage: Message = {
          id: message.id,
          senderId: message.senderId!,
          recipientId: message.recipientId,
          groupId: message.groupId,
          text: message.text,
          attachment: message.attachment,
          timestamp: message.timestamp ? new Date(message.timestamp).getTime() : Date.now(),
        };
        
        // Check if this is an update to a pending message or a new message
        setMessages(prev => {
          // Check if we have a pending message (temporary ID) that matches
          const pendingIndex = prev.findIndex(m => 
            m.id < 0 && // Temporary ID (negative)
            m.senderId === newMessage.senderId &&
            m.recipientId === newMessage.recipientId &&
            m.groupId === newMessage.groupId &&
            m.text === newMessage.text
          );
          
          if (pendingIndex >= 0) {
            // Replace pending message with real message
            const updated = [...prev];
            updated[pendingIndex] = newMessage;
            return updated;
          } else {
            // New message, add it
            return [...prev, newMessage];
          }
        });
      } else if (message.type === 'user_status_update' && message.userId) {
        // Update user status in the users list
        console.log(`[狀態更新] 用戶 ${message.userId} (${message.userName || ''}) 狀態: ${message.status || 'offline'}`);
        setUsers(prev => {
          const userIndex = prev.findIndex(u => u.id === message.userId);
          if (userIndex >= 0) {
            // User exists, update status
            const updated = [...prev];
            updated[userIndex] = { ...updated[userIndex], status: (message.status || 'offline') as 'online' | 'offline' };
            return updated;
          } else {
            // User not in list, might be a friend we haven't loaded yet
            // This shouldn't happen, but we'll handle it gracefully
            return prev;
          }
        });
      } else if (message.type === 'user_login') {
        // User login notification - show in console or UI
        console.log(`[系統訊息] ${message.userName || `用戶 ${message.userId}`} 已登入`);
        // Update user status if user is in the list
        if (message.userId) {
          setUsers(prev => {
            const userIndex = prev.findIndex(u => u.id === message.userId);
            if (userIndex >= 0) {
              const updated = [...prev];
              updated[userIndex] = { ...updated[userIndex], status: 'online' };
              return updated;
            }
            return prev;
          });
        }
      } else if (message.type === 'user_logout') {
        // User logout notification - show in console or UI
        console.log(`[系統訊息] ${message.userName || `用戶 ${message.userId}`} 已登出`);
        // Update user status if user is in the list
        if (message.userId) {
          setUsers(prev => {
            const userIndex = prev.findIndex(u => u.id === message.userId);
            if (userIndex >= 0) {
              const updated = [...prev];
              updated[userIndex] = { ...updated[userIndex], status: 'offline' };
              return updated;
            }
            return prev;
          });
        }
      } else if (message.type === 'system_message') {
        // System message (e.g., user joined/left group)
        console.log(`[系統訊息] ${message.text || ''}`);
        // If it's for the active group chat, add it as a system message
        if (message.groupId && activeSession?.type === 'group' && activeSession.id === message.groupId) {
          const systemMsg: Message = {
            id: Date.now(), // Temporary ID for system messages
            senderId: message.userId || 0,
            groupId: message.groupId,
            text: message.text || '',
            timestamp: message.timestamp ? new Date(message.timestamp).getTime() : Date.now(),
          };
          setMessages(prev => [...prev, systemMsg]);
        }
        // Reload groups to reflect changes
        loadData();
      } else if (message.type === 'message_notification') {
        // Message notification (for users not viewing the chat)
        console.log(`[新訊息] ${message.senderName || '未知用戶'}: ${message.text || ''}`);
        // You can add a notification UI here (e.g., toast, badge, etc.)
      } else if (message.type === 'friend_change') {
        // Reload friends list when friend is added/removed
        if (message.action === 'added' || message.action === 'removed') {
          loadData();
        }
      } else if (message.type === 'group_change') {
        // Reload groups when group is created/updated/deleted
        if (message.action === 'created' || message.action === 'updated' || message.action === 'deleted' || 
            message.action === 'member_added' || message.action === 'member_removed') {
          loadData();
          
          // If it's a member_added or member_removed, also show system message in active chat
          if ((message.action === 'member_added' || message.action === 'member_removed') && 
              activeSession?.type === 'group' && activeSession.id === message.groupId) {
            const systemMsg: Message = {
              id: Date.now(),
              senderId: message.userInfo?.id || 0,
              groupId: message.groupId,
              text: message.userInfo ? 
                `${message.userInfo.name} ${message.action === 'member_added' ? '加入' : '離開'}了群組` : 
                `成員${message.action === 'member_added' ? '加入' : '離開'}了群組`,
              timestamp: Date.now(),
            };
            setMessages(prev => [...prev, systemMsg]);
          }
        }
      }
    });
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setAuthView('chat');
  };

  const handleRegister = (user: User) => {
    setCurrentUser(user);
    setAuthView('chat');
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
    const ws = getWebSocket();
    ws.disconnect();
    setCurrentUser(null);
    setAuthView('login');
    setActiveSession(null);
    setMessages([]);
    setUsers([]);
    setGroups([]);
    setFriendIds([]);
  };

  const handleUpdateProfile = async (updates: Partial<User>) => {
    if (!currentUser) return;
    try {
      const updated = await usersApi.updateMe({
        name: updates.name,
        email: updates.email,
      });
      setCurrentUser(updated);
      setUsers(prev => prev.map(u => u.id === currentUser.id ? updated : u));
    } catch (err) {
      console.error('Failed to update profile:', err);
    }
  };

  const handleAddFriend = async (userId: number) => {
    try {
      await friendsApi.addFriend(userId);
      if (!friendIds.includes(userId)) {
        setFriendIds(prev => [...prev, userId]);
      }
      // Reload users to update friends list
      await loadData();
    } catch (err) {
      console.error('Failed to add friend:', err);
    }
  };

  const handleRemoveFriend = async (userId: number) => {
    try {
      await friendsApi.removeFriend(userId);
      setFriendIds(prev => prev.filter(id => id !== userId));
      // Close session if the friend being removed is the active chat
      if (activeSession?.type === 'personal' && activeSession.id === userId) {
        setActiveSession(null);
      }
      // Reload users
      await loadData();
    } catch (err) {
      console.error('Failed to remove friend:', err);
    }
  };

  // Load messages when session changes
  useEffect(() => {
    if (activeSession && currentUser) {
      // Clear messages first, then load
      setMessages([]);
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        loadMessages();
      }, 50);
    } else {
      setMessages([]);
    }
  }, [activeSession?.id, activeSession?.type, currentUser?.id]);

  const loadMessages = async () => {
    if (!activeSession || !currentUser) return;
    
    try {
      const chatType = activeSession.type === 'personal' ? 'personal' : 'group';
      // Load more messages (e.g., 100) to ensure we get all history
      const apiMessages = await messagesApi.getMessages(chatType, activeSession.id, 100, 0);
      
      // Convert API messages to frontend format
      const convertedMessages: Message[] = apiMessages.map(msg => ({
        id: msg.id,
        senderId: msg.senderId,
        recipientId: msg.recipientId,
        groupId: msg.groupId,
        text: msg.text,
        attachment: msg.attachment,
        timestamp: new Date(msg.timestamp).getTime(),
      }));
      
      // Sort by timestamp to ensure chronological order
      convertedMessages.sort((a, b) => a.timestamp - b.timestamp);
      
      setMessages(convertedMessages);
      
      // Scroll to bottom after messages are loaded
      setTimeout(() => {
        const messagesEnd = document.querySelector('[data-messages-end]');
        if (messagesEnd) {
          messagesEnd.scrollIntoView({ behavior: 'auto', block: 'end' });
        }
      }, 100);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  const sendMessage = async (text?: string, attachment?: Attachment) => {
    if (!activeSession || !currentUser || (!text?.trim() && !attachment)) return;

    const isGroup = activeSession.type === 'group';
    const ws = getWebSocket();
    
    // Create temporary message for immediate display
    const tempMessageId = -Date.now(); // Use negative ID for temporary messages
    const tempMessage: Message = {
      id: tempMessageId,
      senderId: currentUser.id,
      recipientId: !isGroup ? activeSession.id : undefined,
      groupId: isGroup ? activeSession.id : undefined,
      text: text?.trim(),
      attachment: attachment,
      timestamp: Date.now(),
    };
    
    // Immediately add to messages for instant display
    setMessages(prev => [...prev, tempMessage]);
    
    try {
      if (attachment) {
        // Attachment already uploaded via API in ChatWindow
        // Just send via WebSocket for real-time delivery
        if (isGroup) {
          ws.sendMessage(undefined, attachment, undefined, activeSession.id);
        } else {
          ws.sendMessage(undefined, attachment, activeSession.id, undefined);
        }
      } else if (text) {
        // Send via WebSocket for real-time
        if (isGroup) {
          ws.sendMessage(text, undefined, undefined, activeSession.id);
        } else {
          ws.sendMessage(text, undefined, activeSession.id, undefined);
        }
        
        // Also save via API as backup (but don't wait for it)
        messagesApi.sendMessage(text, !isGroup ? activeSession.id : undefined, isGroup ? activeSession.id : undefined)
          .catch(err => {
            console.error('Failed to save message via API:', err);
            // Remove temporary message if API fails
            setMessages(prev => prev.filter(m => m.id !== tempMessageId));
          });
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      // Remove temporary message on error
      setMessages(prev => prev.filter(m => m.id !== tempMessageId));
    }
  };

  const handleCreateGroup = async (name: string, members: number[]) => {
    if (!currentUser) return;
    try {
      const newGroup = await groupsApi.createGroup(name, members);
      setGroups(prev => [...prev, newGroup]);
      setActiveSession({ type: 'group', id: newGroup.id });
      setIsManagingGroup(false);
      setIsMobileSidebarOpen(false);
      await loadData();
    } catch (err) {
      console.error('Failed to create group:', err);
    }
  };

  const updateGroup = async (groupId: number, updates: Partial<Group>) => {
    try {
      const updated = await groupsApi.updateGroup(groupId, {
        name: updates.name,
        memberIds: updates.members,
      });
      setGroups(prev => prev.map(g => g.id === groupId ? updated : g));
    } catch (err) {
      console.error('Failed to update group:', err);
    }
  };

  const filteredMessages = useMemo(() => {
    if (!activeSession || !currentUser) return [];
    if (activeSession.type === 'group') {
      return messages.filter(m => m.groupId === activeSession.id);
    } else {
      const otherUserId = activeSession.id;
      return messages.filter(m => 
        !m.groupId && (
          (m.senderId === currentUser.id && m.recipientId === otherUserId) ||
          (m.senderId === otherUserId && m.recipientId === currentUser.id)
        )
      );
    }
  }, [messages, activeSession, currentUser]);

  const activeGroup = activeSession?.type === 'group' 
    ? groups.find(g => g.id === activeSession.id) 
    : null;

  const isDeniedFromGroup = activeGroup?.deniedMembers.includes(currentUser?.id || 0);

  const selectSession = useCallback((session: ChatSession) => {
    setActiveSession(session);
    setIsMobileSidebarOpen(false);
  }, []);

  if (authView === 'login') {
    return <Login onLogin={handleLogin} onGoToRegister={() => setAuthView('register')} />;
  }
  if (authView === 'register') {
    return <Register onRegister={handleRegister} onGoToLogin={() => setAuthView('login')} />;
  }

  if (!currentUser) return null;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-dark text-gray-900 dark:text-gray-100 transition-colors duration-200 overflow-hidden">
      {/* Sidebar - Responsive handling */}
      <div className={`
        fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
        ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar 
          users={users}
          groups={groups}
          activeSession={activeSession}
          setActiveSession={selectSession}
          currentUser={currentUser}
          onNewGroup={() => { setIsManagingGroup(true); setIsMobileSidebarOpen(false); }}
          theme={theme}
          toggleTheme={toggleTheme}
          onLogout={handleLogout}
          onOpenProfile={() => setIsProfileOpen(true)}
          friendIds={friendIds}
          onAddFriend={handleAddFriend}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />
      </div>

      {/* Overlay for mobile sidebar */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden animate-in fade-in duration-300"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      <div className="flex flex-col flex-1 relative overflow-hidden w-full">
        <TopNav 
          currentUser={currentUser}
          activeSession={activeSession}
          activeGroup={activeGroup}
          onManageGroup={() => setIsManagingGroup(true)}
          friendIds={friendIds}
          onRemoveFriend={handleRemoveFriend}
          users={users}
          onToggleSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />
        
        <main className="flex-1 overflow-hidden relative">
          {activeSession ? (
            isDeniedFromGroup ? (
              <div className="h-full flex items-center justify-center p-8 text-center">
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  </div>
                  <h2 className="text-2xl font-bold text-red-500 mb-2">Access Denied</h2>
                  <p className="text-gray-500 max-w-xs">You have been denied access to this group by the administrator.</p>
                </div>
              </div>
            ) : (
              <ChatWindow 
                session={activeSession}
                messages={filteredMessages}
                currentUser={currentUser}
                users={users}
                onSendMessage={sendMessage}
              />
            )
          ) : (
            <div className="h-full flex items-center justify-center p-8 text-center">
              <div className="max-w-md animate-in zoom-in duration-500 px-4">
                <div className="w-16 h-16 lg:w-20 lg:h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
                  <svg className="w-10 h-10 lg:w-12 lg:h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold mb-2">Welcome, {currentUser.name}!</h2>
                <p className="text-gray-500 text-sm lg:text-base">Select a friend or a group from the sidebar to start chatting.</p>
                <button 
                  onClick={() => setIsMobileSidebarOpen(true)}
                  className="mt-6 lg:hidden w-full py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20"
                >
                  Browse Contacts
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {isManagingGroup && (
        <GroupManagement 
          currentUser={currentUser}
          users={users}
          friendIds={friendIds}
          editingGroup={activeGroup || undefined}
          onClose={() => setIsManagingGroup(false)}
          onCreate={handleCreateGroup}
          onUpdate={async (updates) => {
            if (activeGroup) {
              await updateGroup(activeGroup.id, updates);
              await loadData();
            }
            setIsManagingGroup(false);
          }}
        />
      )}

      {isProfileOpen && (
        <ProfileModal 
          user={currentUser}
          onClose={() => setIsProfileOpen(false)}
          onUpdate={handleUpdateProfile}
        />
      )}
    </div>
  );
};

export default App;
