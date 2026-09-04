import { useState, useRef } from 'react';
import { Upload, FileText, X, Camera, Image, FolderOpen, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { uploadDocument } from '../services/api';

/**
 * Reusable document upload component.
 * Supports:
 * - PDF documents (3MB max) — click to select
 * - Profile photos (5MB max, JPG/PNG/WebP) — camera/gallery/files menu
 *
 * Props:
 *   documentType: string — e.g. "PROFILE_PHOTO", "AADHAAR_CARD", "BUSINESS_REGISTRATION"
 *   label: string — display label
 *   isPhoto: boolean — if true, shows camera/gallery/files menu instead of file picker
 *   acceptTypes: string[] — override allowed MIME types
 *   maxSize: number — override max file size in bytes
 *   onUploadComplete: (doc) => void — callback when upload succeeds
 *   existingDoc: object — if already uploaded, show status
 */
export default function DocumentUpload({
  documentType,
  label = 'Upload Document',
  isPhoto = false,
  acceptTypes,
  maxSize,
  onUploadComplete,
  existingDoc = null,
}) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(existingDoc ? true : false);
  const [uploadedDoc, setUploadedDoc] = useState(existingDoc);
  const [showMenu, setShowMenu] = useState(false);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const DEFAULT_MAX_DOC = 3 * 1024 * 1024;
  const DEFAULT_MAX_PHOTO = 5 * 1024 * 1024;
  const DEFAULT_DOC_TYPES = ['application/pdf'];
  const DEFAULT_PHOTO_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  const finalMaxSize = maxSize || (isPhoto ? DEFAULT_MAX_PHOTO : DEFAULT_MAX_DOC);
  const finalAllowedTypes = acceptTypes || (isPhoto ? DEFAULT_PHOTO_TYPES : DEFAULT_DOC_TYPES);
  const acceptAttr = isPhoto
    ? 'image/jpeg,image/jpg,image/png,image/webp'
    : 'application/pdf';

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const validateFile = (f) => {
    if (!f) return 'Please select a file';
    if (!finalAllowedTypes.includes(f.type)) {
      return isPhoto
        ? 'Photo must be JPG, JPEG, PNG, or WebP'
        : 'Document must be a PDF file';
    }
    const name = f.name.toLowerCase();
    if (isPhoto && !name.match(/\.(jpg|jpeg|png|webp)$/)) {
      return 'File extension does not match photo format';
    }
    if (!isPhoto && !name.endsWith('.pdf')) {
      return 'File must have .pdf extension';
    }
    if (f.size > finalMaxSize) {
      return `File too large. Maximum size is ${formatFileSize(finalMaxSize)}`;
    }
    return null;
  };

  const handleFileSelect = (e) => {
    const selected = e.target.files[0];
    setError('');
    setSuccess(false);
    setShowMenu(false);

    const validationError = validateFile(selected);
    if (validationError) {
      setError(validationError);
      setFile(null);
      setPreview(null);
      return;
    }

    setFile(selected);

    // Generate preview for images
    if (isPhoto && selected.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target.result);
      reader.readAsDataURL(selected);
    } else {
      setPreview(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError('');

    const result = await uploadDocument(file, documentType);
    setUploading(false);

    if (result.ok) {
      setSuccess(true);
      setUploadedDoc(result.data.data);
      setFile(null);
      setPreview(null);
      if (onUploadComplete) onUploadComplete(result.data.data);
    } else {
      setError(result.error || 'Upload failed');
    }
  };

  const handleRemove = () => {
    setFile(null);
    setPreview(null);
    setError('');
    setSuccess(false);
    setUploadedDoc(null);
    setShowMenu(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  // ─── Show existing document status ───
  if (success && uploadedDoc) {
    const statusColors = {
      PENDING: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      VERIFIED: 'bg-green-50 border-green-200 text-green-800',
      REJECTED: 'bg-red-50 border-red-200 text-red-800',
    };
    const statusLabels = {
      PENDING: '⏳ Pending Verification',
      VERIFIED: '✅ Verified',
      REJECTED: '❌ Rejected',
    };

    return (
      <div className={`rounded-xl border p-4 ${statusColors[uploadedDoc.verificationStatus] || statusColors.PENDING}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Show thumbnail for photos */}
            {uploadedDoc.cloudinaryUrl && uploadedDoc.mimeType?.startsWith('image/') && (
              <img
                src={uploadedDoc.cloudinaryUrl}
                alt="Uploaded"
                className="w-12 h-12 rounded-lg object-cover border"
              />
            )}
            {(!uploadedDoc.mimeType?.startsWith('image/')) && (
              <FileText className="w-5 h-5 flex-shrink-0" />
            )}
            <div>
              <p className="font-medium text-sm">{uploadedDoc.originalFilename}</p>
              <p className="text-xs opacity-75 mt-0.5">
                {formatFileSize(uploadedDoc.fileSize)} • {statusLabels[uploadedDoc.verificationStatus] || 'Unknown'}
              </p>
              {uploadedDoc.rejectionReason && (
                <p className="text-xs mt-1 font-medium">Reason: {uploadedDoc.rejectionReason}</p>
              )}
            </div>
          </div>
          {uploadedDoc.verificationStatus !== 'VERIFIED' && (
            <button
              onClick={handleRemove}
              className="p-1 hover:bg-white/50 rounded-lg transition"
              title="Remove and re-upload"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─── Main upload UI ───
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept={isPhoto ? acceptAttr : 'application/pdf'}
        onChange={handleFileSelect}
        className="hidden"
      />
      {isPhoto && (
        <>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />
        </>
      )}

      {isPhoto ? (
        /* ─── Photo upload: show menu with Camera / Gallery / Files ─── */
        <div className="space-y-2">
          {file ? (
            /* File selected — show preview */
            <div className="border-2 border-mustard-400 rounded-xl overflow-hidden bg-mustard-50">
              {preview && (
                <div className="relative">
                  <img src={preview} alt="Preview" className="w-full h-48 object-cover" />
                  <button
                    onClick={handleRemove}
                    className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <div className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{file.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                </div>
                <button
                  onClick={handleRemove}
                  className="text-xs text-red-600 font-medium hover:underline"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            /* No file — show camera/gallery/files buttons */
            <div className="space-y-2">
              {showMenu ? (
                <div className="border-2 border-gray-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition border-b border-gray-100"
                  >
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                      <Camera className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-gray-900">Camera</p>
                      <p className="text-xs text-gray-500">Take a new photo</p>
                    </div>
                  </button>
                  <button
                    onClick={() => { fileInputRef.current?.click(); fileInputRef.current.removeAttribute('capture'); }}
                    className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition border-b border-gray-100"
                  >
                    <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                      <Image className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-gray-900">Photos / Gallery</p>
                      <p className="text-xs text-gray-500">Choose from your photos</p>
                    </div>
                  </button>
                  <button
                    onClick={() => { fileInputRef.current?.click(); fileInputRef.current.removeAttribute('capture'); }}
                    className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition"
                  >
                    <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                      <FolderOpen className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-gray-900">Files</p>
                      <p className="text-xs text-gray-500">Browse device files</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setShowMenu(false)}
                    className="w-full p-3 bg-gray-50 text-center text-sm text-gray-500 hover:bg-gray-100 transition"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowMenu(true)}
                  className="w-full border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-mustard-400 hover:bg-mustard-50 transition"
                >
                  <Camera className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600 font-medium">Take Photo / Choose Photo</p>
                  <p className="text-xs text-gray-400 mt-1">JPG, PNG, or WebP • Max 5MB</p>
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        /* ─── PDF upload: simple click to select ─── */
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition
            ${file ? 'border-mustard-400 bg-mustard-50' : 'border-gray-200 hover:border-gray-300 bg-gray-50'}`}
        >
          {file ? (
            <div className="space-y-2">
              <FileText className="w-8 h-8 mx-auto text-mustard-600" />
              <p className="text-sm font-medium text-gray-900">{file.name}</p>
              <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="w-8 h-8 mx-auto text-gray-400" />
              <p className="text-sm text-gray-600">Click to select a PDF</p>
              <p className="text-xs text-gray-400">PDF only • Max 3MB</p>
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Upload button */}
      {file && (
        <div className="flex gap-2">
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="flex-1 py-2.5 bg-navy-900 text-white text-sm font-semibold rounded-xl hover:bg-navy-800 transition flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {uploading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
            ) : (
              <><Upload className="w-4 h-4" /> Upload</>
            )}
          </button>
          <button
            onClick={handleRemove}
            disabled={uploading}
            className="px-4 py-2.5 bg-gray-100 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-200 transition"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
