import { BrowserRouter as Router, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/Admin/AdminDashboard';
import UserDashboard from './pages/User/UserDashboard';
import WorkspaceList from './pages/WorkspaceList';
import WorkspaceBoards from './pages/WorkspaceBoards';
import WorkspaceSettings from './pages/WorkspaceSettings';
import BoardView from './pages/BoardView';
import TeamMembers from './pages/TeamMembers';
import ProtectedRoute from './components/ProtectedRoute';

// Wrapper to handle invite token - always show Login/Register if inviteToken is present
const AuthRoute = ({ children, user }) => {
  const [searchParams] = useSearchParams();
  const hasInviteToken = searchParams.get('inviteToken');
  
  // If there's an invite token, always show the page (Login/Register) even if logged in
  if (hasInviteToken) {
    return children;
  }
  
  // Otherwise, redirect logged-in users to dashboard
  if (user) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }
  
  return children;
};

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={<AuthRoute user={user}><Login /></AuthRoute>}
      />
      <Route
        path="/register"
        element={<AuthRoute user={user}><Register /></AuthRoute>}
      />
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute adminOnly>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <UserDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/team-members"
        element={
          <ProtectedRoute>
            <TeamMembers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/workspace/:workspaceId/boards"
        element={
          <ProtectedRoute>
            <WorkspaceBoards />
          </ProtectedRoute>
        }
      />
      <Route
        path="/workspace/:workspaceId/settings"
        element={
          <ProtectedRoute>
            <WorkspaceSettings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/board/:boardId"
        element={
          <ProtectedRoute>
            <BoardView />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to={user ? (user.role === 'admin' ? '/admin' : '/dashboard') : '/login'} replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router future={{ v7_relativeSplatPath: true, v7_startTransition: true  }}>
        <div className="min-h-screen bg-gray-50">
          <AppRoutes />
          <Toaster position="top-right" />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;

