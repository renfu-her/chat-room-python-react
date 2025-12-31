
import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { MOCK_PASSWORD } from '../constants';

interface LoginProps {
  users: User[];
  onLogin: (user: User) => void;
  onGoToRegister: () => void;
}

const Login: React.FC<LoginProps> = ({ users, onLogin, onGoToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaCode, setCaptchaCode] = useState('');
  const [error, setError] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generateCaptcha = () => {
    const chars = '123456789ABCDEFGHIJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 6; i++) { // Updated to 6 characters
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

    // Background noise
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(${Math.random() * 200},${Math.random() * 200},${Math.random() * 255},0.2)`;
      ctx.beginPath();
      ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, 1, 0, Math.PI * 2);
      ctx.fill();
    }

    // Lines
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = `rgba(${Math.random() * 150},${Math.random() * 150},${Math.random() * 200},0.3)`;
      ctx.beginPath();
      ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.stroke();
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

    if (!email || !password || !captchaInput) {
      setError('Please fill in all fields.');
      return;
    }

    if (captchaInput.toUpperCase() !== captchaCode) {
      setError('Invalid verification code.');
      generateCaptcha();
      setCaptchaInput('');
      return;
    }

    const foundUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (foundUser && password === MOCK_PASSWORD) {
      onLogin(foundUser);
    } else {
      setError('Invalid email or password.');
      generateCaptcha();
      setCaptchaInput('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary p-4 lg:p-0">
      <div className="bg-white dark:bg-gray-900 w-full max-w-[420px] rounded-[2.5rem] shadow-2xl overflow-hidden p-6 sm:p-10 animate-in fade-in zoom-in duration-500 relative">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mx-auto mb-3 text-primary">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
          </div>
          <p className="text-gray-500 text-sm font-medium">Sign in to your Chat Message React account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user1@example.com"
              className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-primary outline-none text-sm text-gray-900 dark:text-white transition-all shadow-sm"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
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
            Sign In
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 text-center">
          <p className="text-gray-400 text-xs font-medium">Don't have an account?</p>
          <button 
            onClick={onGoToRegister}
            className="text-primary font-bold text-sm mt-1.5 hover:underline"
          >
            Create New Account
          </button>
        </div>

        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl text-[10px] text-gray-500 leading-relaxed border border-gray-100 dark:border-gray-700">
          <p className="font-bold text-gray-600 dark:text-gray-400 mb-1.5">Demo Access:</p>
          <p>Email: <b className="text-gray-700 dark:text-gray-300">user1@example.com</b> to <b className="text-gray-700 dark:text-gray-300">user20@example.com</b><br/>Password: <b className="text-gray-700 dark:text-gray-300">user123</b></p>
        </div>
      </div>
    </div>
  );
};

export default Login;
