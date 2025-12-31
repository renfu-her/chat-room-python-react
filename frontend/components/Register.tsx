
import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';

interface RegisterProps {
  onRegister: (name: string, email: string) => void;
  onGoToLogin: () => void;
}

const Register: React.FC<RegisterProps> = ({ onRegister, onGoToLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaCode, setCaptchaCode] = useState('');
  const [error, setError] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generateCaptcha = () => {
    const chars = '123456789ABCDEFGHIJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaCode(code);
  };

  const drawCaptcha = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(${Math.random() * 200},${Math.random() * 200},${Math.random() * 255},0.2)`;
      ctx.beginPath();
      ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, 1, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.font = 'bold 24px monospace';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    
    const charArray = captchaCode.split('');
    const space = canvas.width / (charArray.length + 1);
    
    charArray.forEach((char, i) => {
      ctx.save();
      ctx.translate((i + 1) * space, canvas.height / 2);
      ctx.rotate((Math.random() - 0.5) * 0.4);
      ctx.fillStyle = `rgb(${20 + Math.random() * 50},${20 + Math.random() * 50},${80 + Math.random() * 100})`;
      ctx.fillText(char, 0, 0);
      ctx.restore();
    });
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  useEffect(() => {
    if (captchaCode) {
      drawCaptcha();
    }
  }, [captchaCode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !email.trim() || !password || !captchaInput) {
      setError('Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (captchaInput.toUpperCase() !== captchaCode) {
      setError('Invalid verification code.');
      generateCaptcha();
      setCaptchaInput('');
      return;
    }

    onRegister(name, email);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-indigo-600 p-4 lg:p-0">
      <div className="bg-white dark:bg-gray-900 w-full max-w-[420px] rounded-[2.5rem] shadow-2xl overflow-hidden p-6 sm:p-10 animate-in fade-in zoom-in duration-500 border border-white/10">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3 text-primary">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm font-medium">Join the Chat Message React community</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Full Name</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. New User"
              className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-primary outline-none text-sm text-gray-900 dark:text-white transition-all shadow-sm"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-primary outline-none text-sm text-gray-900 dark:text-white transition-all shadow-sm"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
              className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-primary outline-none text-sm text-gray-900 dark:text-white transition-all shadow-sm"
            />
          </div>

          <div className="space-y-3">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">Verification Code (6-Digit)</label>
            
            {/* Row 1: Captcha Image */}
            <div 
              onClick={generateCaptcha}
              className="w-full bg-gray-50 dark:bg-white rounded-2xl cursor-pointer hover:bg-gray-100 select-none transition-colors border border-dashed border-gray-300 dark:border-gray-600 overflow-hidden flex items-center justify-center h-[60px]"
            >
              <canvas ref={canvasRef} width="200" height="60" />
            </div>

            {/* Row 2: Input Field */}
            <input 
              type="text" 
              value={captchaInput}
              onChange={(e) => setCaptchaInput(e.target.value.toUpperCase())}
              placeholder="6 CHARACTERS"
              maxLength={6}
              className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-primary outline-none text-sm text-gray-900 dark:text-white transition-all font-mono uppercase shadow-sm"
            />
          </div>

          {error && <p className="text-red-500 text-[11px] font-bold text-center bg-red-50 dark:bg-red-900/10 py-3 rounded-xl">{error}</p>}

          <button 
            type="submit"
            className="w-full bg-primary text-white py-4 rounded-2xl font-bold hover:bg-blue-600 shadow-xl shadow-primary/30 transition-all transform active:scale-[0.98] mt-2"
          >
            Sign Up
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 text-center">
          <p className="text-gray-400 text-xs font-medium">Already have an account?</p>
          <button 
            onClick={onGoToLogin}
            className="text-primary font-bold text-sm mt-1.5 hover:underline"
          >
            Sign In Instead
          </button>
        </div>
      </div>
    </div>
  );
};

export default Register;
