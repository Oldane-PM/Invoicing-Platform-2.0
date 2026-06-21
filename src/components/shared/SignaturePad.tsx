import * as React from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

interface SignaturePadProps {
  onSign: (signatureData: string, typedName: string) => void;
  onCancel: () => void;
}

export function SignaturePad({ onSign, onCancel }: SignaturePadProps) {
  const [activeTab, setActiveTab] = React.useState<"draw" | "type">("draw");
  const [typedName, setTypedName] = React.useState("");
  
  // Canvas refs
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = React.useState(false);

  // Initialize canvas context
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas dimensions to match container exactly, avoiding scaling blur
    const parent = canvas.parentElement;
    if (parent) {
      canvas.width = parent.clientWidth;
      canvas.height = 200;
    }

    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#000000";
  }, [activeTab]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ("touches" in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = ("touches" in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ("touches" in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = ("touches" in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    ctx.closePath();
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSign = () => {
    if (activeTab === "draw") {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      // Check if blank (rudimentary check by looking for pixels)
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const pixelBuffer = new Uint32Array(ctx.getImageData(0,0, canvas.width, canvas.height).data.buffer);
      const isBlank = !pixelBuffer.some(color => color !== 0);
      
      if (isBlank) {
        alert("Please draw your signature");
        return;
      }
      if (!typedName.trim()) {
        alert("Please print your name below the signature");
        return;
      }

      const dataUrl = canvas.toDataURL("image/png");
      onSign(dataUrl, typedName.trim());
    } else {
      if (!typedName.trim()) {
        alert("Please type your name");
        return;
      }
      
      // For typed, we create a canvas data URI with the text to simulate a signature
      const canvas = document.createElement("canvas");
      canvas.width = 400;
      canvas.height = 100;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#ffffff"; // Or transparent
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = "#000000";
        ctx.font = "italic 48px serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(typedName.trim(), canvas.width / 2, canvas.height / 2);
      }
      
      const dataUrl = canvas.toDataURL("image/png");
      onSign(dataUrl, typedName.trim());
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm max-w-lg w-full">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Sign Document</h3>
      
      {/* Tabs */}
      <div className="flex gap-2 mb-6 p-1 bg-gray-100 rounded-lg">
        <button
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === "draw" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
          }`}
          onClick={() => setActiveTab("draw")}
        >
          Draw Signature
        </button>
        <button
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === "type" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
          }`}
          onClick={() => setActiveTab("type")}
        >
          Type Signature
        </button>
      </div>

      <div className="space-y-4">
        {activeTab === "draw" ? (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Draw Signature</label>
            <div className="border border-gray-300 rounded-lg overflow-hidden bg-gray-50 relative">
              <canvas
                ref={canvasRef}
                className="w-full touch-none"
                style={{ cursor: "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"black\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z\"/><path d=\"m15 5 4 4\"/></svg>') 0 24, crosshair" }}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
              <button
                onClick={clearCanvas}
                className="absolute top-2 right-2 text-xs font-medium text-gray-500 hover:text-gray-900 bg-white/80 px-2 py-1 rounded"
              >
                Clear
              </button>
            </div>
            
            <div className="pt-2">
              <label className="text-sm font-medium text-gray-700 block mb-1">Printed Name</label>
              <Input
                placeholder="Type your full name"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Type your full name</label>
              <Input
                placeholder="John Doe"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                className="font-serif italic text-lg"
              />
            </div>
            <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 flex items-center justify-center min-h-[100px]">
              {typedName ? (
                <span className="font-serif italic text-3xl text-gray-900">{typedName}</span>
              ) : (
                <span className="text-gray-400 text-sm">Preview will appear here</span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 mt-8">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSign} className="bg-purple-600 hover:bg-purple-700 text-white">
          Sign & Submit
        </Button>
      </div>
    </div>
  );
}
