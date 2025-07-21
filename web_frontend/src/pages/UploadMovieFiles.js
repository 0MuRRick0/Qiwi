import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { uploadMovieFile } from '../services/api';
import styles from '../index.css'

function UploadMovieFiles() {
  const { movieId } = useParams();
  const [fileType, setFileType] = useState('poster');
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setProgress(0);
    
    if (!file) {
      setError('Please select a file');
      return;
    }

    try {
      await uploadMovieFile(movieId, fileType, file, (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        setProgress(percentCompleted);
      });
      
      setSuccess(true);
      setFile(null);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      setError(error.response?.data?.message || 'Upload failed');
    }
  };

  return (
    <div className="upload-page">
      <h2>Upload Files for Movie #{movieId}</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>File Type</label>
          <select 
            value={fileType} 
            onChange={(e) => setFileType(e.target.value)}
          >
            <option value="poster">Poster (JPG)</option>
            <option value="film">Video File (MP4)</option>
            <option value="trailer">Trailer (MP4)</option>
          </select>
        </div>
        
        <div className="form-group">
          <label>File</label>
          <input 
            type="file" 
            onChange={handleFileChange}
            accept={fileType === 'poster' ? 'image/*' : 'film/*'}
          />
        </div>
        
        {progress > 0 && progress < 100 && (
          <div className="progress-bar">
            <div style={{ width: `${progress}%` }}>{progress}%</div>
          </div>
        )}
        
        {error && <div className="error">{error}</div>}
        {success && <div className="success">File uploaded successfully!</div>}
        
        <button type="submit" disabled={!file}>
          Upload File
        </button>
      </form>
    </div>
  );
}

export default UploadMovieFiles;