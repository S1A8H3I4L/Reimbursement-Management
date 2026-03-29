import { Outlet, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { User } from '../types';
import { LogOut, LayoutDashboard, FileText, Settings, UserCircle } from 'lucide-react';

interface LayoutProps {
  user: User;
}

export default function Layout({ user }: LayoutProps) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-2xl font-bold text-indigo-600">Reimburse</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => navigate('/')}
            className="w-full flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors"
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </button>
          
          <button 
            onClick={() => navigate('/expenses')}
            className="w-full flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors"
          >
            <FileText size={20} />
            <span>Expenses</span>
          </button>

          {user.role === 'admin' && (
            <button 
              onClick={() => navigate('/settings')}
              className="w-full flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors"
            >
              <Settings size={20} />
              <span>Settings</span>
            </button>
          )}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center space-x-3 px-4 py-2 mb-4">
            <div className="bg-indigo-100 p-2 rounded-full text-indigo-600">
              <UserCircle size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user.displayName}</p>
              <p className="text-xs text-gray-500 truncate capitalize">{user.role}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-gray-200 h-16 flex items-center px-8 justify-between">
          <h2 className="text-lg font-semibold text-gray-800">
            {user.role === 'admin' ? 'Admin Control Center' : 
             user.role === 'manager' ? 'Manager Dashboard' : 
             'Employee Portal'}
          </h2>
        </header>
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
