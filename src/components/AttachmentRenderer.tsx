import { useState, useEffect } from "react";
import { FileText, Download, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Attachment {
  url: string;
  name: string;
  type: string;
  size: number;
}

interface AttachmentRendererProps {
  attachment: Attachment;
  isSender: boolean;
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const isImageFile = (type: string) => type.startsWith('image/');

const AttachmentRenderer = ({ attachment, isSender }: AttachmentRendererProps) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);

  useEffect(() => {
    const getSignedUrl = async () => {
      try {
        let filePath = attachment.url;
        
        if (filePath.startsWith('http')) {
          const match = filePath.match(/message-attachments\/(.+)$/);
          if (match) {
            filePath = match[1];
          } else {
            setSignedUrl(filePath);
            setLoading(false);
            return;
          }
        }
        
        const { data, error: signError } = await supabase.storage
          .from('message-attachments')
          .createSignedUrl(filePath, 3600);
        
        if (signError) {
          console.error('Error getting signed URL:', signError);
          setError(true);
        } else {
          setSignedUrl(data.signedUrl);
        }
      } catch (err) {
        console.error('Error getting signed URL:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    getSignedUrl();
  }, [attachment.url]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  if (error || !signedUrl) {
    return (
      <div className={`flex items-center gap-2 p-2 rounded-md ${
        isSender ? "bg-primary-foreground/20" : "bg-background"
      }`}>
        <FileText className="h-4 w-4 flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm truncate">{attachment.name}</p>
          <p className="text-xs opacity-70">Unable to load</p>
        </div>
      </div>
    );
  }

  if (isImageFile(attachment.type)) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowFullscreen(true)}
          className="cursor-pointer border-0 bg-transparent p-0"
        >
          <img 
            src={signedUrl} 
            alt={attachment.name}
            className="max-w-full rounded-md max-h-48 object-cover hover:opacity-90 transition-opacity"
          />
        </button>

        {showFullscreen && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-sm"
            onClick={() => setShowFullscreen(false)}
          >
            <button
              onClick={(e) => { e.stopPropagation(); setShowFullscreen(false); }}
              className="absolute top-4 right-4 z-[101] rounded-full bg-secondary p-2 text-foreground hover:bg-muted transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
            <img
              src={signedUrl}
              alt={attachment.name}
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </>
    );
  }

  return (
    <a 
      href={signedUrl} 
      target="_blank" 
      rel="noopener noreferrer"
      className={`flex items-center gap-2 p-2 rounded-md ${
        isSender ? "bg-primary-foreground/20" : "bg-background"
      }`}
    >
      <FileText className="h-4 w-4 flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm truncate">{attachment.name}</p>
        <p className="text-xs opacity-70">{formatFileSize(attachment.size)}</p>
      </div>
      <Download className="h-4 w-4 flex-shrink-0" />
    </a>
  );
};

export default AttachmentRenderer;
