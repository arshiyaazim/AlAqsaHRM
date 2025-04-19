import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, Smartphone } from "lucide-react";
import { useToast } from '@/hooks/use-toast';

export function QRCodeCard() {
  const [qrUrl, setQrUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  // Create the mobile attendance URL using the current base URL
  const getMobileUrl = () => {
    // Use the current location to build the URL
    const baseUrl = window.location.href.split('/').slice(0, 3).join('/');
    return `${baseUrl}/mobile-attendance`;
  };

  const generateQRCode = async () => {
    try {
      setIsGenerating(true);
      const mobileUrl = getMobileUrl();
      const qrCodeDataUrl = await QRCode.toDataURL(mobileUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#2C5282', // Blue color to match the app theme
          light: '#FFFFFF',
        },
      });
      setQrUrl(qrCodeDataUrl);
    } catch (err) {
      console.error('Error generating QR code:', err);
      toast({
        title: "Error generating QR code",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate QR code on component mount
  useEffect(() => {
    generateQRCode();
  }, []);

  const downloadQRCode = () => {
    if (!qrUrl) return;
    
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = 'al-aqsa-attendance-qr.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "QR Code Downloaded",
      description: "You can print and share this QR code with your employees.",
    });
  };

  return (
    <Card className="col-span-1">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <div>
          <CardTitle className="text-lg font-medium">Mobile Attendance QR Code</CardTitle>
          <CardDescription>Scan to access mobile attendance tracking</CardDescription>
        </div>
        <Button 
          variant="outline" 
          size="icon" 
          onClick={generateQRCode}
          disabled={isGenerating}
        >
          <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-4">
          {qrUrl ? (
            <div className="bg-white p-2 rounded-md shadow-sm">
              <img src={qrUrl} alt="Mobile Attendance QR Code" className="w-full max-w-[250px]" />
            </div>
          ) : (
            <div className="w-[250px] h-[250px] border border-dashed border-gray-300 flex items-center justify-center rounded-md">
              <Smartphone className="h-12 w-12 text-gray-300" />
            </div>
          )}
          
          <div className="text-sm text-center text-muted-foreground">
            Employees can scan this QR code to access the mobile attendance system.
          </div>
          
          <Button 
            onClick={downloadQRCode} 
            className="w-full"
            disabled={!qrUrl || isGenerating}
          >
            <Download className="h-4 w-4 mr-2" />
            Download QR Code
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}