import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  FileText,
  Settings
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Footer from '../components/Footer';

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    if (sidebarOpen) setSidebarOpen(false);
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-30 h-14 shadow-sm">
        <div className="px-3 sm:px-4 lg:px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={toggleSidebar}
              className="lg:hidden hover:text-gray-700 focus:outline-none focus:ring-2 rounded-md p-1.5 transition-colors"
              style={{ color: '#991b1b', focusRingColor: '#991b1b' }}
              aria-label="Toggle menu"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <Link to="/admin/dashboard" className="flex items-center gap-2">
              <span className="text-lg sm:text-xl font-bold" style={{ color: '#991b1b' }}>Dispatch</span>
            </Link>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 hover:text-gray-700 focus:outline-none focus:ring-2 rounded-md px-2 py-1.5 transition-colors"
              style={{ color: '#991b1b', focusRingColor: '#991b1b' }}
            >
              <LogOut size={16} />
              <span className="hidden sm:inline-block text-sm">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 pt-14">
        {/* Sidebar */}
        <aside
          className={`w-52 sm:w-56 bg-white border-r border-gray-200 fixed top-14 bottom-0 left-0 z-20 transform transition-transform duration-300 ease-in-out lg:translate-x-0 shadow-lg lg:shadow-none ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
        >
          <div className="h-full overflow-y-auto pb-16">
            <nav className="p-3 space-y-1">
              {/* Helper to check access */}
              {(() => {
                const hasAccess = (pageName) => {
                  // If user is not fully loaded yet, maybe show nothing or generic?
                  // But normally AuthContext handles "loading" state.

                  // Check if pageAccess exists. 
                  // If it doesn't exist (undefined/null), it might be an old user session or data not loaded.
                  // In this case, we should fail OPEN (show everything) to prevent the sidebar from disappearing 
                  // until the user is updated or re-logs in.
                  if (!user?.pageAccess) {
                    return true;
                  }

                  // If pageAccess exists but is empty array:
                  // This allows for explicit "no access" if we want, OR we can treat empty as "all access".
                  // The previous requirement said: "Page Access column... show only this page".
                  // So empty array means show nothing.
                  // However, for Admin, we always show everything.
                  if (user?.role === 'Admin') {
                    if (user.pageAccess.length === 0) return true; // Fallback for Admin with no specific access set
                    // If Admin HAS specific access set, do we restrict them? 
                    // Usually Admins see everything. Let's return true for Admin always to be safe.
                    return true;
                  }

                  // For non-admin, if list is empty, they see nothing (as per feature request).
                  if (user.pageAccess.length === 0) return false;

                  return user.pageAccess.includes(pageName);
                };

                return (
                  <>
                    {hasAccess('Dashboard') && (
                      <Link
                        to={location.pathname.startsWith('/user') ? '/user/dashboard' : '/admin/dashboard'}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium ${isActive(location.pathname.startsWith('/user') ? '/user/dashboard' : '/admin/dashboard')
                          ? 'text-white border-r-4'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                        style={isActive(location.pathname.startsWith('/user') ? '/user/dashboard' : '/admin/dashboard') ? { backgroundColor: '#991b1b', borderRightColor: '#991b1b' } : {}}
                        onClick={closeSidebar}
                      >
                        <LayoutDashboard size={18} className="shrink-0" />
                        <span className="truncate">Dashboard</span>
                      </Link>
                    )}

                    {(hasAccess('Indent') || hasAccess('TP Summary')) && (
                      <Link
                        to="/admin/tp-summary"
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium ${isActive('/admin/tp-summary')
                          ? 'text-white border-r-4'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                        style={isActive('/admin/tp-summary') ? { backgroundColor: '#991b1b', borderRightColor: '#991b1b' } : {}}
                        onClick={closeSidebar}
                      >
                        <FileText size={18} className="shrink-0" />
                        <span className="truncate">TP Summary</span>
                      </Link>
                    )}






                    {hasAccess('Settings') && (
                      <Link
                        to="/admin/settings"
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium ${isActive('/admin/settings')
                          ? 'text-white border-r-4'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                        style={isActive('/admin/settings') ? { backgroundColor: '#991b1b', borderRightColor: '#991b1b' } : {}}
                        onClick={closeSidebar}
                      >
                        <Settings size={18} className="shrink-0" />
                        <span className="truncate">Settings</span>
                      </Link>
                    )}
                  </>
                );
              })()}
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 ml-0 lg:ml-56 w-[calc(100%-14rem)] ">
          <div className="">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Fixed Footer */}
      <Footer />

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-10 lg:hidden backdrop-blur-sm"
          onClick={closeSidebar}
        ></div>
      )}
    </div>
  );
};

export default AdminLayout;