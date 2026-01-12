import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { workspaceAPI, boardAPI, taskAPI } from '../services/api';
import toast from 'react-hot-toast';
import { Plus, ArrowLeft, FolderKanban, Edit, Trash2, Settings, User } from 'lucide-react';
import Layout from '../components/Layout';
import TaskCard from '../components/TaskCard';
import TaskModal from '../components/TaskModal';
import { useAuth } from '../context/AuthContext';

// Droppable Board Column Component
const BoardColumn = ({ board, boardTasks, children, isWorkspaceMember, isWorkspaceAdmin, user, onEditBoard, onDeleteBoard, onCreateTask }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: board._id,
  });

  return (
    <div
      ref={setNodeRef}
      key={board._id}
      className="flex-shrink-0 w-80 flex flex-col"
      style={{
        backgroundColor: isOver ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
        border: isOver ? '2px dashed rgba(59, 130, 246, 0.5)' : '2px solid transparent',
        borderRadius: '8px',
        transition: 'all 0.2s ease',
        transform: isOver ? 'scale(1.02)' : 'scale(1)',
      }}
    >
      {/* Board Header */}
      <div className="bg-primary-600 text-white rounded-t-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold">{board.title}</h2>
          {(isWorkspaceAdmin || (board.owner?._id || board.owner) === (user?._id || user?.id) || user?.role === 'admin') && (
            <div className="flex space-x-1">
              <button
                onClick={() => onEditBoard(board)}
                className="p-1.5 bg-white bg-opacity-20 hover:bg-opacity-30 rounded text-white transition-colors"
                title="Edit Board"
              >
                <Edit className="h-4 w-4" />
              </button>
              <button
                onClick={() => onDeleteBoard(board._id)}
                className="p-1.5 bg-white bg-opacity-20 hover:bg-opacity-30 rounded text-white transition-colors"
                title="Delete Board"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
        <p className="text-sm text-primary-100 mb-2">
          {board.description || 'No description'}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-primary-200">{boardTasks.length} {boardTasks.length === 1 ? 'task' : 'tasks'}</span>
          {isWorkspaceMember && (
            <button
              onClick={() => onCreateTask(board._id)}
              className="bg-white text-primary-600 px-3 py-1.5 rounded-md text-sm font-medium hover:bg-primary-50 transition-colors flex items-center space-x-1"
            >
              <Plus className="h-4 w-4" />
              <span>Add Task</span>
            </button>
          )}
        </div>
      </div>

      {/* Tasks Column */}
      <div className="bg-gray-50 rounded-b-lg p-4 min-h-[500px] space-y-3 flex-1">
        {children}
        {boardTasks.length === 0 && (
          <div className="text-center text-gray-400 py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <p className="text-sm font-medium mb-2">No tasks</p>
            {isWorkspaceMember ? (
              <button
                onClick={() => onCreateTask(board._id)}
                className="mt-2 bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700 transition-colors flex items-center space-x-2 mx-auto"
              >
                <Plus className="h-4 w-4" />
                <span>Create Task</span>
              </button>
            ) : (
              <p className="text-xs">Drop tasks here</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const WorkspaceBoards = () => {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [workspace, setWorkspace] = useState(null);
  const [boards, setBoards] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBoardModal, setShowBoardModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingBoard, setEditingBoard] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [selectedBoardId, setSelectedBoardId] = useState(null);
  const [formData, setFormData] = useState({ title: '', description: '' });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px of movement before drag starts (prevents accidental drags)
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchData();
  }, [workspaceId]);

  const fetchData = async () => {
    try {
      const [workspaceRes, boardsRes] = await Promise.all([
        workspaceAPI.getById(workspaceId),
        boardAPI.getByWorkspace(workspaceId),
      ]);
      setWorkspace(workspaceRes.data);
      // Ensure boards are sorted by createdAt ascending (oldest first, left to right)
      const sortedBoards = [...(boardsRes.data || [])].sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateA - dateB; // Ascending: oldest first
      });
      setBoards(sortedBoards);
      
      // Fetch all tasks from all boards
      if (boardsRes.data && boardsRes.data.length > 0) {
        const allTasksPromises = boardsRes.data.map(board => 
          taskAPI.getByBoard(board._id).catch(() => ({ data: [] }))
        );
        const allTasksResults = await Promise.all(allTasksPromises);
        const allTasks = allTasksResults.flatMap(res => res.data || []);
        setTasks(allTasks);
      } else {
        setTasks([]);
      }
    } catch (error) {
      toast.error('Failed to load workspace');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleBoardSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingBoard) {
        await boardAPI.update(editingBoard._id, formData);
        toast.success('Board updated successfully');
      } else {
        await boardAPI.create({ ...formData, workspaceId });
        toast.success('Board created successfully');
      }
      setShowBoardModal(false);
      setEditingBoard(null);
      setFormData({ title: '', description: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.msg || 'Operation failed');
    }
  };

  const handleDeleteBoard = async (id) => {
    if (!window.confirm('Are you sure you want to delete this board? All tasks in this board will be deleted.')) return;
    try {
      await boardAPI.delete(id);
      toast.success('Board deleted successfully');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.msg || 'Failed to delete board');
    }
  };

  const handleEditBoard = (board) => {
    setEditingBoard(board);
    setFormData({ title: board.title, description: board.description || '' });
    setShowBoardModal(true);
  };

  const handleCreateTask = (boardId) => {
    setSelectedBoardId(boardId);
    setEditingTask(null);
    setShowTaskModal(true);
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setSelectedBoardId(task.board._id || task.board);
    setShowTaskModal(true);
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await taskAPI.delete(taskId);
      toast.success('Task deleted successfully');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.msg || 'Failed to delete task');
    }
  };

  const handleTaskSaved = () => {
    setShowTaskModal(false);
    setEditingTask(null);
    setSelectedBoardId(null);
    fetchData();
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (!over || !active) {
      return;
    }

    // Find the task being dragged
    const task = tasks.find((t) => t._id === active.id);
    
    if (!task) {
      return;
    }

    // Find source board (where task currently is)
    const currentBoardId = task.board?._id || task.board;
    const sourceBoard = boards.find((b) => String(b._id) === String(currentBoardId));

    // Find destination board (where task is being dropped)
    const destinationBoard = boards.find((b) => String(b._id) === String(over.id));

    // Validate we have all required data
    if (!sourceBoard || !destinationBoard) {
      return;
    }

    // Get IDs for tracking
    const taskId = task._id;
    const sourceBoardId = sourceBoard._id;
    const destinationBoardId = destinationBoard._id;

    // Check if task is already in the destination board
    if (String(sourceBoardId) === String(destinationBoardId)) {
      return; // Already in this board, no update needed
    }

    console.log('Moving task:', {
      taskId,
      taskTitle: task.title,
      sourceBoard: sourceBoard.title,
      sourceBoardId,
      destinationBoard: destinationBoard.title,
      destinationBoardId,
    });

    // Optimistic update - immediately update UI for smooth experience
    const updatedTasks = tasks.map((t) => {
      if (t._id === taskId) {
        return { ...t, board: destinationBoardId };
      }
      return t;
    });
    setTasks(updatedTasks);

    try {
      // Update task's board in backend with all required information
      await taskAPI.update(taskId, { 
        board: destinationBoardId 
      });
      
      toast.success(`Task "${task.title}" moved from ${sourceBoard.title} to ${destinationBoard.title}`);
      
      // Refresh to get updated data from server (ensures consistency)
      fetchData();
    } catch (error) {
      console.error('Failed to move task:', error);
      toast.error(error.response?.data?.msg || 'Failed to move task');
      
      // Revert optimistic update on error by refreshing
      fetchData();
    }
  };

  const isWorkspaceMember = () => {
    if (!workspace || !user) return false;
    if (user.role === 'admin') return true;
    
    const userId = user._id || user.id;
    if (!userId) return false;
    
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
    const member = workspace.members?.find((m) => {
      const memberUserId = m.user?._id || m.user;
      const memberIdStr = normalizeId(memberUserId);
      return memberIdStr === userIdStr;
    });
    
    return !!member;
  };

  const isWorkspaceAdmin = () => {
    if (!workspace || !user) return false;
    if (user.role === 'admin') return true;
    
    const userId = user._id || user.id;
    if (!userId) return false;
    
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
    const createdById = workspace.createdBy?._id || workspace.createdBy;
    const createdByIdStr = normalizeId(createdById);
    
    if (createdByIdStr && userIdStr && createdByIdStr === userIdStr) {
      return true;
    }
    
    if (createdById === userId || createdById?._id === userId || createdById === userId?._id) {
      return true;
    }
    
    const member = workspace.members?.find((m) => {
      const memberUserId = m.user?._id || m.user;
      const memberIdStr = normalizeId(memberUserId);
      return memberIdStr === userIdStr;
    });
    
    return member?.role === 'admin';
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
    return null;
  }

  return (
    <Layout>
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{workspace.name}</h1>
              <p className="text-gray-600 mt-1">{workspace.description || 'No description'}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate(`/workspace/${workspaceId}/settings`)}
              className="btn-secondary flex items-center space-x-2"
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </button>
            {isWorkspaceMember() && (
              <button
                onClick={() => {
                  setShowBoardModal(true);
                  setEditingBoard(null);
                  setFormData({ title: '', description: '' });
                }}
                className="btn-primary flex items-center space-x-2"
              >
                <Plus className="h-5 w-5" />
                <span>Create Board</span>
              </button>
            )}
          </div>
        </div>

        {/* Kanban Board View - Boards as Columns */}
        {boards.length === 0 ? (
          <div className="card text-center py-12">
            <FolderKanban className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No boards in this workspace yet.</p>
            {isWorkspaceMember() && (
              <button
                onClick={() => {
                  setShowBoardModal(true);
                  setEditingBoard(null);
                  setFormData({ title: '', description: '' });
                }}
                className="btn-primary inline-flex items-center space-x-2"
              >
                <Plus className="h-5 w-5" />
                <span>Create Your First Board</span>
              </button>
            )}
          </div>
        ) : (
          <DndContext 
            sensors={sensors} 
            collisionDetection={closestCenter} 
            onDragEnd={handleDragEnd}
            onDragStart={(event) => {
              // Optional: Add visual feedback when drag starts
              console.log('Drag started:', event.active.id);
            }}
          >
            <div className="flex gap-6 overflow-x-auto pb-4">
              {boards.map((board) => {
                const boardTasks = tasks.filter((task) => {
                  const taskBoardId = task.board._id || task.board;
                  return taskBoardId === board._id;
                });

                return (
                  <BoardColumn
                    key={board._id}
                    board={board}
                    boardTasks={boardTasks}
                    isWorkspaceMember={isWorkspaceMember()}
                    isWorkspaceAdmin={isWorkspaceAdmin()}
                    user={user}
                    onEditBoard={handleEditBoard}
                    onDeleteBoard={handleDeleteBoard}
                    onCreateTask={handleCreateTask}
                  >
                    <SortableContext
                      items={boardTasks.map((task) => task._id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {boardTasks.map((task) => (
                        <TaskCard
                          key={task._id}
                          task={task}
                          onEdit={handleEditTask}
                          onDelete={handleDeleteTask}
                        />
                      ))}
                    </SortableContext>
                  </BoardColumn>
                );
              })}
            </div>
          </DndContext>
        )}

        {/* Create/Edit Board Modal */}
        {showBoardModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-2xl font-bold mb-4">
                {editingBoard ? 'Edit Board' : 'Create Board'}
              </h2>
              <form onSubmit={handleBoardSubmit} className="space-y-4">
                <div>
                  <label className="label">Title</label>
                  <input
                    type="text"
                    className="input-field"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., To Do, In Progress, Done"
                    required
                  />
                </div>
                <div>
                  <label className="label">Description</label>
                  <textarea
                    className="input-field"
                    rows="3"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe what this board is for..."
                  />
                </div>
                <div className="flex space-x-3">
                  <button type="submit" className="btn-primary flex-1">
                    {editingBoard ? 'Update' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowBoardModal(false);
                      setEditingBoard(null);
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

        {/* Create/Edit Task Modal */}
        {showTaskModal && selectedBoardId && (
          <TaskModal
            boardId={selectedBoardId}
            task={editingTask}
            onClose={() => {
              setShowTaskModal(false);
              setEditingTask(null);
              setSelectedBoardId(null);
            }}
            onSave={handleTaskSaved}
          />
        )}
      </div>
    </Layout>
  );
};

export default WorkspaceBoards;
