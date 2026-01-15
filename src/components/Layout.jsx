import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, LayoutDashboard, Users, FolderKanban, CheckSquare } from 'lucide-react';

const Layout = ({ children }) => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link to={isAdmin() ? '/admin' : '/dashboard'} className="flex items-center space-x-2">
                <FolderKanban className="h-8 w-8 text-primary-600" />
                <span className="text-xl font-bold text-gray-900">Kanban Board</span>
              </Link>
              <nav className="hidden md:flex space-x-4">
                {isAdmin() ? (
                  <>
                    <Link
                      to="/admin"
                      className="flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      <span>Dashboard</span>
                    </Link>
                    <Link
                      to="/admin/workspaces"
                      className="flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
                    >
                      <Users className="h-4 w-4" />
                      <span>Workspaces</span>
                    </Link>
                    <Link
                      to="/admin/boards"
                      className="flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
                    >
                      <FolderKanban className="h-4 w-4" />
                      <span>Boards</span>
                    </Link>
                    <Link
                      to="/admin/tasks"
                      className="flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
                    >
                      <CheckSquare className="h-4 w-4" />
                      <span>Tasks</span>
                    </Link>
                  </>
                ) : (
                  <>
                  <Link
                    to="/dashboard"
                    className="flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    <span>My Workspaces</span>
                  </Link>
                  <Link
                      to="/team-members"
                      className="flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
                    >
                      <Users className="h-4 w-4" />
                      <span>Team Members</span>
                    </Link>
                  </>
                )}
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-700">
                <span className="font-medium">{user?.name}</span>
                {isAdmin() && (
                  <span className="ml-2 px-2 py-1 bg-primary-100 text-primary-800 text-xs font-semibold rounded">
                    Admin
                  </span>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;

