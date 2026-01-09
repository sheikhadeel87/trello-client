import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Edit, Trash2, User, Image as ImageIcon, File } from 'lucide-react';

const TaskCard = ({ task, onEdit, onDelete }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task._id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'todo':
        return 'border-gray-300 bg-white';
      case 'in_progress':
        return 'border-blue-300 bg-blue-50';
      case 'completed':
        return 'border-green-300 bg-green-50';
      default:
        return 'border-gray-300 bg-white';
    }
  };

  // Prevent drag when clicking buttons
  const handleButtonClick = (e, callback) => {
    e.stopPropagation();
    e.preventDefault();
    callback();
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`card cursor-move hover:shadow-md transition-shadow ${getStatusColor(task.status)}`}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-gray-900 flex-1">{task.title}</h3>
        <div 
          className="flex space-x-1 ml-2"
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            onClick={(e) => handleButtonClick(e, () => onEdit(task))}
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            className="p-1 text-blue-600 hover:bg-blue-100 rounded relative z-10"
            title="Edit"
          >
            <Edit className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => handleButtonClick(e, () => onDelete(task._id))}
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            className="p-1 text-red-600 hover:bg-red-100 rounded relative z-10"
            title="Delete"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
      {task.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{task.description}</p>
      )}
      {task.assignedTo && task.assignedTo.length > 0 && (
        <div className="flex items-center space-x-1 text-xs text-gray-500 mb-2">
          <User className="h-3 w-3" />
          <span>
            {task.assignedTo.length === 1
              ? task.assignedTo[0]?.name || 'Assigned'
              : `${task.assignedTo.length} assigned`}
          </span>
        </div>
      )}
      
      {/* Image Uploaded Attachment Display */}
      {task.attachment && (() => {
        // Construct the base URL for file access
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';
        // Get base URL without /api
        let baseUrl = 'http://localhost:5005';
        if (apiUrl) {
          baseUrl = apiUrl.replace(/\/api\/?$/, '') || 'http://localhost:5005';
        }
        const imageUrl = `${baseUrl}/uploads/${task.attachment}`;
        
        return (
          <a
            href={imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="mb-2 p-2 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors block"
          >
            <div className="flex items-center space-x-2">
              {task.attachment.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                <div className="w-12 h-12 rounded overflow-hidden bg-gray-100 flex-shrink-0 relative">
                  <img
                    src={imageUrl}
                    alt={task.attachment}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error('Image load error:', imageUrl, task.attachment);
                      e.target.style.display = 'none';
                      const fallback = e.target.parentElement.querySelector('.image-fallback');
                      if (fallback) fallback.style.display = 'flex';
                    }}
                    onLoad={() => console.log('Image loaded successfully:', imageUrl)}
                  />
                  <div className="image-fallback w-full h-full flex items-center justify-center absolute inset-0" style={{ display: 'none' }}>
                    <ImageIcon className="h-6 w-6 text-gray-400" />
                  </div>
                </div>
              ) : (
                <div className="w-12 h-12 rounded bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <File className="h-6 w-6 text-primary-600" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-900 truncate">{task.attachment}</p>
                <p className="text-xs text-gray-500">Click to preview</p>
              </div>
            </div>
          </a>
        );
      })()}
      
      <div className="text-xs text-gray-400">
        {new Date(task.createdAt).toLocaleDateString()}
      </div>
    </div>
  );
};

export default TaskCard;

