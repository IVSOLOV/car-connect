import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SupportAttachmentImageProps {
  path: string;
  alt: string;
  className?: string;
  onClick?: () => void;
  onSignedUrlReady?: (signedUrl: string) => void;
}

/**
 * Component to display support attachment images using signed URLs.
 * Since the support-attachments bucket is private, we need to generate
 * signed URLs to access the images.
 */
const SupportAttachmentImage = ({ 
  path, 
  alt, 
  className = "", 
  onClick,
  onSignedUrlReady 
}: SupportAttachmentImageProps) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const getSignedUrl = async () => {
      try {
        let filePath = path;
        
        // Check if it's already a full URL (legacy data with public URLs)
        if (filePath.startsWith('http')) {
          // Try to extract the path from the public URL
          const match = filePath.match(/support-attachments\/(.+?)(?:\?|$)/);
          if (match) {
            filePath = match[1];
          } else {
            // If we can't parse it, just use the URL directly (legacy support)
            setSignedUrl(filePath);
            onSignedUrlReady?.(filePath);
            setLoading(false);
            return;
          }
        }
        
        const { data, error: signError } = await supabase.storage
          .from('support-attachments')
          .createSignedUrl(filePath, 3600); // 1 hour expiry
        
        if (signError) {
          console.error('Error getting signed URL for support attachment:', signError);
          setError(true);
        } else {
          setSignedUrl(data.signedUrl);
          onSignedUrlReady?.(data.signedUrl);
        }
      } catch (err) {
        console.error('Error getting signed URL:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    getSignedUrl();
  }, [path, onSignedUrlReady]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-muted ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !signedUrl) {
    return (
      <div className={`flex items-center justify-center bg-muted ${className}`}>
        <span className="text-xs text-muted-foreground">Failed to load</span>
      </div>
    );
  }

  return (
    <img
      src={signedUrl}
      alt={alt}
      className={className}
      onClick={onClick}
      onError={(e) => {
        (e.target as HTMLImageElement).src = "/placeholder.svg";
      }}
    />
  );
};

export default SupportAttachmentImage;
