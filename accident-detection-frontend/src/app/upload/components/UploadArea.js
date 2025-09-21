// app/upload/components/UploadArea.js
import { ACCEPTED_FILE_TYPES } from '../utils/constants'
import { formatFileSize } from '../utils/fileUtils'
import FilePreview from './FilePreview'

const UploadArea = ({
  selectedFile,
  filePreview,
  isDragging,
  isUploading,
  uploadProgress,
  apiStatus,
  onFileSelect,
  onDragOver,
  onDragLeave,
  onDrop,
  onUpload,
  onClear
}) => {
  return (
    <div 
      className={`upload-area ${
        isDragging ? 'dragging' : 
        selectedFile ? 'has-file' : 'default'
      }`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="upload-emoji">
        {selectedFile ? '📁' : (isDragging ? '📥' : '🗂️')}
      </div>
      
      <h3 className="upload-title">
        {selectedFile ? selectedFile.name : 
         (isDragging ? 'Drop your file here' : 'Upload Image or Video for Analysis')}
      </h3>
      
      {!selectedFile && (
        <>
          <input 
            type="file" 
            accept={Object.keys(ACCEPTED_FILE_TYPES).join(',')}
            onChange={onFileSelect}
            className="file-input"
          />
          
          <p className="upload-hint">
            Supported formats: {Object.values(ACCEPTED_FILE_TYPES).join(', ')} | Max size: 25MB
          </p>
        </>
      )}
      
      {selectedFile && (
        <div className="file-selected">
          <FilePreview file={selectedFile} preview={filePreview} />
          
          <div className="file-details">
            <p><strong>Size:</strong> {formatFileSize(selectedFile.size)}</p>
            <p><strong>Type:</strong> {selectedFile.type}</p>
          </div>
          
          <div className="file-actions">
            <button
              onClick={onUpload}
              disabled={isUploading || apiStatus !== 'ready'}
              className={`btn btn-lg ${
                isUploading || apiStatus !== 'ready' 
                  ? '' 
                  : 'btn-blue'
              }`}
            >
              {isUploading ? `Analyzing... ${uploadProgress}%` : 'Analyze File'}
            </button>
            
            <button
              onClick={onClear}
              disabled={isUploading}
              className="btn btn-lg btn-gray"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .upload-area {
          margin-bottom: 2rem;
          padding: 2rem;
          border: 2px dashed;
          border-radius: 0.75rem;
          text-align: center;
          transition: all 0.3s;
        }
        
        .upload-area.dragging {
          border-color: #3b82f6;
          background-color: #eff6ff;
        }
        
        .upload-area.has-file {
          border-color: #10b981;
          background-color: #f0fdf4;
        }
        
        .upload-area.default {
          border-color: #d1d5db;
          background-color: white;
        }
        
        .upload-emoji {
          font-size: 3.75rem;
          margin-bottom: 1rem;
        }
        
        .upload-title {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 1rem;
        }
        
        .file-input {
          margin-bottom: 1rem;
          padding: 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 0.25rem;
          width: 100%;
          max-width: 24rem;
        }
        
        .upload-hint {
          color: #6b7280;
          font-size: 0.875rem;
        }
        
        .file-details {
          font-size: 0.875rem;
          color: #6b7280;
          margin-bottom: 1rem;
        }
        
        .file-actions {
          display: flex;
          gap: 0.75rem;
          justify-content: center;
        }
        
        .btn {
          padding: 0.5rem 1rem;
          border-radius: 0.25rem;
          font-weight: 500;
          text-decoration: none;
          cursor: pointer;
          border: none;
          transition: background-color 0.2s;
        }
        
        .btn-lg {
          padding: 0.75rem 1.5rem;
          font-weight: 600;
        }
        
        .btn-blue {
          background-color: #2563eb;
          color: white;
        }
        
        .btn-blue:hover {
          background-color: #1d4ed8;
        }
        
        .btn-gray {
          background-color: #4b5563;
          color: white;
        }
        
        .btn-gray:hover {
          background-color: #374151;
        }
        
        .btn:disabled {
          background-color: #9ca3af;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  )
}

export default UploadArea
