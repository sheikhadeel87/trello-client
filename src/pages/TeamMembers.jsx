import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { teamAPI, userAPI, workspaceAPI } from '../services/api';
import toast from 'react-hot-toast';
import { Users, UserPlus, Search, Mail, Edit, Trash2 } from 'lucide-react';
import Layout from '../components/Layout';

const TeamMembers = () => {
  const { user, isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editFormData, setEditFormData] = useState({ name: '', email: '', role: 'user' });

  useEffect(() => {
    fetchUsers();
    fetchWorkspaces();
  }, []);

  // Refresh users when page becomes visible (e.g., when user navigates back)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchUsers();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      // Get team members from Team table where inviting_id = current user
      const response = await teamAPI.getMyMembers();
      // Handle both array response and object with data property
      const usersData = Array.isArray(response.data) ? response.data : (response.data?.data || response.data || []);
      setUsers(usersData);
      console.log(`✅ Loaded ${usersData.length} team members from Team table`);
    } catch (error) {
      const errorMessage = error.response?.data?.msg || error.message || 'Failed to load team members';
      const errorStatus = error.response?.status;
      console.error('❌ Error loading team members:', {
        message: errorMessage,
        status: errorStatus,
        url: error.config?.url,
        fullError: error
      });
      toast.error(`Failed to load team members: ${errorMessage}${errorStatus ? ` (${errorStatus})` : ''}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkspaces = async () => {
    try {
      const response = await workspaceAPI.getAll();
      const workspacesData = Array.isArray(response.data) ? response.data : (response.data?.data || response.data || []);
      setWorkspaces(workspacesData);
    } catch (error) {
      console.error('Failed to load workspaces:', error);
      // Don't show error toast as this is optional for the page
    }
  };

  // Check if current user is a workspace creator
  const isWorkspaceCreator = () => {
    if (!user || !workspaces.length) return false;
    
    // App admins are considered workspace creators for delete permissions
    if (isAdmin()) return true;
    
    const userId = user._id || user.id;
    if (!userId) return false;
    
    // Helper to normalize ID format
    const normalizeId = (id) => {
      if (!id) return null;
      if (typeof id === 'object') {
        if (id._id) return String(id._id);
        if (id.toString) return String(id);
        return null;
      }
      return String(id);
    };
    
    const userIdStr = normalizeId(userId);
    
    // Check if user is creator of any workspace
    return workspaces.some((workspace) => {
      const createdById = workspace.createdBy?._id || workspace.createdBy;
      const createdByIdStr = normalizeId(createdById);
      return createdByIdStr === userIdStr;
    });
  };

  const handleInviteClick = () => {
    // Pre-fill email from search bar if it's a valid email
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (searchTerm && emailPattern.test(searchTerm.trim())) {
      setInviteEmail(searchTerm.trim());
    } else {
      setInviteEmail('');
    }
    setShowInviteModal(true);
  };

  const handleInviteUser = async (userEmail) => {
    try {
      setInviteLoading(true);
      await userAPI.sendInvite({ email: userEmail });
      toast.success(`Invitation sent to ${userEmail}`);
      fetchUsers(); // Refresh to show updated user if they registered
    } catch (error) {
      toast.error(error.response?.data?.msg || 'Failed to send invitation');
      console.error(error);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail || !inviteEmail.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    try {
      setInviteLoading(true);
      await userAPI.sendInvite({ email: inviteEmail });
      toast.success(`Invitation sent to ${inviteEmail}`);
      setShowInviteModal(false);
      setInviteEmail('');
      fetchUsers(); // Refresh to show new user if they registered
    } catch (error) {
      toast.error(error.response?.data?.msg || 'Failed to send invitation');
      console.error(error);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleEditClick = (userData) => {
    setSelectedUser(userData);
    setEditFormData({
      name: userData.name || '',
      email: userData.email || '',
      role: userData.role || 'user',
    });
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      await userAPI.update(selectedUser._id, editFormData);
      toast.success('User updated successfully');
      setShowEditModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.msg || 'Failed to update user');
      console.error(error);
    }
  };

  const handleDeleteClick = (userData) => {
    setSelectedUser(userData);
    setShowDeleteModal(true);
  };

  const handleDeleteUser = async () => {
    try {
      await userAPI.delete(selectedUser._id);
      toast.success('User deleted successfully');
      setShowDeleteModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.msg || 'Failed to delete user');
      console.error(error);
    }
  };


  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div>
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Team Members</h1>
            <p className="mt-2 text-gray-600">Manage all team members</p>
          </div>
          <div className="flex items-center space-x-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10 w-full max-w-md"
              />
            </div>
            <button
              onClick={handleInviteClick}
              className="btn-primary flex items-center space-x-2"
            >
              <UserPlus className="h-5 w-5" />
              <span>Invite</span>
            </button>
          </div>
        </div>

        {/* Users Table */}
        {users.length === 0 ? (
          <div className="card text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No users found</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((userData) => (
                    <tr key={userData._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                              <Users className="h-5 w-5 text-primary-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {userData.name || 'Unknown User'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{userData.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          userData.role === 'admin' 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {userData.role || 'user'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          {isAdmin() && (
                            <>
                              <button
                                onClick={() => handleInviteUser(userData.email)}
                                disabled={inviteLoading}
                                className="btn-primary inline-flex items-center space-x-1 text-xs px-3 py-1 disabled:opacity-50"
                                title="Send Invitation"
                              >
                                <Mail className="h-3 w-3" />
                                <span>Invite</span>
                              </button>
                              <button
                                onClick={() => handleEditClick(userData)}
                                className="text-primary-600 hover:text-primary-900 p-2 rounded-md hover:bg-primary-50"
                                title="Edit User"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          {/* Only show delete button if user is a workspace creator */}
                          {isWorkspaceCreator() && (
                            <button
                              onClick={() => handleDeleteClick(userData)}
                              className="text-red-600 hover:text-red-900 p-2 rounded-md hover:bg-red-50"
                              title="Delete User (Workspace Creator Only)"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Invite Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-2xl font-bold mb-4">Invite User</h2>
              <form onSubmit={handleSendInvite} className="space-y-4">
                <div>
                  <label className="label">Email Address</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="input-field"
                    placeholder="user@example.com"
                    required
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    An invitation email will be sent with a link to register or login.
                  </p>
                </div>
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    disabled={inviteLoading}
                    className="btn-primary flex-1 flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    <Mail className="h-4 w-4" />
                    <span>{inviteLoading ? 'Sending...' : 'Send Invitation'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowInviteModal(false);
                      setInviteEmail('');
                    }}
                    className="btn-secondary flex-1"
                    disabled={inviteLoading}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-2xl font-bold mb-4">Edit User</h2>
              <form onSubmit={handleUpdateUser} className="space-y-4">
                <div>
                  <label className="label">Name</label>
                  <input
                    type="text"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="label">Role</label>
                  <select
                    value={editFormData.role}
                    onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                    className="input-field"
                    required
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex space-x-3">
                  <button type="submit" className="btn-primary flex-1">
                    Update User
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedUser(null);
                    }}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-2xl font-bold mb-4 text-red-600">Delete User</h2>
              <p className="text-gray-700 mb-4">
                Are you sure you want to delete <span className="font-semibold">{selectedUser.name}</span>?
                This action cannot be undone.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={handleDeleteUser}
                  className="btn-primary bg-red-600 hover:bg-red-700 flex-1"
                >
                  Delete
                </button>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedUser(null);
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default TeamMembers;

