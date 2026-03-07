import { useState, useEffect, useRef } from "react";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const icons = {
  image: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6">
      <rect x="3" y="3" width="18" height="18" rx="3"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <path d="M21 15l-5-5L5 21"/>
    </svg>
  ),
  video: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6">
      <rect x="2" y="6" width="14" height="12" rx="2"/>
      <path d="M16 10l6-3v10l-6-3V10z"/>
    </svg>
  ),
  doc: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="8" y1="13" x2="16" y2="13"/>
      <line x1="8" y1="17" x2="16" y2="17"/>
    </svg>
  ),
  pdf: (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" fill="currentColor" opacity="0.15"/>
      <path d="M14 2v6h6M8 13h8M8 17h8" stroke="currentColor" strokeWidth="1.8"/>
      <text x="7" y="16" fontSize="4" fontWeight="700" fill="currentColor">PDF</text>
    </svg>
  ),
  docx: (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" fill="currentColor" opacity="0.15"/>
      <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.8"/>
      <rect x="8" y="12" width="8" height="1" fill="currentColor"/>
      <rect x="8" y="15" width="6" height="1" fill="currentColor"/>
      <rect x="8" y="18" width="8" height="1" fill="currentColor"/>
    </svg>
  ),
  xlsx: (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" fill="currentColor" opacity="0.15"/>
      <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.8"/>
      <rect x="8" y="12" width="2.5" height="2.5" stroke="currentColor" strokeWidth="1" fill="none"/>
      <rect x="10.5" y="12" width="2.5" height="2.5" stroke="currentColor" strokeWidth="1" fill="none"/>
      <rect x="13" y="12" width="2.5" height="2.5" stroke="currentColor" strokeWidth="1" fill="none"/>
      <rect x="8" y="14.5" width="2.5" height="2.5" stroke="currentColor" strokeWidth="1" fill="none"/>
      <rect x="10.5" y="14.5" width="2.5" height="2.5" stroke="currentColor" strokeWidth="1" fill="none"/>
      <rect x="13" y="14.5" width="2.5" height="2.5" stroke="currentColor" strokeWidth="1" fill="none"/>
    </svg>
  ),
  all: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
      <rect x="3" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
};

export default function NianStorage(props) {
  const { user: initialUser, token, onLogout } = props;
  const [user, setUser] = useState(initialUser);
  const [files, setFiles] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [view, setView] = useState("grid");
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadProgress, setUploadProgress] = useState({ uploading: false, progress: 0, fileName: '' });
  const [error, setError] = useState("");
  const [deleteModal, setDeleteModal] = useState({ show: false, fileId: null, fileName: '' });
  const [viewerModal, setViewerModal] = useState({ show: false, file: null });
  const [txtContent, setTxtContent] = useState(null);
  const fileInputRef = useRef(null);

  // Fetch files on mount
  useEffect(() => {
    if (token) {
      fetchFiles();
      fetchUserData();
    } else {
      setLoading(false);
    }
  }, [token]);

  // Fetch txt content when a txt file is opened in the viewer
  useEffect(() => {
    if (viewerModal.show && viewerModal.file?.type === 'txt') {
      setTxtContent(null);
      fetch(`${API_URL}/api/files/${viewerModal.file.id}/content`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(r => r.text())
        .then(text => setTxtContent(text))
        .catch(() => setTxtContent('Error loading file content.'));
    } else {
      setTxtContent(null);
    }
  }, [viewerModal.show, viewerModal.file]);

  // Close viewer on ESC key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (viewerModal.show) {
          closeViewer();
        }
        if (deleteModal.show) {
          cancelDelete();
        }
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [viewerModal.show, deleteModal.show]);

  const fetchUserData = async () => {
    if (!token) {
      console.error('No token available');
      return;
    }
    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        console.error('Failed to fetch user data:', response.status);
      }
    } catch (err) {
      console.error('Fetch user error:', err);
    }
  };

  const fetchFiles = async () => {
    if (!token) {
      console.error('No token available');
      setLoading(false);
      return;
    }
    try {
      const response = await fetch(`${API_URL}/api/files`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setFiles(data.files || []);
      } else {
        setError(data.error || 'Failed to load files');
        console.error('Failed to fetch files:', response.status, data);
      }
    } catch (err) {
      setError('Failed to connect to server');
      console.error('Fetch files error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Compress image before upload
  const compressImage = async (file, maxWidth = 1920, quality = 0.8) => {
    return new Promise((resolve, reject) => {
      // Only compress images
      if (!file.type.startsWith('image/')) {
        resolve(file);
        return;
      }

      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target.result;
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Resize if image is too large
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to blob with compression
          canvas.toBlob(
            (blob) => {
              if (blob) {
                // Create new file with compressed data
                const compressedFile = new File([blob], file.name, {
                  type: file.type,
                  lastModified: Date.now()
                });
                
                console.log(`Compressed ${file.name}: ${(file.size / 1024).toFixed(1)}KB → ${(blob.size / 1024).toFixed(1)}KB`);
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            },
            file.type,
            quality
          );
        };

        img.onerror = () => {
          console.error('Failed to load image for compression');
          resolve(file);
        };
      };

      reader.onerror = () => {
        console.error('Failed to read file');
        resolve(file);
      };
    });
  };

  const uploadFileWithProgress = (file, formData, token) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // XHR timeout: 10 minutes for large videos
      xhr.timeout = 600000;

      // Track upload progress (browser → server = 0-90%)
      // Remaining 10% is server processing (R2 upload + DB save)
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 90);
          setUploadProgress({ uploading: true, progress: percent, fileName: file.name, phase: 'uploading' });
        }
      });

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            setUploadProgress({ uploading: true, progress: 100, fileName: file.name, phase: 'done' });
            resolve(data);
          } catch (err) {
            reject(new Error('Failed to parse response'));
          }
        } else {
          try {
            const data = JSON.parse(xhr.responseText);
            reject(new Error(data.error || `Upload failed with status ${xhr.status}`));
          } catch {
            reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.responseText || xhr.statusText}`));
          }
        }
      });

      // Once bytes are fully sent, show "Processing..."
      xhr.upload.addEventListener('loadend', () => {
        setUploadProgress(prev => ({
          ...prev,
          progress: 90,
          phase: 'processing'
        }));
      });

      xhr.addEventListener('timeout', () => {
        reject(new Error('Upload timed out — file may be too large'));
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload cancelled'));
      });

      // Open and send request
      xhr.open('POST', `${API_URL}/api/files/upload`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
    });
  };

  const handleFileUpload = async (fileList) => {
    if (!fileList || fileList.length === 0) return;
    
    if (!token) {
      setError('You must be logged in to upload files');
      return;
    }
    
    setUploadProgress({ uploading: true, progress: 0, fileName: '' });
    setError("");

    for (let i = 0; i < fileList.length; i++) {
      let file = fileList[i];
      
      // Compress images before upload
      if (file.type.startsWith('image/')) {
        try {
          file = await compressImage(file);
        } catch (err) {
          console.error('Compression failed, uploading original:', err);
        }
      }

      const formData = new FormData();
      formData.append('file', file);

      try {
        setUploadProgress({ uploading: true, progress: 0, fileName: file.name });
        const data = await uploadFileWithProgress(file, formData, token);
        
        // Add new file to list
        setFiles(prev => [data.file, ...prev]);
        // Refresh user data to update storage
        fetchUserData();
      } catch (err) {
        setError('Upload failed: ' + err.message);
        console.error('Upload error:', err);
      }
    }
    
    setUploadProgress({ uploading: false, progress: 0, fileName: '' });
  };

  const handleDelete = (fileId, fileName) => {
    setDeleteModal({ show: true, fileId, fileName });
  };

  const confirmDelete = async () => {
    const { fileId } = deleteModal;
    setDeleteModal({ show: false, fileId: null, fileName: '' });

    if (!token) {
      setError('You must be logged in to delete files');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setFiles(prev => prev.filter(f => f.id !== fileId));
        // Refresh user data to update storage
        fetchUserData();
      } else {
        const data = await response.json();
        setError(data.error || 'Delete failed');
        console.error('Delete failed:', response.status, data);
      }
    } catch (err) {
      setError('Delete failed: ' + err.message);
      console.error('Delete error:', err);
    }
  };

  const cancelDelete = () => {
    setDeleteModal({ show: false, fileId: null, fileName: '' });
  };

  const handleDownload = (file) => {
    setViewerModal({ show: true, file });
  };

  const closeViewer = () => {
    setViewerModal({ show: false, file: null });
  };

  const usedBytes = user?.storage_used || 0;
  const totalBytes = user?.storage_total || 10737418240;
  const usedGB = (usedBytes / (1024 ** 3)).toFixed(2);
  const totalGB = (totalBytes / (1024 ** 3)).toFixed(0);
  const usedPercent = (usedBytes / totalBytes) * 100;

  // Calculate storage by file type
  const storageByType = files.reduce((acc, file) => {
    const type = file.type === 'image' ? 'Images' : 
                 file.type === 'video' ? 'Videos' : 'Documents';
    acc[type] = (acc[type] || 0) + (file.size_bytes || 0);
    return acc;
  }, {});

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
    return (bytes / 1073741824).toFixed(2) + ' GB';
  };

  const filtered = files.filter(f => {
    const matchType = filter === "all" || f.type === filter;
    const matchSearch = f.name.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#E8EDE0", minHeight: "100vh", color: "#1C2416" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #A3B48A; border-radius: 4px; }

        .sidebar-btn {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 14px; border-radius: 10px;
          border: none; background: transparent;
          color: #6B7D5A; cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px; font-weight: 500;
          transition: all 0.2s; width: 100%; text-align: left;
        }
        .sidebar-btn:hover { background: #D4DEC8; color: #1C2416; }
        .sidebar-btn.active { background: #D4DEC8; color: #1C2416; }

        .filter-btn {
          padding: 7px 16px; border-radius: 20px;
          border: 1.5px solid #B8C9A3; background: transparent;
          color: #6B7D5A; cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px; font-weight: 500;
          transition: all 0.2s;
        }
        .filter-btn:hover { border-color: #8BA370; color: #2E3D22; }
        .filter-btn.active { background: #2E3D22; color: #E8EDE0; border-color: #2E3D22; }

        .file-card {
          background: #FFFFFF; border: 1px solid #E5E7EB;
          border-radius: 14px; padding: 16px;
          cursor: pointer; transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s ease, border-color 0.2s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          will-change: transform;
        }
        .file-card:hover { 
          border-color: #8BA370; 
          transform: translateY(-6px) scale(1.02); 
          box-shadow: 0 16px 32px rgba(44, 62, 34, 0.14), 0 4px 8px rgba(44, 62, 34, 0.08);
        }
        .file-card:active {
          transform: translateY(-2px) scale(0.99);
          box-shadow: 0 4px 12px rgba(44, 62, 34, 0.1);
        }

        .file-row {
          display: flex; align-items: center; gap: 14px;
          padding: 12px 16px; border-radius: 12px;
          cursor: pointer; transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease, background 0.15s ease;
          border: 1px solid transparent;
          background: #FFFFFF;
          will-change: transform;
        }
        .file-row:hover { 
          background: #F4F7F0; 
          border-color: #C4D4B0; 
          transform: translateX(4px);
          box-shadow: 0 2px 12px rgba(44, 62, 34, 0.08);
        }
        .file-row:active {
          transform: translateX(2px);
        }

        .upload-zone {
          border: 2px dashed #D1D5DB; border-radius: 16px;
          padding: 40px 32px; text-align: center;
          cursor: pointer; transition: all 0.25s;
          background: #FFFFFF;
        }
        .upload-zone.drag { 
          border-color: #7BA05B; 
          background: #F0F9EA; 
        }
        .upload-zone:hover { 
          border-color: #8BA370; 
          background: #FAFBF9;
        }

        .storage-bar {
          height: 6px; background: #C4D4B0; border-radius: 99px; overflow: hidden;
        }
        .storage-fill {
          height: 100%; border-radius: 99px;
          background: linear-gradient(90deg, #4A7C3F, #7BA05B);
          transition: width 0.5s ease;
        }

        .icon-box {
          width: 48px; height: 48px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; transition: all 0.2s;
        }
        
        .file-thumbnail {
          width: 100%; height: 120px; border-radius: 10px;
          object-fit: cover; margin-bottom: 12px;
          background: #F3F4F6;
        }

        .view-btn {
          padding: 7px; border-radius: 8px; border: none;
          background: transparent; color: #6B7D5A; cursor: pointer;
          transition: all 0.15s; display: flex; align-items: center;
        }
        .view-btn.active { background: #D4DEC8; color: #1C2416; }
        .view-btn:hover { color: #2E3D22; }

        .modal-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(28, 36, 22, 0.5); backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          z-index: 9999; animation: fadeIn 0.2s ease;
        }
        .modal-content {
          background: #FFFFFF; border-radius: 16px; padding: 28px;
          max-width: 400px; width: 90%; box-shadow: 0 20px 60px rgba(28, 36, 22, 0.3);
          animation: slideUp 0.3s ease;
        }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .modal-buttons { display: flex; gap: 10px; margin-top: 24px; }
        .modal-btn {
          flex: 1; padding: 11px 20px; border-radius: 10px; border: none;
          font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600;
          cursor: pointer; transition: all 0.2s;
        }
        .modal-btn-cancel {
          background: #E5E7EB; color: #374151;
        }
        .modal-btn-cancel:hover { background: #D1D5DB; }
        .modal-btn-delete {
          background: #DC2626; color: white;
        }
        .modal-btn-delete:hover { background: #B91C1C; }

        .viewer-modal {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.95); backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center;
          z-index: 10000; animation: fadeIn 0.2s ease;
          padding: 20px;
        }
        .viewer-content {
          max-width: 90vw; max-height: 90vh;
          display: flex; flex-direction: column; align-items: center;
          gap: 20px;
        }
        .viewer-header {
          display: flex; justify-content: space-between; align-items: center;
          width: 100%; padding: 0 10px;
        }
        .viewer-close {
          background: rgba(255,255,255,0.1); border: none; color: white;
          width: 40px; height: 40px; border-radius: 50%; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s;
        }
        .viewer-close:hover { background: rgba(255,255,255,0.2); }
        .viewer-media {
          max-width: 100%; max-height: 80vh; border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        }
        .viewer-download {
          background: #4A7C3F; color: white; border: none;
          padding: 12px 24px; border-radius: 10px; cursor: pointer;
          font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600;
          display: flex; align-items: center; gap: 8px; transition: all 0.2s;
        }
        .viewer-download:hover { background: #3d6734; }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeIn 0.3s ease forwards; }
      `}</style>

      <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>

        {/* Sidebar */}
        <aside style={{ width: 220, background: "#D4DEC8", borderRight: "1px solid #B8C9A3", padding: "24px 14px", display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
          {/* Logo */}
          <div style={{ padding: "4px 14px 20px" }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 20, letterSpacing: "-0.5px", color: "#1C2416" }}>
              nian<span style={{ color: "#E07A2F" }}>.</span>
            </div>
            <div style={{ fontSize: 11, color: "#6B7D5A", marginTop: 2 }}>personal storage</div>
          </div>

          <button className="sidebar-btn active">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5" style={{width:18,height:18}}>
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            Home
          </button>
          <button className="sidebar-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{width:18,height:18}}>
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
            </svg>
            My Files
          </button>
          <button className="sidebar-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{width:18,height:18}}>
              <rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
            </svg>
            Photos
          </button>
          <button className="sidebar-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{width:18,height:18}}>
              <rect x="2" y="6" width="14" height="12" rx="2"/><path d="M16 10l6-3v10l-6-3V10z"/>
            </svg>
            Videos
          </button>
          <button className="sidebar-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{width:18,height:18}}>
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
            Documents
          </button>

          <div style={{ flex: 1 }} />

          {/* Storage */}
          <div style={{ padding: "14px", background: "#DDE8D2", borderRadius: 12, border: "1px solid #C4D4B0" }}>
            <div style={{ fontSize: 12, color: "#6B7D5A", marginBottom: 8 }}>Storage used</div>
            <div className="storage-bar">
              <div className="storage-fill" style={{ width: `${usedPercent}%` }} />
            </div>
            <div style={{ fontSize: 12, color: "#6B7D5A", marginTop: 8, marginBottom: 12 }}>
              <span style={{ color: "#1C2416", fontWeight: 600 }}>{usedGB} GB</span> / {totalGB} GB
            </div>
            
            {/* Storage breakdown by type */}
            <div style={{ 
              borderTop: "1px solid #C4D4B0", 
              paddingTop: 10, 
              display: "flex", 
              flexDirection: "column", 
              gap: 6 
            }}>
              {Object.entries(storageByType).map(([type, bytes]) => (
                <div key={type} style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center",
                  fontSize: 11
                }}>
                  <span style={{ color: "#6B7D5A" }}>{type}</span>
                  <span style={{ color: "#1C2416", fontWeight: 600 }}>{formatBytes(bytes)}</span>
                </div>
              ))}
              {Object.keys(storageByType).length === 0 && (
                <div style={{ fontSize: 11, color: "#9CA88A", textAlign: "center" }}>
                  No files yet
                </div>
              )}
            </div>
          </div>

          {/* Avatar */}
          <div style={{ 
            display: "flex", 
            flexDirection: "column", 
            gap: 8,
            padding: "10px 6px",
            borderTop: "1px solid #C4D4B0",
            paddingTop: 14
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ 
                width: 32, 
                height: 32, 
                borderRadius: "50%", 
                background: "linear-gradient(135deg, #4A7C3F, #7BA05B)", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                fontSize: 13, 
                fontWeight: 700, 
                color: "#fff" 
              }}>
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ 
                  fontSize: 13, 
                  fontWeight: 600, 
                  color: "#1C2416",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis"
                }}>
                  {user?.name || 'User'}
                </div>
                <div style={{ fontSize: 11, color: "#6B7D5A" }}>Free plan</div>
              </div>
            </div>
            <button
              onClick={onLogout}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "1.5px solid #C4D4B0",
                background: "transparent",
                color: "#6B7D5A",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.2s",
                fontFamily: "'DM Sans', sans-serif"
              }}
              onMouseEnter={(e) => {
                e.target.style.background = "#FEE2E2";
                e.target.style.borderColor = "#FCA5A5";
                e.target.style.color = "#991B1B";
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "transparent";
                e.target.style.borderColor = "#C4D4B0";
                e.target.style.color = "#6B7D5A";
              }}
            >
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main */}
        <main style={{ flex: 1, overflow: "auto", padding: "28px 32px", display: "flex", flexDirection: "column" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
            <div>
              <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 26, letterSpacing: "-0.5px", color: "#1C2416" }}>My Storage</h1>
              <p style={{ fontSize: 13, color: "#6B7D5A", marginTop: 3 }}>
                {loading ? 'Loading...' : `${files.length} files · ${usedGB} GB used`}
              </p>
            </div>
            <div style={{ position: "relative" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#6B7D5A" strokeWidth="2" style={{ width: 16, height: 16, position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}>
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search files..."
                style={{
                  background: "#DDE8D2", border: "1.5px solid #C4D4B0",
                  borderRadius: 10, padding: "9px 14px 9px 36px",
                  color: "#1C2416", fontSize: 13, outline: "none",
                  fontFamily: "'DM Sans', sans-serif", width: 220,
                }}
              />
            </div>
          </div>

          {/* Upload Zone */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="*/*"
            style={{ display: 'none' }}
            onChange={(e) => handleFileUpload(e.target.files)}
          />
          <div
            className={`upload-zone ${dragging ? "drag" : ""}`}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { 
              e.preventDefault(); 
              setDragging(false); 
              handleFileUpload(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            style={{ marginBottom: 28 }}
          >
            {uploadProgress.uploading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#4A7C3F" strokeWidth="2" style={{ width: 48, height: 48, marginBottom: 12, animation: 'spin 1s linear infinite' }}>
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                  <path d="M12 2a10 10 0 0110 10" strokeLinecap="round" />
                </svg>
                <style>{
                  `@keyframes spin { to { transform: rotate(360deg); } }`
                }</style>
                <div style={{ fontWeight: 600, fontSize: 15, color: "#4A7C3F", marginBottom: 12, textAlign: 'center', maxWidth: '80%' }}>
                  {uploadProgress.phase === 'processing' ? 'Processing...' : `Uploading ${uploadProgress.fileName}`}
                </div>
                <div style={{ 
                  width: '100%', 
                  maxWidth: 300, 
                  height: 8, 
                  background: '#DDE8D2', 
                  borderRadius: 99, 
                  overflow: 'hidden',
                  marginBottom: 8
                }}>
                  <div style={{ 
                    width: `${uploadProgress.progress}%`, 
                    height: '100%', 
                    background: 'linear-gradient(90deg, #4A7C3F, #7BA05B)',
                    transition: 'width 0.3s ease',
                    borderRadius: 99
                  }} />
                </div>
                <div style={{ fontSize: 13, color: "#6B7D5A", fontWeight: 600 }}>
                  {uploadProgress.progress}%
                </div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 28, marginBottom: 8 }}>☁️</div>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Drop files here to upload</div>
                <div style={{ fontSize: 13, color: "#6B7D5A" }}>or <span style={{ color: "#4A7C3F", cursor: "pointer" }}>browse files</span> from your device</div>
              </>
            )}
          </div>

          {error && (
            <div style={{ 
              background: "#FEE2E2", 
              border: "1.5px solid #FCA5A5", 
              borderRadius: 10, 
              padding: 12, 
              marginBottom: 20,
              color: "#991B1B",
              fontSize: 13
            }}>
              {error}
            </div>
          )}

          {/* Filters + View Toggle */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div style={{ display: "flex", gap: 8 }}>
              {["all", "image", "video", "doc"].map(f => (
                <button key={f} className={`filter-btn ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>
                  {f === "all" ? "All" : f === "image" ? "Photos" : f === "video" ? "Videos" : "Docs"}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <button className={`view-btn ${view === "grid" ? "active" : ""}`} onClick={() => setView("grid")}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:16,height:16}}>
                  <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                  <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                </svg>
              </button>
              <button className={`view-btn ${view === "list" ? "active" : ""}`} onClick={() => setView("list")}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:16,height:16}}>
                  <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Files */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#8BA370" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#4A7C3F" strokeWidth="2" style={{ width: 56, height: 56, marginBottom: 16, animation: 'spin 1s linear infinite', display: 'inline-block' }}>
                <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                <path d="M12 2a10 10 0 0110 10" strokeLinecap="round" />
              </svg>
              <div style={{ fontWeight: 600, color: "#2E3D22" }}>Loading files...</div>
            </div>
          ) : view === "grid" ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
              {filtered.map((f, i) => (
                <div key={f.id} className="file-card fade-in" style={{ animationDelay: `${i * 0.05}s`, position: 'relative' }}>
                  <div 
                    onClick={() => handleDownload(f)}
                    style={{ cursor: 'pointer' }}
                  >
                    {f.type === 'image' ? (
                      <img 
                        src={f.url} 
                        alt={f.name} 
                        className="file-thumbnail"
                        onError={(e) => {
                          console.error('Failed to load image:', f.url);
                          e.target.style.display = 'none';
                        }}
                        onLoad={() => console.log('Image loaded:', f.url)}
                      />
                    ) : (
                      <div className="icon-box" style={{ background: f.color + "15", color: f.color, marginBottom: 12 }}>
                        {icons[f.type] || icons['doc']}
                      </div>
                    )}
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "#1C2416" }}>{f.name}</div>
                    <div style={{ fontSize: 11, color: "#6B7D5A" }}>{f.size} · {new Date(f.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(f.id, f.name);
                    }}
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      background: '#FEE2E2',
                      border: 'none',
                      borderRadius: 6,
                      padding: 6,
                      cursor: 'pointer',
                      color: '#DC2626',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: 0.8,
                      transition: 'opacity 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.opacity = '1'}
                    onMouseLeave={(e) => e.target.style.opacity = '0.8'}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:14,height:14}}>
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {filtered.map((f, i) => (
                <div key={f.id} className="file-row fade-in" style={{ animationDelay: `${i * 0.04}s` }}>
                  <div 
                    onClick={() => handleDownload(f)}
                    style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, cursor: 'pointer' }}
                  >
                    {f.type === 'image' ? (
                      <img 
                        src={f.url} 
                        alt={f.name} 
                        style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} 
                        onError={(e) => {
                          console.error('Failed to load image:', f.url);
                          e.target.style.display = 'none';
                        }}
                        onLoad={() => console.log('Image loaded:', f.url)}
                      />
                    ) : (
                      <div className="icon-box" style={{ background: f.color + "15", color: f.color, width: 48, height: 48 }}>
                        {icons[f.type] || icons['doc']}
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: "#1C2416" }}>{f.name}</div>
                      <div style={{ fontSize: 12, color: "#6B7D5A" }}>{new Date(f.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                    </div>
                    <div style={{ fontSize: 12, color: "#6B7D5A", marginRight: 8 }}>{f.size}</div>
                  </div>
                  <button
                    onClick={() => handleDelete(f.id, f.name)}
                    style={{ background: "transparent", border: "none", color: "#DC2626", cursor: "pointer", padding: 8 }}
                    title="Delete file"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:16,height:16}}>
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#8BA370" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#8BA370" strokeWidth="2" style={{ width: 56, height: 56, marginBottom: 16, display: 'inline-block' }}>
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <div style={{ fontWeight: 600, color: "#2E3D22" }}>No files found</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>Try a different search or filter</div>
            </div>
          )}

          {/* Footer */}
          <div style={{ flex: 1 }} />
          <footer style={{
            marginTop: 40, paddingTop: 20,
            borderTop: "1px solid #C4D4B0",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexWrap: "wrap", gap: 12
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 15, color: "#1C2416" }}>nian<span style={{ color: "#E07A2F" }}>.</span></span>
              <span style={{ fontSize: 12, color: "#8BA370" }}>· Your personal cloud storage</span>
            </div>
            <div style={{ display: "flex", gap: 20 }}>
              {["Privacy", "Terms", "Help", "Contact"].map(link => (
                <span key={link} style={{ fontSize: 12, color: "#6B7D5A", cursor: "pointer", transition: "color 0.15s" }}
                  onMouseEnter={e => e.target.style.color = "#2E3D22"}
                  onMouseLeave={e => e.target.style.color = "#6B7D5A"}
                >{link}</span>
              ))}
            </div>
            <div style={{ fontSize: 12, color: "#8BA370" }}>© 2026 Nian Storage. All rights reserved.</div>
          </footer>
        </main>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <div className="modal-overlay" onClick={cancelDelete}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <div style={{ 
                width: 48, 
                height: 48, 
                borderRadius: 12, 
                background: '#FEE2E2', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" style={{width:24,height:24}}>
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ 
                  margin: 0, 
                  fontSize: 18, 
                  fontWeight: 700, 
                  color: '#1C2416', 
                  marginBottom: 8,
                  fontFamily: "'Syne', sans-serif"
                }}>
                  Delete File?
                </h3>
                <p style={{ 
                  margin: 0, 
                  fontSize: 14, 
                  color: '#6B7D5A', 
                  lineHeight: 1.5 
                }}>
                  Are you sure you want to delete <strong style={{ color: '#1C2416' }}>"{deleteModal.fileName}"</strong>? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="modal-buttons">
              <button className="modal-btn modal-btn-cancel" onClick={cancelDelete}>
                Cancel
              </button>
              <button className="modal-btn modal-btn-delete" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File Viewer Modal */}
      {viewerModal.show && viewerModal.file && (
        <div className="viewer-modal" onClick={closeViewer}>
          <div className="viewer-content" onClick={(e) => e.stopPropagation()}>
            <div className="viewer-header">
              <div style={{ color: 'white', fontSize: 16, fontWeight: 600 }}>
                {viewerModal.file.name}
              </div>
              <button className="viewer-close" onClick={closeViewer}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:20,height:20}}>
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            
            {viewerModal.file.type === 'image' ? (
              <img 
                src={viewerModal.file.url} 
                alt={viewerModal.file.name} 
                className="viewer-media"
                style={{ objectFit: 'contain' }}
              />
            ) : viewerModal.file.type === 'video' ? (
              <video 
                src={viewerModal.file.url} 
                controls 
                autoPlay
                className="viewer-media"
                style={{ width: '100%' }}
              >
                Your browser does not support the video tag.
              </video>
            ) : viewerModal.file.type === 'pdf' ? (
              <iframe
                src={viewerModal.file.url}
                style={{ width: '100%', height: '72vh', border: 'none', borderRadius: 8, background: '#fff' }}
                title={viewerModal.file.name}
              />
            ) : viewerModal.file.type === 'docx' || viewerModal.file.type === 'xlsx' ? (
              <iframe
                src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(viewerModal.file.url)}`}
                style={{ width: '100%', height: '72vh', border: 'none', borderRadius: 8, background: '#fff' }}
                title={viewerModal.file.name}
              />
            ) : viewerModal.file.type === 'txt' ? (
              <div style={{ width: '100%', height: '72vh', overflowY: 'auto', background: '#1a1a2e', borderRadius: 8, padding: '16px 20px', boxSizing: 'border-box' }}>
                {txtContent === null ? (
                  <div style={{ color: '#aaa', textAlign: 'center', paddingTop: 80 }}>Loading...</div>
                ) : (
                  <pre style={{ margin: 0, color: '#e2e8f0', fontFamily: 'monospace', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{txtContent}</pre>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, color: '#aaa', gap: 12 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{width:48,height:48,opacity:0.4}}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                <span style={{fontSize:14}}>Preview not available — use Download</span>
              </div>
            )}

            <button 
              className="viewer-download"
              onClick={() => {
                const link = document.createElement('a');
                link.href = viewerModal.file.url;
                link.download = viewerModal.file.name;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:18,height:18}}>
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
