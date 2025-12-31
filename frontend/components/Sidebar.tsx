
import React, { useState, useRef, useEffect } from 'react';
import { User, Group, ChatSession, Theme } from '../types';

interface SidebarProps {
  users: User[];
  groups: Group[];
  activeSession: ChatSession | null;
  setActiveSession: (session: ChatSession) => void;
  currentUser: User;
  onNewGroup: () => void;
  theme: Theme;
  toggleTheme: () => void;
  onLogout: () => void;
  onOpenProfile: () => void;
  friendIds: string[];
  onAddFriend: (userId: string) => void;
  onCloseMobile?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  users, groups, activeSession, setActiveSession, currentUser, onNewGroup,
  theme, toggleTheme, onLogout, onOpenProfile, friendIds, onAddFriend, onCloseMobile
}) => {
  const [expanded, setExpanded] = useState({
    friends: true,
    groups: true,
    strangers: false
  });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleSection = (section: keyof typeof expanded) => {
    setExpanded(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const friends = users.filter(u => u.id !== currentUser.id && friendIds.includes(u.id));
  const strangers = users.filter(u => u.id !== currentUser.id && !friendIds.includes(u.id));

  const renderFriendItem = (user: User) => (
    <button
      key={user.id}
      onClick={() => setActiveSession({ type: 'personal', id: user.id })}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all mb-1 ${
        activeSession?.id === user.id 
          ? 'bg-primary text-white shadow-md shadow-primary/20' 
          : 'hover:bg-gray-100 dark:hover:bg-gray-800'
      }`}
    >
      <div className="relative flex-shrink-0">
        <img src={user.avatar} className="w-9 h-9 rounded-full object-cover border border-gray-200 dark:border-gray-700" alt="" />
        {user.status === 'online' && (
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full"></span>
        )}
      </div>
      <div className="flex-1 text-left min-w-0">
        <p className="text-sm font-semibold truncate">{user.name}</p>
        <p className={`text-[10px] ${activeSession?.id === user.id ? 'text-blue-100' : 'text-gray-500'} truncate`}>
          {user.status === 'online' ? 'Active now' : 'Offline'}
        </p>
      </div>
    </button>
  );

  const renderStrangerItem = (user: User) => (
    <div
      key={user.id}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all mb-1 group"
    >
      <div className="relative flex-shrink-0 opacity-60">
        <img src={user.avatar} className="w-9 h-9 rounded-full object-cover grayscale-[40%]" alt="" />
      </div>
      <div className="flex-1 text-left min-w-0">
        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 truncate">{user.name}</p>
        <p className="text-[10px] text-gray-400 truncate">Stranger</p>
      </div>
      <button 
        onClick={() => onAddFriend(user.id)}
        className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-primary hover:bg-primary/10 transition-all scale-95"
        title="Add Friend"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
      </button>
    </div>
  );

  return (
    <aside className="w-[85vw] sm:w-80 h-full border-r border-gray-200 dark:border-gray-800 flex flex-col bg-white dark:bg-gray-900 shadow-xl lg:shadow-none z-10 select-none">
      {/* Current User Header with Theme Toggle and Dropdown */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-900/30 relative" ref={dropdownRef}>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-3 flex-1 min-w-0 group text-left"
          >
            <div className="relative flex-shrink-0">
              <img 
                src={currentUser.avatar} 
                alt={currentUser.name} 
                className="w-10 h-10 lg:w-11 lg:h-11 rounded-2xl border-2 border-primary object-cover shadow-sm" 
              />
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full"></span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <h1 className="font-bold text-sm truncate">{currentUser.name}</h1>
                <svg className={`w-3 h-3 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
              </div>
              <p className="text-[10px] text-primary font-bold uppercase tracking-wider">Online</p>
            </div>
          </button>

          <button 
            onClick={toggleTheme}
            className="p-2.5 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 transition-all active:scale-90"
            title="Toggle Theme"
          >
            {theme === 'dark' ? (
              <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" /></svg>
            ) : (
              <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" /></svg>
            )}
          </button>
          
          {onCloseMobile && (
            <button 
              onClick={onCloseMobile}
              className="lg:hidden p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>

        {isDropdownOpen && (
          <div className="absolute left-4 right-4 top-full mt-2 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 py-2 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden z-20">
            <button 
              onClick={() => { setIsDropdownOpen(false); onOpenProfile(); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              </div>
              <span className="font-semibold">Profile Settings</span>
            </button>
            
            <button 
              onClick={() => { setIsDropdownOpen(false); onLogout(); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors font-semibold"
            >
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </div>
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
        <section>
          <button 
            onClick={() => toggleSection('friends')}
            className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest hover:text-primary transition-colors group"
          >
            <span className="flex items-center gap-2">
              <svg className={`w-3 h-3 transition-transform duration-200 ${expanded.friends ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
              Friends ({friends.length})
            </span>
          </button>
          <div className={`overflow-hidden transition-all duration-300 ${expanded.friends ? 'max-h-[500px] opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
            {friends.map(renderFriendItem)}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between group">
            <button 
              onClick={() => toggleSection('groups')}
              className="flex-1 flex items-center gap-2 px-3 py-2 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest hover:text-primary transition-colors"
            >
              <svg className={`w-3 h-3 transition-transform duration-200 ${expanded.groups ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
              Groups ({groups.length})
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onNewGroup(); }} 
              className="p-1.5 mr-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
              title="Create Group"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
            </button>
          </div>
          <div className={`overflow-hidden transition-all duration-300 ${expanded.groups ? 'max-h-[500px] opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
            {groups.map(group => (
              <button
                key={group.id}
                onClick={() => setActiveSession({ type: 'group', id: group.id })}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all mb-1 ${
                  activeSession?.id === group.id 
                    ? 'bg-primary text-white shadow-md shadow-primary/20' 
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center font-bold text-primary flex-shrink-0 group-hover:bg-white/20">
                  {group.name.charAt(0)}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-semibold truncate">{group.name}</p>
                  <p className={`text-[10px] ${activeSession?.id === group.id ? 'text-blue-100' : 'text-gray-500'} truncate`}>
                    {group.members.length} members
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section>
          <button 
            onClick={() => toggleSection('strangers')}
            className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest hover:text-primary transition-colors group"
          >
            <span className="flex items-center gap-2">
              <svg className={`w-3 h-3 transition-transform duration-200 ${expanded.strangers ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
              Strangers ({strangers.length})
            </span>
          </button>
          <div className={`overflow-hidden transition-all duration-300 ${expanded.strangers ? 'max-h-[1000px] opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
            {strangers.map(renderStrangerItem)}
          </div>
        </section>
      </div>
    </aside>
  );
};

export default Sidebar;
