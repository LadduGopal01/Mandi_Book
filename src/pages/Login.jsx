import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Footer from '../components/Footer';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!username || !password) {
      setError('Please enter both username and password');
      setIsLoading(false);
      return;
    }

    // Simulate API delay
    setTimeout(async () => {
      const success = await login(username, password);
      
      if (success) {
        // Navigate to admin dashboard
        navigate('/admin/dashboard');
      } else {
        setError('Invalid username or password. Try: admin / admin123');
        setIsLoading(false);
      }
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        {/* Main Container without Border */}
        <div className="w-full max-w-md bg-white shadow-lg">
          <div className="p-8 sm:p-12">
            <div className="flex flex-col">
              {/* Logo Section - Centered */}
              <div className="mb-8 text-center">
                <div className="mb-4">
                  <img 
                    src="/Image/Logo.jpeg" 
                    alt="FMS Dispatch Logo"
                    className="h-28 sm:h-32 mx-auto object-contain mb-4"
                  />
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold leading-tight" style={{ color: '#991b1b' }}>
                  FMS Dispatch
                </h1>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-6 bg-red-50 border-l-4 border-red-700 p-3">
                  <div className="flex items-center">
                    <AlertCircle size={16} className="text-red-700 mr-2 flex-shrink-0" />
                    <span className="text-red-800 text-sm">{error}</span>
                  </div>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-5 w-full">
                {/* User ID Input */}
                <div>
                  <label htmlFor="username" className="block text-lg font-bold mb-2" style={{ color: '#991b1b' }}>
                    User ID
                  </label>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-black focus:outline-none focus:border-black"
                    style={{ borderRadius: '4px' }}
                    disabled={isLoading}
                    autoComplete="username"
                  />
                </div>

                {/* Password Input */}
                <div>
                  <label htmlFor="password" className="block text-lg font-bold mb-2" style={{ color: '#991b1b' }}>
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-black focus:outline-none focus:border-black"
                    style={{ borderRadius: '8px' }}
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-6 text-white text-lg font-bold hover:opacity-90 transition-opacity disabled:opacity-70"
                  style={{ backgroundColor: '#991b1b' }}
                >
                  {isLoading ? 'Signing in...' : 'Sign in'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer Component */}
      <Footer />
    </div>
  );
};

export default Login;