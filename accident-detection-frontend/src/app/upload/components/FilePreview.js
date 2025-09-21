// app/upload/components/FilePreview.js
const FilePreview = ({ file, preview }) => {
  if (!file) return null

  return (
    <div className="file-preview-container">
      {preview ? (
        <img 
          src={preview} 
          alt="Preview" 
          className="file-preview"
        />
      ) : (
        <div className="file-icon">
          {file.type.startsWith('video/') ? '🎥' : '📄'}
        </div>
      )}

      <style jsx>{`
        .file-preview-container {
          margin-bottom: 1rem;
        }
        
        .file-preview {
          max-width: 20rem;
          max-height: 12rem;
          margin: 0 auto;
          border-radius: 0.25rem;
          border: 1px solid #d1d5db;
          display: block;
        }
        
        .file-icon {
          font-size: 4rem;
          margin: 1rem 0;
        }
      `}</style>
    </div>
  )
}

export default FilePreview
