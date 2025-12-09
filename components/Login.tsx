
import React, { useState } from 'react';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { Lock, User as UserIcon, Info, Phone, MessageCircle, X, Loader2 } from 'lucide-react';
import Toast from './Toast';

const Login: React.FC<RouteComponentProps> = ({ history }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showAbout, setShowAbout] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { login, toast, hideToast, showToast } = useStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result = await login(username, password);
      
      if (result.success && result.role) {
        // Navigate based on the returned role immediately
        if (result.role === 'super_admin') history.push('/super-admin');
        else if (result.role === 'admin') history.push('/admin');
        else history.push('/employee');
      } else {
        // Only stop loading if login failed
        showToast('بيانات الدخول غير صحيحة أو الاشتراك منتهي', 'error');
        setIsLoading(false);
      }
    } catch (error) {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4 relative">
      {/* Toast Notification */}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={hideToast} 
        />
      )}

      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md z-10">
        <div className="text-center mb-8">
          <div className="bg-blue-100 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
            <Lock className="text-blue-600" size={40} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">تسجيل الدخول</h2>
          <p className="text-gray-500 mt-2">نظام الصرفة</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-gray-700 text-sm font-bold mb-2">اسم المستخدم</label>
            <div className="relative">
              <span className="absolute inset-y-0 right-0 flex items-center pr-3">
                <UserIcon size={20} className="text-gray-400" />
              </span>
              <input
                id="username"
                name="username"
                autoComplete="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-3 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="اسم المستخدم"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-gray-700 text-sm font-bold mb-2">كلمة المرور</label>
            <div className="relative">
              <span className="absolute inset-y-0 right-0 flex items-center pr-3">
                <Lock size={20} className="text-gray-400" />
              </span>
              <input
                id="password"
                name="password"
                autoComplete="current-password"
                type="password"
                inputMode="numeric"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-3 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-md transition-colors flex items-center justify-center gap-2 ${isLoading ? 'opacity-70 cursor-wait' : ''}`}
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                جاري الدخول...
              </>
            ) : (
              'دخول'
            )}
          </button>
        </form>
      </div>

      {/* Who Are We Button */}
      <div className="mt-8">
        <button 
          onClick={() => setShowAbout(true)}
          className="flex items-center gap-2 bg-white px-6 py-3 rounded-full shadow-md text-blue-600 font-bold hover:bg-blue-50 transition-colors"
        >
          <Info size={20} />
          <span>من نحن</span>
        </button>
      </div>

      {/* About Modal */}
      {showAbout && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 relative shadow-2xl scale-100 transform transition-transform">
            <button 
              onClick={() => setShowAbout(false)}
              className="absolute left-4 top-4 text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full p-1"
            >
              <X size={20} />
            </button>
            
            <div className="text-center space-y-6 mt-2">
              <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                <Info size={32} className="text-blue-600" />
              </div>
              
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">من نحن</h3>
                <p className="text-gray-600 font-medium">حقوق الملكية لصالح عثمان بابكر الشريف</p>
              </div>

              <div className="space-y-3 pt-2">
                <a 
                  href="tel:+201500004360" 
                  className="flex items-center justify-center gap-3 bg-gray-50 hover:bg-gray-100 text-gray-800 py-3 rounded-xl border border-gray-200 transition-colors"
                >
                  <Phone size={20} className="text-blue-600" />
                  <span className="font-bold" dir="ltr">+20 150 000 4360</span>
                </a>
                
                <a 
                  href="https://wa.me/201500004360" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-3 bg-green-50 hover:bg-green-100 text-green-700 py-3 rounded-xl border border-green-200 transition-colors"
                >
                  <MessageCircle size={20} />
                  <span className="font-bold">تواصل عبر واتساب</span>
                </a>
              </div>
              
              <div className="text-xs text-gray-400 pt-4 border-t">
                نظام الصرفة v1.0
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default withRouter(Login);
