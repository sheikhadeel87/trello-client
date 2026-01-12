import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { boardAPI, taskAPI } from '../services/api';
import toast from 'react-hot-toast';
import { Plus, ArrowLeft, Edit, Trash2, FolderKanban, ChevronRight } from 'lucide-react';
import Layout from '../components/Layout';
import TaskCard from '../components/TaskCard';
import TaskModal from '../components/TaskModal';

const BoardView = () => {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const [board, setBoard] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchBoardData();
  }, [boardId]);

  const fetchBoardData = async () => {
    try {
      const [boardRes, tasksRes] = await Promise.all([
        boardAPI.getById(boardId),
        taskAPI.getByBoard(boardId),
      ]);
      setBoard(boardRes.data);
      setTasks(tasksRes.data);
    } catch (error) {
      toast.error('Failed to load board');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const activeTask = tasks.find((task) => task._id === active.id);
    const overColumn = over.id;

    if (!activeTask || activeTask.status === overColumn) {
      return;
    }

    // Optimistic update
    const updatedTasks = tasks.map((task) =>
      task._id === active.id ? { ...task, status: overColumn } : task
    );
    setTasks(updatedTasks);

    try {
      await taskAPI.updateStatus(active.id, overColumn);
      toast.success('Task status updated');
    } catch (error) {
      toast.error('Failed to update task status');
      fetchBoardData(); // Revert on error
    }
  };

  const handleCreateTask = () => {
    setEditingTask(null);
    setShowTaskModal(true);
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setShowTaskModal(true);
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await taskAPI.delete(taskId);
      toast.success('Task deleted successfully');
      fetchBoardData();
    } catch (error) {
      toast.error(error.response?.data?.msg || 'Failed to delete task');
    }
  };

  const handleTaskSaved = () => {
    setShowTaskModal(false);
    setEditingTask(null);
    fetchBoardData();
  };

  const columns = [
    { id: 'todo', title: 'To Do', color: 'bg-gray-100' },
    { id: 'in_progress', title: 'In Progress', color: 'bg-blue-100' },
    { id: 'completed', title: 'Completed', color: 'bg-green-100' },
  ];

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  if (!board) {
    return (
      <Layout>
        <div className="card text-center py-12">
          <p className="text-gray-600">Board not found</p>
        </div>
      </Layout>
    );
  }

  const workspaceName = board.workspace?.name || 'Workspace';
  const workspaceId = board.workspace?._id || board.workspace;

  return (
    <Layout>
      <div>
        {/* Breadcrumb Navigation */}
        <div className="mb-4 flex items-center space-x-2 text-sm text-gray-600">
          <button
            onClick={() => navigate('/dashboard')}
            className="hover:text-primary-600 transition-colors"
          >
            Dashboard
          </button>
          <ChevronRight className="h-4 w-4" />
          <button
            onClick={() => {
              if (workspaceId) {
                navigate(`/workspace/${workspaceId}/boards`);
              } else {
                navigate('/dashboard');
              }
            }}
            className="hover:text-primary-600 transition-colors"
          >
            {workspaceName}
          </button>
          <ChevronRight className="h-4 w-4" />
          <span className="text-gray-900 font-medium">{board.title}</span>
        </div>

        {/* Board Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <div className="bg-primary-100 p-3 rounded-lg">
                  <FolderKanban className="h-8 w-8 text-primary-600" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-gray-900 mb-2">{board.title}</h1>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span className="flex items-center space-x-1">
                      <span className="font-medium">Workspace:</span>
                      <span>{workspaceName}</span>
                    </span>
                    {board.owner && (
                      <span className="flex items-center space-x-1">
                        <span className="font-medium">Owner:</span>
                        <span>{board.owner.name || board.owner.email}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {board.description && (
                <p className="text-gray-600 mt-3 ml-14">{board.description}</p>
              )}
            </div>
            <button 
              onClick={handleCreateTask} 
              className="btn-primary flex items-center space-x-2 ml-4"
            >
              <Plus className="h-5 w-5" />
              <span>Create Task AA</span>
            </button>
          </div>
        </div>

        {/* Kanban Board Columns */}
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            {board.title} - Task Board
          </h2>
          <p className="text-sm text-gray-500">
            Drag and drop tasks between columns to update their status
          </p>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {columns.map((column) => {
              const columnTasks = tasks.filter((task) => task.status === column.id);
              return (
                <div key={column.id} className="flex flex-col">
                  <div className={`${column.color} rounded-t-lg p-4 border-b-2 border-gray-300`}>
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-bold text-gray-900">
                        {column.title}
                      </h2>
                      <span className="bg-white text-gray-700 px-3 py-1 rounded-full text-sm font-semibold">
                        {columnTasks.length}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {board.title} • {columnTasks.length} {columnTasks.length === 1 ? 'task' : 'tasks'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-b-lg p-4 min-h-[500px] space-y-4 border border-t-0 border-gray-200">
                    <SortableContext
                      items={columnTasks.map((task) => task._id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {columnTasks.map((task) => (
                        <TaskCard
                          key={task._id}
                          task={task}
                          onEdit={handleEditTask}
                          onDelete={handleDeleteTask}
                        />
                      ))}
                    </SortableContext>
                    {columnTasks.length === 0 && (
                      <div className="text-center text-gray-400 py-12 border-2 border-dashed border-gray-300 rounded-lg">
                        <p className="text-sm font-medium mb-1">No tasks</p>
                        <p className="text-xs">Drop tasks here or create a new one</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </DndContext>

        {showTaskModal && (
          <TaskModal
            boardId={boardId}
            task={editingTask}
            onClose={() => {
              setShowTaskModal(false);
              setEditingTask(null);
            }}
            onSave={handleTaskSaved}
          />
        )}
      </div>
    </Layout>
  );
};

export default BoardView;

