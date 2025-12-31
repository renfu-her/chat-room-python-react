
import React, { useState, useRef } from 'react';
import { User } from '../types';

interface ProfileModalProps {
  user: User;
  onClose: () => void;
  onUpdate: (updates: Partial<User> & { password?: string }) => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ user, onClose, onUpdate }) => {
  const [name, setName] = useState(user.name);
  const [avatar, setAvatar] = useState(user.avatar);
  const [password, setPassword] = useState('user123');
  const [isSuccess, setIsSuccess] = useState(false);
  
  // Avatar Editor State
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, we would crop the image here based on offset/zoom
    // For this demo, we save the current avatar state
    onUpdate({ name, avatar, password });
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 1500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (re) => {
        setAvatar(re.target?.result as string);
        setZoom(1);
        setOffset({ x: 0, y: 0 });
        setIsEditingAvatar(true); // Open editor automatically when new file selected
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (re) => {
        setAvatar(re.target?.result as string);
        setZoom(1);
        setOffset({ x: 0, y: 0 });
        setIsEditingAvatar(true);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onMouseUp={handleMouseUp}>
      <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 border border-white/10">
        <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
          <h2 className="text-2xl font-bold tracking-tight">User Profile</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-8 overflow-y-auto max-h-[80vh]">
          {/* Avatar Section */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative">
              {/* Main Avatar Display - Now a rounded square */}
              <div 
                className="w-32 h-32 rounded-[2rem] border-4 border-primary/10 overflow-hidden relative bg-gray-100 dark:bg-gray-800 shadow-inner cursor-pointer transition-all hover:border-primary/30"
                onClick={() => setIsEditingAvatar(!isEditingAvatar)}
              >
                <img 
                  src={avatar} 
                  style={{ 
                    transform: `translate(${offset.x / 4}px, ${offset.y / 4}px) scale(${zoom})`,
                    transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                  }}
                  className="w-full h-full object-cover pointer-events-none" 
                  alt="Profile" 
                />
              </div>
              
              {/* Camera Trigger Button */}
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 bg-primary text-white p-2.5 rounded-2xl shadow-lg border-4 border-white dark:border-gray-900 hover:scale-110 transition-transform z-10"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
            </div>

            {/* Square Editor Area */}
            {isEditingAvatar && (
              <div className="w-full mt-8 space-y-6 animate-in slide-in-from-top-4 duration-300">
                <div 
                  className="aspect-square w-full rounded-[2.5rem] bg-gray-50 dark:bg-gray-800/50 border-2 border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center relative overflow-hidden cursor-move"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                >
                  <img 
                    src={avatar} 
                    style={{ 
                      transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                      transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                    }}
                    className="absolute max-w-none pointer-events-none" 
                  />
                  
                  {/* Clean Square Mask - No text labels */}
                  <div className="absolute inset-0 border-[32px] border-white/80 dark:border-gray-900/80 pointer-events-none rounded-[2.5rem]">
                     <div className="w-full h-full rounded-3xl border-2 border-primary/40 shadow-[0_0_0_2000px_rgba(255,255,255,0.4)] dark:shadow-[0_0_0_2000px_rgba(17,24,39,0.4)]"></div>
                  </div>
                </div>

                {/* Zoom Control */}
                <div className="flex items-center gap-4 px-2">
                  <button onClick={() => setZoom(Math.max(0.5, zoom - 0.1))} className="text-gray-400 hover:text-primary transition-colors">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" /></svg>
                  </button>
                  <input 
                    type="range" 
                    min="0.5" 
                    max="3" 
                    step="0.01"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <button onClick={() => setZoom(Math.min(3, zoom + 0.1))} className="text-gray-400 hover:text-primary transition-colors">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" /></svg>
                  </button>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-5">
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-2 ml-1">Email (Read-only)</label>
                <input 
                  type="email" 
                  value={user.email}
                  disabled
                  className="w-full bg-gray-50 dark:bg-gray-800/50 border-none rounded-2xl px-5 py-4 text-sm text-gray-400 cursor-not-allowed shadow-inner"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-2 ml-1">Display Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-primary outline-none text-sm font-medium transition-all shadow-inner"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-2 ml-1">New Password</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-primary outline-none text-sm transition-all shadow-inner"
                />
              </div>
            </div>

            <div className="flex gap-4 pt-6">
              <button 
                type="button"
                onClick={onClose}
                className="flex-1 py-4 px-6 rounded-2xl font-bold text-sm bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={isSuccess}
                className={`flex-[2] py-4 px-6 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                  isSuccess 
                    ? 'bg-green-500 text-white' 
                    : 'bg-primary text-white hover:bg-blue-600 shadow-xl shadow-primary/30'
                }`}
              >
                {isSuccess ? (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    Saved!
                  </>
                ) : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
