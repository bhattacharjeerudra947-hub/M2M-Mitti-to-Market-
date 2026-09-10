import { useEffect } from 'react';
import { X, Download, ExternalLink, FileText } from 'lucide-react';

/**
 * Document preview modal for images and PDFs.
 * Supports zoom, direct download, and external view.
 */
export default function DocumentModalPreview({ isOpen, onClose, docTitle, docUrl, mimeType }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !docUrl) return null;

  const isPdf = (mimeType && mimeType.includes('pdf')) || docUrl.toLowerCase().includes('.pdf');
  const isImage = (mimeType && mimeType.startsWith('image/')) || /\.(jpg|jpeg|png|webp|gif|svg)($|\?)/i.test(docUrl);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = docUrl;
    link.target = '_blank';
    link.download = docTitle || 'document';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-navy-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/70">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base">
                {docTitle || 'Document Preview'}
              </h3>
              <p className="text-xs text-gray-500">
                {isPdf ? 'PDF Document' : isImage ? 'Image Document' : 'Document File'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl transition shadow-sm"
              title="Download original file"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">Download</span>
            </button>
            <a
              href={docUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl transition shadow-sm"
              title="Open in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span className="hidden sm:inline">Open</span>
            </a>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 flex items-center justify-center bg-gray-100/50 dark:bg-gray-950/50 min-h-[300px]">
          {isImage ? (
            <div className="max-w-full max-h-[70vh] flex items-center justify-center">
              <img
                src={docUrl}
                alt={docTitle || 'Uploaded document'}
                className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-md border border-gray-200 dark:border-gray-800"
              />
            </div>
          ) : isPdf ? (
            <iframe
              src={`${docUrl}#toolbar=1`}
              title={docTitle || 'PDF Preview'}
              className="w-full h-[65vh] rounded-xl border border-gray-200 dark:border-gray-800 shadow-inner bg-white"
            />
          ) : (
            <div className="text-center py-12 space-y-4">
              <FileText className="w-16 h-16 text-gray-400 mx-auto" />
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  Preview not available inline for this format
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  You can download or open the file in a new browser tab.
                </p>
              </div>
              <button
                onClick={handleDownload}
                className="px-5 py-2.5 bg-navy-900 text-white font-semibold rounded-xl text-xs hover:bg-navy-800 transition shadow-sm inline-flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> Download Document
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
