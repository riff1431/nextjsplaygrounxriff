import { Video } from "lucide-react";

const CameraPreview = () => {
  return (
    <div className="glass-panel p-4">
      <div className="relative rounded-lg overflow-hidden h-48 bg-muted/40 border border-border flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10" />
        <div className="relative flex flex-col items-center gap-2 text-muted-foreground">
          <Video className="w-10 h-10 text-primary/60" />
          <span className="text-xs font-semibold">Camera Preview</span>
          <span className="text-[10px] text-muted-foreground">No active stream</span>
        </div>
      </div>
    </div>
  );
};

export default CameraPreview;
