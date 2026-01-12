import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { workspaceAPI, userAPI } from '../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Users, UserPlus, UserMinus, Crown, Shield, Search, Edit, Trash2 } from 'lucide-react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';

const WorkspaceSettings = () => {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [workspace, setWorkspace] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditingWorkspace, setIsEditingWorkspace] = useState(false);
  const [workspaceFormData, setWorkspaceFormData] = useState({ name: '', description: '' });

  useEffect(() => {
    fetchData();
  }, [workspaceId]);

  const fetchData = async () => {
    try {
      const [workspaceRes, usersRes] = await Promise.all([
        workspaceAPI.getById(workspaceId),
        userAPI.getAll(),
      ]);
      setWorkspace(workspaceRes.data);
      
      // Handle different response structures from backend
      let users = [];
      if (Array.isArray(usersRes.data)) {
        users = usersRes.data;
      } else if (usersRes.data?.user && Array.isArray(usersRes.data.user)) {
        // Backend returns { user: [...] }
        users = usersRes.data.user;
      } else if (usersRes.data?.Found && Array.isArray(usersRes.data.Found)) {
        // Alternative response structure
        users = usersRes.data.Found;
      }
      
      setAllUsers(users);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load workspace');
      // Set empty array as fallback
      setAllUsers([]);
      if (error.response?.status === 404 || error.response?.status === 403) {
        navigate('/dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedUserId) return;
    try {
      await workspaceAPI.addMember(workspaceId, selectedUserId);
      toast.success('Member added successfully');
      setShowAddMember(false);
      setSelectedUserId('');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.msg || 'Failed to add member');
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;
    try {
      await workspaceAPI.removeMember(workspaceId, userId);
      toast.success('Member removed successfully');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.msg || 'Failed to remove member');
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    try {
      await workspaceAPI.updateMemberRole(workspaceId, userId, newRole);
      toast.success('Role updated successfully');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.msg || 'Failed to update role');
    }
  };

  const handleEditWorkspace = () => {
    setWorkspaceFormData({
      name: workspace.name,
      description: workspace.description || '',
    });
    setIsEditingWorkspace(true);
  };

  const handleSaveWorkspace = async (e) => {
    e?.preventDefault();
    try {
      await workspaceAPI.update(workspaceId, workspaceFormData);
      toast.success('Workspace updated successfully');
      setIsEditingWorkspace(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.msg || 'Failed to update workspace');
    }
  };

  const handleDeleteWorkspace = async () => {
    const confirmMessage = `⚠️ WARNING: Are you sure you want to delete "${workspace.name}"?\n\nThis will PERMANENTLY DELETE:\n- All boards in this workspace\n- All tasks in those boards\n\nThis action CANNOT be undone!`;
    
    if (!window.confirm(confirmMessage)) return;
    
    try {
      await workspaceAPI.delete(workspaceId);
      toast.success('Workspace deleted successfully');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.msg || 'Failed to delete workspace');
    }
  };

  const isWorkspaceAdmin = () => {
    if (!workspace || !user) {
      return false;
    }
    
    // App admins can always manage workspaces
    if (user.role === 'admin') {
      return true;
    }
    
    // Get user ID - getMe returns user with _id
    const userId = user._id || user.id;
    if (!userId) {
      return false;
    }
    
    // Helper to normalize any ID format to string
    const normalizeId = (id) => {
      if (!id) return null;
      // Handle populated objects
      if (typeof id === 'object') {
        if (id._id) return String(id._id);
        if (id.toString) return String(id);
        return null;
      }
      return String(id);
    };
    
    const userIdStr = normalizeId(userId);
    
    // Check if user is workspace creator
    // createdBy can be: ObjectId, populated object {_id: ...}, or string
    const createdById = workspace.createdBy?._id || workspace.createdBy;
    const createdByIdStr = normalizeId(createdById);
    
    // Compare as strings
    if (createdByIdStr && userIdStr && createdByIdStr === userIdStr) {
      return true;
    }
    
    // Also check direct comparison (in case they're the same object reference)
    if (createdById === userId || createdById?._id === userId || createdById === userId?._id) {
      return true;
    }
    
    // Check if user is workspace admin member
    const member = workspace.members?.find((m) => {
      const memberUserId = m.user?._id || m.user;
      const memberIdStr = normalizeId(memberUserId);
      return memberIdStr === userIdStr;
    });
    
    return member?.role === 'admin';
  };

  const getMemberRole = (member) => {
    const createdById = workspace.createdBy?._id || workspace.createdBy;
    const memberUserId = member.user?._id || member.user;
    
    if (createdById?.toString() === memberUserId?.toString() || createdById === memberUserId) {
      return 'creator';
    }
    return member.role;
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

  if (!workspace) {
    return (
      <Layout>
        <div className="card text-center py-12">
          <p className="text-gray-600">Workspace not found</p>
        </div>
      </Layout>
    );
  }

  // Ensure allUsers is an array before filtering
  const availableUsers = Array.isArray(allUsers) 
    ? allUsers.filter((u) => {
        // Filter out users who are already members
        const isAlreadyMember = workspace.members?.some((m) => {
          const memberUserId = m.user._id || m.user;
          return memberUserId === u._id || memberUserId?.toString() === u._id?.toString();
        });
        
        if (isAlreadyMember) return false;
        
        // Filter by search query (email or name)
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          const email = (u.email || '').toLowerCase();
          const name = (u.name || '').toLowerCase();
          return email.includes(query) || name.includes(query);
        }
        
        return true;
      })
    : [];

  return (
    <Layout>
      <div>
        <div className="flex items-center space-x-4 mb-8">
          <button
            onClick={() => navigate(`/workspace/${workspaceId}/boards`)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Workspace Settings</h1>
            <p className="text-gray-600 mt-1">{workspace.name}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Members ({workspace.members?.length || 0})</span>
                </h2>
                <div className="flex items-center space-x-3">
                  {isWorkspaceAdmin() ? (
                    <button
                      onClick={() => setShowAddMember(true)}
                      className="btn-primary flex items-center space-x-2 hover:shadow-lg transition-shadow"
                    >
                      <UserPlus className="h-4 w-4" />
                      <span>Add Member</span>
                    </button>
                  ) : (
                    <div className="text-sm text-gray-500 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                      <span className="flex items-center space-x-1">
                        <Shield className="h-4 w-4" />
                        <span>Only workspace admins can add members</span>
                      </span>
                      {/* Debug info - remove in production */}
                      {process.env.NODE_ENV === 'development' && (
                        <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-600 font-mono">
                          <div>User ID: {user?._id || user?.id || 'NOT FOUND'}</div>
                          <div>Creator ID: {workspace.createdBy?._id || workspace.createdBy || 'NOT FOUND'}</div>
                          <div>User Role: {user?.role || 'NOT FOUND'}</div>
                          <div>Match: {String(user?._id || user?.id) === String(workspace.createdBy?._id || workspace.createdBy) ? 'YES' : 'NO'}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {workspace.members?.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No members in this workspace yet.</p>
                  {isWorkspaceAdmin() && (
                    <button
                      onClick={() => setShowAddMember(true)}
                      className="btn-primary inline-flex items-center space-x-2"
                    >
                      <UserPlus className="h-4 w-4" />
                      <span>Add First Member</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {workspace.members?.map((member) => {
                  const memberUser = member.user;
                  const role = getMemberRole(member);
                  const isCreator = role === 'creator';
                  
                  return (
                    <div
                      key={memberUser._id || memberUser}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="bg-primary-100 p-2 rounded-full">
                          <Users className="h-4 w-4 text-primary-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {memberUser.name || memberUser}
                          </p>
                          <p className="text-sm text-gray-500">
                            {memberUser.email || ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {isCreator ? (
                          <span className="flex items-center space-x-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">
                            <Crown className="h-3 w-3" />
                            <span>Creator</span>
                          </span>
                        ) : (
                          <>
                            {isWorkspaceAdmin() && (
                              <select
                                value={member.role}
                                onChange={(e) => handleUpdateRole(memberUser._id || memberUser, e.target.value)}
                                className="text-sm border border-gray-300 rounded px-2 py-1"
                              >
                                <option value="member">Member</option>
                                <option value="admin">Admin</option>
                              </select>
                            )}
                            {!isWorkspaceAdmin() && (
                              <span className="flex items-center space-x-1 px-2 py-1 bg-gray-100 text-gray-800 text-xs font-semibold rounded">
                                <Shield className="h-3 w-3" />
                                <span className="capitalize">{member.role}</span>
                              </span>
                            )}
                            {isWorkspaceAdmin() && (
                              <button
                                onClick={() => handleRemoveMember(memberUser._id || memberUser)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                                title="Remove Member"
                              >
                                <UserMinus className="h-4 w-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Workspace Info</h2>
                {isWorkspaceAdmin() && (
                  <div className="flex space-x-2">
                    {!isEditingWorkspace ? (
                      <>
                        <button
                          onClick={handleEditWorkspace}
                          className="btn-secondary text-sm flex items-center space-x-1"
                        >
                          <Edit className="h-4 w-4" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={handleDeleteWorkspace}
                          className="bg-red-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-red-700 transition-colors flex items-center space-x-1"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>Delete</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={handleSaveWorkspace}
                          className="btn-primary text-sm"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setIsEditingWorkspace(false)}
                          className="btn-secondary text-sm"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
              
              {isEditingWorkspace ? (
                <form onSubmit={handleSaveWorkspace} className="space-y-3">
                  <div>
                    <label className="label">Name</label>
                    <input
                      type="text"
                      className="input-field"
                      value={workspaceFormData.name}
                      onChange={(e) => setWorkspaceFormData({ ...workspaceFormData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Description</label>
                    <textarea
                      className="input-field"
                      rows="3"
                      value={workspaceFormData.description}
                      onChange={(e) => setWorkspaceFormData({ ...workspaceFormData, description: e.target.value })}
                    />
                  </div>
                </form>
              ) : (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">Name</p>
                    <p className="font-medium text-gray-900">{workspace.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Description</p>
                    <p className="font-medium text-gray-900">
                      {workspace.description || 'No description'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Created</p>
                    <p className="font-medium text-gray-900">
                      {new Date(workspace.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {showAddMember && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-4">Add Member to Workspace</h2>
              <div className="space-y-4">
                <div>
                  <label className="label flex items-center space-x-2">
                    <Search className="h-4 w-4" />
                    <span>Search by Email or Name</span>
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      className="input-field pl-10"
                      placeholder="Type email (e.g., user@example.com) or name..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setSelectedUserId(''); // Clear selection when searching
                      }}
                      autoFocus
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Start typing to filter users. You can search by email address or name.
                  </p>
                </div>

                {searchQuery.trim() && availableUsers.length === 0 && (
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-sm text-gray-600 text-center">
                      No users found matching "{searchQuery}"
                    </p>
                    <p className="text-xs text-gray-500 text-center mt-2">
                      Make sure the user exists in the system and is not already a member
                    </p>
                  </div>
                )}

                {availableUsers.length > 0 && (
                  <div>
                    <label className="label">
                      Select User ({availableUsers.length} found)
                    </label>
                    <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
                      {availableUsers.map((u) => (
                        <button
                          key={u._id}
                          type="button"
                          onClick={() => setSelectedUserId(u._id)}
                          className={`w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors ${
                            selectedUserId === u._id ? 'bg-primary-50 border-primary-200' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">{u.name}</p>
                              <p className="text-sm text-gray-500">{u.email}</p>
                            </div>
                            {selectedUserId === u._id && (
                              <div className="w-5 h-5 bg-primary-600 rounded-full flex items-center justify-center">
                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {!searchQuery.trim() && availableUsers.length > 10 && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      💡 Tip: Type in the search box above to filter users by email or name
                    </p>
                  </div>
                )}

                {!searchQuery.trim() && availableUsers.length === 0 && allUsers.length > 0 && (
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-sm text-gray-600 text-center">
                      All users are already members of this workspace
                    </p>
                  </div>
                )}

                {allUsers.length === 0 && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800 text-center">
                      No users found in the system. Users need to register first.
                    </p>
                  </div>
                )}

                <div className="flex space-x-3 pt-2">
                  <button
                    onClick={handleAddMember}
                    disabled={!selectedUserId}
                    className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add Member
                  </button>
                  <button
                    onClick={() => {
                      setShowAddMember(false);
                      setSelectedUserId('');
                      setSearchQuery('');
                    }}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default WorkspaceSettings;

