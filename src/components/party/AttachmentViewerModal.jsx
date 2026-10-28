import React, { useState } from 'react';
import {
  X,
  Download,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  FileText,
  Cloud,
  CheckCircle2,
  Calendar,
  DollarSign,
} from 'lucide-react';

export default function AttachmentViewerModal({
  attachment,
  title = 'Receipt / Bill Attachment',
  onClose,
  currentLang = 'en',
}) {
  const [zoomLevel, setZoomLevel] = useState(1);

  if (!attachment || !attachment.url) return null;

  const url = attachment.url;
  const fileName = attachment.name || 'document_receipt';
  const isImage =
    (attachment.type && attachment.type.startsWith('image/')) ||
    url.startsWith('data:image/') ||
    /\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i.test(url);
  const isPdf =
    (attachment.type && attachment.type.includes('pdf')) ||
    url.startsWith('data:application/pdf') ||
    /\.pdf(\?.*)?$/i.test(url);

  const handleZoomIn = () => setZoomLevel((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(z - 0.25, 0.5));
  const handleResetZoom = () => setZoomLevel(1);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 animate-in fade-in">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold tracking-wider uppercase bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30 flex items-center gap-1">
                  <Cloud className="w-3 h-3" />
                  <span>{attachment.provider === 'supabase' ? 'Supabase Storage' : 'Secure Media'}</span>
                </span>
                {attachment.billNo && (
                  <span className="text-xs font-mono text-slate-300">#{attachment.billNo}</span>
                )}
              </div>
              <h3 className="text-sm md:text-base font-bold text-white truncate mt-0.5">
                {title}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleDownload}
              title="Download Attachment"
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="flex-1 bg-slate-100/90 relative overflow-auto flex items-center justify-center p-4 min-h-[300px]">
          {isImage ? (
            <div className="max-w-full max-h-full flex items-center justify-center overflow-auto p-2">
              <img
                src={url}
                alt={fileName}
                style={{ transform: `scale(${zoomLevel})`, transition: 'transform 0.15s ease-out' }}
                className="max-h-[60vh] max-w-full object-contain rounded-xl shadow-md border border-slate-300/80 bg-white"
              />
            </div>
          ) : isPdf ? (
            <div className="text-center p-8 bg-white rounded-2xl border border-slate-200 shadow-sm max-w-md">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
                <FileText className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm md:text-base mb-1 truncate">
                {fileName}
              </h4>
              <p className="text-xs text-slate-500 mb-5">
                PDF Invoice / Document stored securely in Supabase Storage.
              </p>
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF</span>
                </button>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open Full Document</span>
                </a>
              </div>
            </div>
          ) : (
            <div className="text-center p-8 bg-white rounded-2xl border border-slate-200 shadow-sm max-w-md">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <FileText className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm mb-1 truncate">{fileName}</h4>
              <p className="text-xs text-slate-500 mb-5">
                Document attachment verified.
              </p>
              <button
                onClick={handleDownload}
                className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>Download File</span>
              </button>
            </div>
          )}

          {/* Floating Zoom Controls for Images */}
          {isImage && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2 border border-slate-700">
              <button
                onClick={handleZoomOut}
                className="p-1 hover:bg-slate-800 rounded-full text-slate-300 hover:text-white cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-mono font-bold w-12 text-center text-slate-200">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                className="p-1 hover:bg-slate-800 rounded-full text-slate-300 hover:text-white cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <div className="w-px h-3.5 bg-slate-700" />
              <button
                onClick={handleResetZoom}
                className="p-1 hover:bg-slate-800 rounded-full text-slate-300 hover:text-white cursor-pointer"
                title="Reset Zoom"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="bg-white px-5 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 flex-wrap gap-2">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-medium truncate max-w-[200px] md:max-w-xs">{fileName}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">
              {attachment.provider === 'supabase' ? 'Supabase Storage Bucket' : 'Verified Local Copy'}
            </span>
            <button
              onClick={onClose}
              className="px-3 py-1 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
