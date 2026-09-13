import { useState, useEffect, useRef } from 'react';
import { Upload, FileText, X, Camera, Image, FolderOpen, CheckCircle, CheckCircle2, AlertCircle, Loader2, ExternalLink, RefreshCw, Check } from 'lucide-react';
import { uploadDocument } from '../services/api';

/**
 * Reusable document upload component.
 * Supports:
 * - PDF documents and images (5MB max) — click to select
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
  const [justUploaded, setJustUploaded] = useState(false);
  const [uploadedDoc, setUploadedDoc] = useState(existingDoc);
  const [showMenu, setShowMenu] = useState(false);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  useEffect(() => {
    if (existingDoc) {
      setUploadedDoc(existingDoc);
      setSuccess(true);
    }
  }, [existingDoc]);

  const DEFAULT_MAX_DOC = 5 * 1024 * 1024;
  const DEFAULT_MAX_PHOTO = 5 * 1024 * 1024;
  const DEFAULT_DOC_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const DEFAULT_PHOTO_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  const finalMaxSize = maxSize || (isPhoto ? DEFAULT_MAX_PHOTO : DEFAULT_MAX_DOC);
  const finalAllowedTypes = acceptTypes || (isPhoto ? DEFAULT_PHOTO_TYPES : DEFAULT_DOC_TYPES);
  const acceptAttr = isPhoto
    ? 'image/jpeg,image/jpg,image/png,image/webp'
    : 'application/pdf,image/jpeg,image/jpg,image/png,image/webp';

  const formatFileSize = (bytes) => {
    if (!bytes || bytes <= 0) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const validateFile = (f) => {
    if (!f) return 'Please select a file';
    if (!finalAllowedTypes.includes(f.type)) {
      return isPhoto
        ? 'Photo must be JPG, JPEG, PNG, or WebP'
        : 'Document must be a PDF or Image (JPG, PNG, WebP)';
    }
    const name = f.name.toLowerCase();
    if (!name.match(/\.(pdf|jpg|jpeg|png|webp)$/)) {
      return 'File must be a valid PDF or Image file';
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
    setJustUploaded(false);
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
    if (selected.type.startsWith('image/')) {
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
      const docData = result.data?.data || result.data;
      setSuccess(true);
      setJustUploaded(true);
      setUploadedDoc(docData);
      setFile(null);
      setPreview(null);
      if (onUploadComplete) onUploadComplete(docData);
    } else {
      setError(result.error || 'Upload failed');
    }
  };

  const handleRemove = () => {
    setFile(null);
    setPreview(null);
    setError('');
    setSuccess(false);
    setJustUploaded(false);
    setUploadedDoc(null);
    setShowMenu(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  // ─── Show existing document status with prominent green tick mark ───
  if (success && uploadedDoc) {
    const isPending = uploadedDoc.verificationStatus === 'PENDING' || !uploadedDoc.verificationStatus;
    const isVerified = uploadedDoc.verificationStatus === 'VERIFIED';
    const isRejected = uploadedDoc.verificationStatus === 'REJECTED';
    const isReUpload = uploadedDoc.verificationStatus === 'RE_UPLOAD_REQUESTED';

    return (
      <div className={`rounded-2xl border-2 transition-all duration-300 p-4 sm:p-5 shadow-xs ${
        justUploaded
          ? 'bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 border-emerald-400 ring-4 ring-emerald-500/20'
          : isVerified
            ? 'bg-emerald-50/70 border-emerald-200'
            : isRejected
              ? 'bg-red-50/70 border-red-200'
              : isReUpload
                ? 'bg-amber-50/70 border-amber-300'
                : 'bg-gradient-to-br from-emerald-50/60 to-teal-50/40 border-emerald-200'
      }`}>
        {/* ─── Prominent Success Header with Green Tick Mark Sign ─── */}
        <div className="flex items-center justify-between gap-3 mb-3.5 pb-3 border-b border-emerald-200/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md shrink-0 ring-4 ring-emerald-100 animate-in zoom-in-75 duration-300">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-extrabold text-emerald-950 flex items-center gap-1.5 tracking-tight">
                  Successfully Uploaded <span className="text-emerald-600 text-base font-black">✓</span>
                </h4>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-600 text-white shadow-2xs">
                  <Check className="w-3 h-3 stroke-[3]" /> Uploaded
                </span>
              </div>
              <p className="text-xs text-emerald-800 font-medium mt-0.5">
                {isPhoto
                  ? 'Your profile photo has been updated and securely saved.'
                  : 'Document successfully uploaded and submitted for verification.'}
              </p>
            </div>
          </div>

          {/* Action to re-upload / replace */}
          <button
            onClick={handleRemove}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:text-navy-900 bg-white/90 hover:bg-white border border-gray-200 rounded-xl shadow-2xs transition shrink-0"
            title="Upload a different file"
          >
            <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
            <span className="hidden sm:inline">Replace</span>
          </button>
        </div>

        {/* ─── File Details Card ─── */}
        <div className="flex items-center gap-3.5 bg-white/90 p-3 rounded-xl border border-emerald-100/90 shadow-2xs">
          {/* Thumbnail for photos or images */}
          {uploadedDoc.cloudinaryUrl && (uploadedDoc.mimeType?.startsWith('image/') || isPhoto) ? (
            <div className="relative group shrink-0">
              <img
                src={uploadedDoc.cloudinaryUrl}
                alt="Uploaded"
                className="w-13 h-13 rounded-xl object-cover border border-emerald-200 shadow-2xs"
              />
              <div className="absolute inset-0 bg-emerald-950/20 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                <Check className="w-4 h-4 text-white" />
              </div>
            </div>
          ) : (
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs">
              <FileText className="w-6 h-6" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-bold text-sm text-gray-900 truncate">
                {uploadedDoc.originalFilename || label}
              </p>
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-100/80 text-emerald-800">
                {uploadedDoc.originalFilename?.split('.').pop() || (isPhoto ? 'JPG' : 'PDF')}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600 mt-1">
              <span>{formatFileSize(uploadedDoc.fileSize || 0)}</span>
              <span>•</span>
              <span className="flex items-center gap-1 font-semibold">
                {isVerified ? (
                  <span className="text-emerald-700 flex items-center gap-1 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Verified by Admin
                  </span>
                ) : isRejected ? (
                  <span className="text-red-700 font-bold">❌ Rejected</span>
                ) : isReUpload ? (
                  <span className="text-amber-700 font-bold">⚠️ Re-upload Requested</span>
                ) : (
                  <span className="text-teal-700 flex items-center gap-1 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-ping" />
                    Pending Admin Verification
                  </span>
                )}
              </span>
            </div>

            {uploadedDoc.rejectionReason && (
              <p className="text-xs mt-1.5 font-medium text-red-700 bg-red-50 p-1.5 rounded-lg border border-red-100">
                Reason: {uploadedDoc.rejectionReason}
              </p>
            )}
          </div>

          {/* External view link if URL available */}
          {uploadedDoc.cloudinaryUrl && (
            <a
              href={uploadedDoc.cloudinaryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-navy-600 hover:text-navy-900 hover:bg-gray-100 rounded-xl transition shrink-0"
              title="View uploaded document"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
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
        accept={acceptAttr}
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
        /* ─── Document upload: PDF or image click to select ─── */
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition
            ${file ? 'border-emerald-400 bg-emerald-50/50' : 'border-gray-200 hover:border-emerald-300 hover:bg-gray-50/80 bg-gray-50/40'}`}
        >
          {file ? (
            <div className="space-y-2">
              <FileText className="w-9 h-9 mx-auto text-emerald-600" />
              <p className="text-sm font-bold text-gray-900">{file.name}</p>
              <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                File ready for upload
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="w-8 h-8 mx-auto text-gray-400" />
              <p className="text-sm font-medium text-gray-700">Click to select PDF or image document</p>
              <p className="text-xs text-gray-400">PDF, JPG, PNG, or WebP • Max 5MB</p>
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
          {error}
        </div>
      )}

      {/* Upload button */}
      {file && (
        <div className="flex gap-2">
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-60"
          >
            {uploading ? (
              <><Loader2 className="w-4 h-4 animate-spin text-white" /> Uploading & Encrypting...</>
            ) : (
              <><Upload className="w-4 h-4" /> Upload & Submit Document</>
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
