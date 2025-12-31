
import React, { useState } from 'react';
import { User, Group } from '../types';

interface GroupManagementProps {
  currentUser: User;
  users: User[];
  friendIds: string[];
  editingGroup?: Group;
  onClose: () => void;
  onCreate: (name: string, members: string[]) => void;
  onUpdate: (updates: Partial<Group>) => void;
}

const GroupManagement: React.FC<GroupManagementProps> = ({ 
  currentUser, users, friendIds, editingGroup, onClose, onCreate, onUpdate 
}) => {
  const [name, setName] = useState(editingGroup?.name || '');
  const [selectedMembers, setSelectedMembers] = useState<string[]>(editingGroup?.members || [currentUser.id]);

  // Only show users who are friends (excluding Me from the toggle list logic)
  const friendUsers = users.filter(u => friendIds.includes(u.id) || u.id === currentUser.id);

  const toggleMember = (userId: string) => {
    if (userId === currentUser.id) return; // Creator must be in group
    setSelectedMembers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingGroup) {
      onUpdate({ name, members: selectedMembers });
    } else {
      onCreate(name, selectedMembers);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
          <h2 className="text-xl font-bold">{editingGroup ? 'Group Settings' : 'Create New Group'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Group Name</label>
            <input 
              autoFocus
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="E.g. Weekend Plans"
              className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none text-sm dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Friends</label>
            <div className="h-64 overflow-y-auto border border-gray-100 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-800 p-2 space-y-1">
              {friendUsers.map(u => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggleMember(u.id)}
                  className={`w-full flex items-center gap-2 p-3 rounded-lg text-left transition-colors ${selectedMembers.includes(u.id) ? 'bg-primary/20 text-primary' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                >
                  <img src={u.avatar} className="w-8 h-8 rounded-full shadow-sm" alt="" />
                  <span className="text-sm font-medium truncate flex-1">{u.name} {u.id === currentUser.id && '(Me)'}</span>
                  {selectedMembers.includes(u.id) ? (
                    <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    </div>
                  ) : (
                    <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 rounded-full"></div>
                  )}
                </button>
              ))}
              {friendUsers.length === 0 && (
                <div className="h-full flex items-center justify-center p-4 text-center">
                  <p className="text-xs text-gray-500 italic">No friends available to add.</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl font-bold text-sm bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={!name.trim()}
              className="flex-[2] py-3 px-4 rounded-xl font-bold text-sm bg-primary text-white hover:bg-blue-600 shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
            >
              {editingGroup ? 'Save Changes' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GroupManagement;
