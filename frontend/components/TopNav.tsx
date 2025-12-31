
import React from 'react';
import { User, Group, ChatSession } from '../types';

interface TopNavProps {
  currentUser: User;
  activeSession: ChatSession | null;
  activeGroup: Group | null;
  onManageGroup: () => void;
  friendIds: string[];
  onRemoveFriend: (userId: string) => void;
  users: User[];
  onToggleSidebar: () => void;
}

const TopNav: React.FC<TopNavProps> = ({ 
  activeSession, activeGroup, onManageGroup, friendIds, onRemoveFriend, users, onToggleSidebar
}) => {
  const activeChatUser = activeSession?.type === 'personal' 
    ? users.find(u => u.id === activeSession.id) 
    : null;

  const isFriend = activeChatUser && friendIds.includes(activeChatUser.id);

  return (
    <header className="h-16 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md flex items-center justify-between px-4 lg:px-6 z-10 shrink-0">
      <div className="flex items-center gap-2 lg:gap-4 overflow-hidden">
        {/* Hamburger Menu - Visible on mobile/tablet */}
        <button 
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 shrink-0"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>

        {activeSession ? (
          <div className="flex items-center gap-3 overflow-hidden">
            {activeSession.type === 'group' ? (
              <div className="flex items-center gap-3 cursor-pointer group overflow-hidden" onClick={onManageGroup}>
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold transition-transform group-active:scale-95 shrink-0">
                  {activeGroup?.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <h2 className="font-bold text-sm group-hover:text-primary transition-colors truncate">{activeGroup?.name}</h2>
                  <p className="text-[10px] text-gray-500 truncate">{activeGroup?.members.length} participants</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 overflow-hidden">
                 <img src={activeChatUser?.avatar || `https://picsum.photos/seed/${activeSession.id}/100`} className="w-10 h-10 rounded-full object-cover border border-gray-100 dark:border-gray-800 shadow-sm shrink-0" alt="" />
                 <div className="min-w-0">
                   <div className="flex items-center gap-1.5 overflow-hidden">
                     <h2 className="font-bold text-sm truncate">{activeChatUser?.name || activeSession.id}</h2>
                     {isFriend && (
                       <button 
                         onClick={() => onRemoveFriend(activeChatUser!.id)}
                         className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-300 hover:text-red-500 rounded-lg transition-colors shrink-0"
                         title="Remove from Friends"
                       >
                         <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                       </button>
                     )}
                   </div>
                   <p className="text-[10px] text-green-500 font-semibold uppercase tracking-wider">Online</p>
                 </div>
              </div>
            )}
          </div>
        ) : (
          <h2 className="font-bold text-lg text-primary tracking-tight truncate">Messenger</h2>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {activeGroup && (
          <button 
            onClick={onManageGroup}
            className="p-2 lg:p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-all active:scale-90"
            title="Group Settings"
          >
            <svg className="w-5 h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </button>
        )}
      </div>
    </header>
  );
};

export default TopNav;
