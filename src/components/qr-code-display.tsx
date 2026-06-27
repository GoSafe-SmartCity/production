"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import QRCodeStyling, { 
  DotType, 
  CornerSquareType, 
  CornerDotType 
} from "qr-code-styling";
import { Download, Upload, RotateCcw, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface QRCodeDisplayProps {
  url: string;
  shortCode: string;
}

const DEFAULT_LOGO = "/ute-logo.png";
const DISPLAY_SIZE = 280;
const DEFAULT_EXPORT_SIZE = 512;

// Dot style options
const DOT_STYLES: { value: DotType; label: string }[] = [
  { value: "square", label: "Vuông" },
  { value: "dots", label: "Chấm tròn" },
  { value: "rounded", label: "Bo góc" },
  { value: "extra-rounded", label: "Bo góc lớn" },
  { value: "classy", label: "Cổ điển" },
  { value: "classy-rounded", label: "Cổ điển bo" },
];

const CORNER_STYLES: { value: CornerSquareType; label: string }[] = [
  { value: "square", label: "Vuông" },
  { value: "dot", label: "Chấm" },
  { value: "extra-rounded", label: "Bo góc" },
];

const CORNER_DOT_STYLES: { value: CornerDotType; label: string }[] = [
  { value: "square", label: "Vuông" },
  { value: "dot", label: "Chấm" },
];

// Preset colors
const COLOR_PRESETS = [
  "#000000", // Black
  "#1e3a8a", // Blue
  "#166534", // Green
  "#9f1239", // Rose
  "#7c2d12", // Orange
  "#581c87", // Purple
];

export function QRCodeDisplay({ url, shortCode }: QRCodeDisplayProps) {
  const qrRef = useRef<HTMLDivElement>(null);
  const qrCodeRef = useRef<QRCodeStyling | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // QR Code customization state
  const [exportSize, setExportSize] = useState(DEFAULT_EXPORT_SIZE);
  const [dotStyle, setDotStyle] = useState<DotType>("rounded");
  const [cornerStyle, setCornerStyle] = useState<CornerSquareType>("extra-rounded");
  const [cornerDotStyle, setCornerDotStyle] = useState<CornerDotType>("dot");
  const [qrColor, setQrColor] = useState("#000000");
  const [transparentBg, setTransparentBg] = useState(false);
  const [logoSrc, setLogoSrc] = useState(DEFAULT_LOGO);
  const [customLogoFile, setCustomLogoFile] = useState<string | null>(null);

  // Initialize QR Code
  useEffect(() => {
    qrCodeRef.current = new QRCodeStyling({
      width: DISPLAY_SIZE,
      height: DISPLAY_SIZE,
      type: "svg",
      data: url,
      image: logoSrc,
      dotsOptions: {
        color: qrColor,
        type: dotStyle,
      },
      cornersSquareOptions: {
        color: qrColor,
        type: cornerStyle,
      },
      cornersDotOptions: {
        color: qrColor,
        type: cornerDotStyle,
      },
      backgroundOptions: {
        color: "#ffffff",
      },
      imageOptions: {
        crossOrigin: "anonymous",
        margin: 8,
        imageSize: 0.35,
      },
      qrOptions: {
        errorCorrectionLevel: "H",
      },
    });

    if (qrRef.current) {
      qrRef.current.innerHTML = "";
      qrCodeRef.current.append(qrRef.current);
    }
  }, []);

  // Update QR Code when options change
  useEffect(() => {
    if (qrCodeRef.current) {
      qrCodeRef.current.update({
        width: DISPLAY_SIZE,
        height: DISPLAY_SIZE,
        data: url,
        image: logoSrc,
        dotsOptions: {
          color: qrColor,
          type: dotStyle,
        },
        cornersSquareOptions: {
          color: qrColor,
          type: cornerStyle,
        },
        cornersDotOptions: {
          color: qrColor,
          type: cornerDotStyle,
        },
      });
    }
  }, [url, dotStyle, cornerStyle, cornerDotStyle, qrColor, logoSrc]);

  const handleDownload = useCallback(async () => {
    if (!qrCodeRef.current) return;

    if (exportSize < 100) {
      toast.error("Ít nhất 100px");
      return;
    }

    const exportQR = new QRCodeStyling({
      width: exportSize,
      height: exportSize,
      type: "canvas",
      data: url,
      image: logoSrc,
      dotsOptions: {
        color: qrColor,
        type: dotStyle,
      },
      cornersSquareOptions: {
        color: qrColor,
        type: cornerStyle,
      },
      cornersDotOptions: {
        color: qrColor,
        type: cornerDotStyle,
      },
      backgroundOptions: transparentBg ? undefined : {
        color: "#ffffff",
      },
      imageOptions: {
        crossOrigin: "anonymous",
        margin: Math.round(exportSize * 0.04),
        imageSize: 0.35,
      },
      qrOptions: {
        errorCorrectionLevel: "H",
      },
    });

    exportQR.download({
      name: `qr-${shortCode}`,
      extension: "png",
    });
  }, [shortCode, exportSize, url, logoSrc, qrColor, dotStyle, cornerStyle, cornerDotStyle, transparentBg]);

  const handleLogoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setCustomLogoFile(result);
      setLogoSrc(result);
    };
    reader.readAsDataURL(file);
  }, []);

  const resetLogo = useCallback(() => {
    setLogoSrc(DEFAULT_LOGO);
    setCustomLogoFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const resetAll = useCallback(() => {
    setExportSize(DEFAULT_EXPORT_SIZE);
    setDotStyle("rounded");
    setCornerStyle("extra-rounded");
    setCornerDotStyle("dot");
    setQrColor("#000000");
    setTransparentBg(false);
    resetLogo();
  }, [resetLogo]);

  return (
    <div className="flex flex-col md:flex-row h-full w-full">
      {/* Left Side - QR Code Preview */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-10 bg-muted/30">
        <div
          ref={qrRef}
          className="p-6 bg-white shadow-2xl rounded-3xl"
        />
      </div>

      {/* Right Side - Controls - Scrollable */}
      <div className="w-full md:w-[360px] border-t md:border-t-0 md:border-l flex flex-col max-h-[50vh] md:max-h-full">
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Export Size */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Kích thước xuất (px)</Label>
            <Input
              type="number"
              value={exportSize}
              onChange={(e) => setExportSize(parseInt(e.target.value))}
              min={1}
              max={2048}
              className="rounded-xl"
            />
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Màu sắc</Label>
            <div className="flex items-center gap-3">
              <div className="flex gap-2">
                {COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setQrColor(color)}
                    className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
                      qrColor === color ? "border-primary ring-2 ring-primary/30 scale-110" : "border-muted"
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
              <div className="relative">
                <input
                  type="color"
                  value={qrColor}
                  onChange={(e) => setQrColor(e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div 
                  className="w-8 h-8 rounded-full border-2 border-dashed border-muted-foreground flex items-center justify-center bg-gradient-to-br from-red-500 via-green-500 to-blue-500"
                  title="Chọn màu tùy chỉnh"
                >
                  <span className="w-5 h-5 rounded-full bg-background flex items-center justify-center text-foreground text-sm font-bold">+</span>
                </div>
              </div>
            </div>
          </div>

          {/* Transparent Background */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-0">
              <Label className="text-sm font-medium">Nền trong suốt</Label>
              <button
                type="button"
                onClick={() => setTransparentBg(!transparentBg)}
                className={`w-12 h-7 rounded-full transition-colors relative flex-shrink-0 ${
                  transparentBg ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${
                    transparentBg ? "left-6" : "left-1"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Dot Style + Logo - Same row */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Kiểu chấm</Label>
              <Select value={dotStyle} onValueChange={(v) => setDotStyle(v as DotType)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {DOT_STYLES.map((style) => (
                    <SelectItem key={style.value} value={style.value}>
                      {style.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Logo</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
                id="logo-upload"
              />
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl gap-1.5 flex-1 h-10 text-xs"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-3.5 h-3.5" />
                  {customLogoFile ? "Đổi" : "Tải lên"}
                </Button>
                {customLogoFile && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-xl h-10 px-2"
                    onClick={resetLogo}
                    title="Về mặc định"
                  >
                    <ImageIcon className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Corner Styles */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Góc ngoài</Label>
              <Select value={cornerStyle} onValueChange={(v) => setCornerStyle(v as CornerSquareType)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {CORNER_STYLES.map((style) => (
                    <SelectItem key={style.value} value={style.value}>
                      {style.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Góc trong</Label>
              <Select value={cornerDotStyle} onValueChange={(v) => setCornerDotStyle(v as CornerDotType)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {CORNER_DOT_STYLES.map((style) => (
                    <SelectItem key={style.value} value={style.value}>
                      {style.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div className="p-5 border-t bg-background flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={resetAll}
            className="rounded-xl gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Đặt lại
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleDownload}
            className="rounded-xl gap-2 flex-1"
          >
            <Download className="w-4 h-4" />
            Tải QR ({exportSize}px)
          </Button>
        </div>
      </div>
    </div>
  );
}
