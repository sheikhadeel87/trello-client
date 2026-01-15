import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

const Login = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteToken, setInviteToken] = useState(null);
  const [invitationPending, setInvitationPending] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('inviteToken');
    const emailParam = searchParams.get('email');
    const invitedEmail = emailParam ? decodeURIComponent(emailParam) : null;
    
    // Pre-fill email from URL params (from invitation)
    if (invitedEmail) {
      setEmail(invitedEmail);
    }
    
    // Check for invite token
    if (token) {
      setInviteToken(token);
      setInvitationPending(true);
    }
    
    // Show error if invitation failed
    if (searchParams.get('error') === 'invitation_error') {
      toast.error('There was an error with your invitation. Please try again.');
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // First, accept the invitation if there's a token
    if (inviteToken) {
      try {
        await api.get(`/users/accept-invitation?token=${inviteToken}`);
        toast.success('Invitation accepted!');
      } catch (err) {
        console.error('Error accepting invitation:', err);
        // Continue with login even if acceptance fails
      }
    }
    
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      const user = JSON.parse(localStorage.getItem('user'));
      navigate(user.role === 'admin' ? '/admin' : '/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="card">
          <div className="text-center">
            <div className="flex justify-center">
              <div className="bg-primary-600 p-3 rounded-full">
                <LogIn className="h-8 w-8 text-white" />
              </div>
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Sign in to your account
            </h2>
            {invitationPending && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-center space-x-2">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                <span className="text-blue-700 text-sm font-medium">Login to accept the invitation and join the team!</span>
              </div>
            )}
            <p className="mt-2 text-sm text-gray-600">
              Or{' '}
              <Link
                to="/register"
                className="font-medium text-primary-600 hover:text-primary-500"
              >
                create a new account
              </Link>
            </p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="label">
                  Email address
                </label>
                <input
                  id="email "
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="input-field"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="password" className="label">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="input-field"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex justify-center items-center"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  'Sign in'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;

