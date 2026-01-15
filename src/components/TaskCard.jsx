import { useState, useEffect, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MoreVertical, Edit, Trash2, User, Image as ImageIcon, File } from 'lucide-react';

const TaskCard = ({ task, onEdit, onDelete }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  // Prevent drag when clicking menu
  const handleMenuClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setShowDropdown(!showDropdown);
  };

  const handleActionClick = (e, callback) => {
    e.stopPropagation();
    e.preventDefault();
    setShowDropdown(false);
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
          ref={dropdownRef}
          className="relative"
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleMenuClick}
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            className="p-1 text-gray-600 hover:bg-gray-100 rounded relative z-10 transition-colors"
            title="More options"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          
          {/* Dropdown Menu */}
          {showDropdown && (
            <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[120px] py-1">
              <button
                onClick={(e) => handleActionClick(e, () => onEdit(task))}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
              >
                <Edit className="h-4 w-4" />
                <span>Edit/View</span>
              </button>
              <button
                onClick={(e) => handleActionClick(e, () => onDelete(task._id))}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete</span>
              </button>
            </div>
          )}
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
        // Check if attachment is a Cloudinary URL (starts with http:// or https://)
        const isCloudinaryUrl = task.attachment.startsWith('http://') || task.attachment.startsWith('https://');
        
        // Get the file URL - use Cloudinary URL directly or construct local URL for backward compatibility
        let fileUrl = task.attachment;
        let fileName = task.attachment;
        
        if (!isCloudinaryUrl) {
          // Backward compatibility: if it's still a filename, construct the old URL
          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';
          let baseUrl = 'http://localhost:5005';
          if (apiUrl) {
            baseUrl = apiUrl.replace(/\/api\/?$/, '') || 'http://localhost:5005';
          }
          fileUrl = `${baseUrl}/uploads/${task.attachment}`;
          fileName = task.attachment;
        } else {
          // Extract filename from Cloudinary URL for display
          const urlParts = task.attachment.split('/');
          fileName = urlParts[urlParts.length - 1] || 'Attachment';
          // Remove query parameters if any
          fileName = fileName.split('?')[0];
        }
        
        // Check if it's an image based on URL or filename
        const isImage = isCloudinaryUrl 
          ? task.attachment.match(/\.(jpg|jpeg|png|gif|webp)$/i) || task.attachment.includes('image')
          : task.attachment.match(/\.(jpg|jpeg|png|gif|webp)$/i);
        
        return (
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="mb-2 p-2 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors block"
          >
            <div className="flex items-center space-x-2">
              {isImage ? (
                <div className="w-12 h-12 rounded overflow-hidden bg-gray-100 flex-shrink-0 relative">
                  <img
                    src={fileUrl}
                    alt={fileName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error('Image load error:', fileUrl, task.attachment);
                      e.target.style.display = 'none';
                      const fallback = e.target.parentElement.querySelector('.image-fallback');
                      if (fallback) fallback.style.display = 'flex';
                    }}
                    onLoad={() => console.log('Image loaded successfully:')}
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
                <p className="text-xs font-medium text-gray-900 truncate">{fileName}</p>
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

