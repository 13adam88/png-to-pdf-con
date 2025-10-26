import React, { useState, useCallback, useMemo } from 'react';
import { AppStatus, ConversionOptions } from './types';
import type { jsPDF } from 'jspdf';

// Type declaration for jsPDF loaded from CDN
declare global {
  interface Window {
    jspdf: {
      jsPDF: typeof jsPDF;
    };
  }
}

// --- Helper Functions ---
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

const calculateImageDimensions = (
  imgWidth: number,
  imgHeight: number,
  pageWidth: number,
  pageHeight: number,
  imageFit: ConversionOptions['imageFit']
) => {
  const margin = 10; // 10mm margin
  const availableWidth = pageWidth - margin * 2;
  const availableHeight = pageHeight - margin * 2;
  let width, height, x, y;

  switch (imageFit) {
    case 'fit': {
      const scaleX = availableWidth / imgWidth;
      const scaleY = availableHeight / imgHeight;
      const scale = Math.min(scaleX, scaleY);
      width = imgWidth * scale;
      height = imgHeight * scale;
      x = (pageWidth - width) / 2;
      y = (pageHeight - height) / 2;
      break;
    }
    case 'fill':
      width = availableWidth;
      height = availableHeight;
      x = margin;
      y = margin;
      break;
    case 'original': {
      const pixelToMm = 0.352778; // Assuming 72 DPI
      width = Math.min(imgWidth * pixelToMm, availableWidth);
      height = Math.min(imgHeight * pixelToMm, availableHeight);
      x = (pageWidth - width) / 2;
      y = (pageHeight - height) / 2;
      break;
    }
  }
  return { width, height, x, y };
};

// --- SVG Icons ---
const UploadIcon = () => (
    <svg className="w-16 h-16 mx-auto text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);


// --- UI Components (Defined outside App to prevent re-renders) ---

const Header: React.FC = () => (
    <header className="text-center py-12 px-4 sm:px-6 text-white">
        <h1 className="text-4xl sm:text-5xl font-bold mb-2 text-shadow-lg">PNGtoPDFF.com</h1>
        <p className="text-lg sm:text-xl opacity-90 font-light">Convert PNG or JPG to PDF Free Online</p>
    </header>
);

interface StepCardProps {
    number: number;
    title: string;
    children: React.ReactNode;
}
const StepCard: React.FC<StepCardProps> = ({ number, title, children }) => (
    <div className="flex items-start gap-6 p-6 bg-white rounded-2xl shadow-md border border-slate-200/50 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
        <div className="flex-shrink-0 w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-lg">{number}</div>
        <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">{title}</h3>
            <p className="text-slate-500 leading-relaxed">{children}</p>
        </div>
    </div>
);

const HowItWorksSection: React.FC = () => (
    <section className="my-12">
        <h2 className="text-3xl font-bold text-center text-slate-800 mb-8">How It Works in 3 Simple Steps</h2>
        <div className="grid md:grid-cols-3 gap-8">
            <StepCard number={1} title="Upload Images">
                Click or drag-and-drop your PNG, JPG, or WebP files into the upload area above. You can select multiple files at once.
            </StepCard>
            <StepCard number={2} title="Customize Settings">
                After uploading, you can adjust the PDF page size, orientation, and how your images fit on the page.
            </StepCard>
            <StepCard number={3} title="Convert & Download">
                Click the 'Convert to PDF' button. Your PDF will be generated instantly in your browser, ready for download. Your files never leave your device.
            </StepCard>
        </div>
    </section>
);


interface FileUploaderProps {
    onFilesAdded: (files: File[]) => void;
}
const FileUploader: React.FC<FileUploaderProps> = ({ onFilesAdded }) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            onFilesAdded(Array.from(e.target.files));
        }
    };
    
    const handleDrag = (e: React.DragEvent<HTMLDivElement>, over: boolean) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(over);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        handleDrag(e, false);
        const files = Array.from(e.dataTransfer.files);
        if (files && files.length > 0) {
            onFilesAdded(files);
            e.dataTransfer.clearData();
        }
    };

    return (
        <div className="mb-8">
            <div
                onDragOver={(e) => handleDrag(e, true)}
                onDragEnter={(e) => handleDrag(e, true)}
                onDragLeave={(e) => handleDrag(e, false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-3 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 ${isDragOver ? 'border-indigo-500 bg-white' : 'border-slate-300 bg-white/95'} backdrop-blur-md shadow-lg hover:border-indigo-500 hover:bg-white`}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".png,image/png,.jpg,.jpeg,image/jpeg,.webp,image/webp"
                    className="hidden"
                    onChange={handleFileChange}
                />
                <div className="flex flex-col items-center justify-center space-y-4">
                    <UploadIcon />
                    <h3 className="text-xl font-semibold text-slate-800">Drop image files here or click to browse</h3>
                    <p className="text-slate-500">Supports PNG, JPG, and WebP files</p>
                    <button type="button" className="mt-2 bg-indigo-600 text-white font-semibold py-2 px-6 rounded-lg shadow-md hover:bg-indigo-700 transition-colors duration-300">
                        Browse Files
                    </button>
                </div>
            </div>
        </div>
    );
};


interface FilesSectionProps {
    files: File[];
    options: ConversionOptions;
    onRemoveFile: (index: number) => void;
    onOptionChange: (options: Partial<ConversionOptions>) => void;
    onConvert: () => void;
}
const FilesSection: React.FC<FilesSectionProps> = ({ files, options, onRemoveFile, onOptionChange, onConvert }) => (
    <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 sm:p-8 shadow-lg">
        <h3 className="text-xl font-semibold text-slate-800 mb-6">Selected Files</h3>
        <div className="space-y-3 mb-8">
            {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-slate-100 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-4 overflow-hidden">
                        <div className="w-10 h-10 bg-indigo-600 text-white font-bold rounded-lg flex items-center justify-center flex-shrink-0 text-sm">
                            {file.name.split('.').pop()?.toUpperCase() || 'IMG'}
                        </div>
                        <div className="flex-grow min-w-0">
                            <h4 className="text-sm font-semibold text-slate-700 truncate">{file.name}</h4>
                            <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                        </div>
                    </div>
                    <button onClick={() => onRemoveFile(index)} className="bg-red-500 text-white text-xs font-bold py-1 px-3 rounded-md hover:bg-red-600 transition-colors duration-200">
                        Remove
                    </button>
                </div>
            ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 p-6 bg-slate-50 border border-slate-200 rounded-lg">
            {Object.entries({
                pageSize: { label: 'Page Size', values: ['a4', 'letter', 'a3', 'a5'] },
                orientation: { label: 'Orientation', values: ['portrait', 'landscape'] },
                imageFit: { label: 'Image Fit', values: [{val: 'fit', text: 'Fit to Page'}, {val: 'original', text: 'Original Size'}, {val: 'fill', text: 'Fill Page'}] }
            }).map(([key, { label, values }]) => (
                <div key={key} className="flex flex-col gap-2">
                    <label htmlFor={key} className="font-semibold text-slate-700 text-sm">{label}:</label>
                    <select
                        id={key}
                        value={options[key as keyof ConversionOptions]}
                        onChange={(e) => onOptionChange({ [key]: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                    >
                        {values.map((v) => typeof v === 'string' ? 
                          <option key={v} value={v}>{v.charAt(