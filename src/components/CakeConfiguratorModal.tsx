import React, { useState, useRef, useEffect } from 'react';
import { HERO_CAKE_URL } from '../data/initialData';
import { createCustomCakeInDb, uploadFileToAppStorage } from '../services/supabaseData';
import { CartItem, CustomCakeBuilderSettings } from '../types';

interface CakeConfiguratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCustomCake: (customCake: {
    name: string;
    price: number;
    image: string;
    details: string;
    phoneNumber?: string;
    isCustomCake?: boolean;
    customCakeData?: CartItem['customCakeData'];
  }) => void;
  settings?: CustomCakeBuilderSettings;
}

export const CakeConfiguratorModal: React.FC<CakeConfiguratorModalProps> = ({
  isOpen,
  onClose,
  onAddCustomCake,
}) => {
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [designNotes, setDesignNotes] = useState('');
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referencePreview, setReferencePreview] = useState<string>('');
  const [referenceFileName, setReferenceFileName] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem('cakezone_custom_cake_form_state_v1');
        Object.keys(window.localStorage).forEach((key) => {
          if (key.startsWith('cakezone_custom_cake_form_')) {
            window.localStorage.removeItem(key);
          }
        });
      } catch {
        // Ignore storage errors
      }
    }
  }, []);

  if (!isOpen) return null;

  const processSelectedFile = (file: File) => {
    setUploadError(null);
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid PNG, JPG, or WEBP image.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Image must be 10MB or smaller.');
      return;
    }
    setReferenceFile(file);
    setReferenceFileName(file.name);

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setReferencePreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setUploadError(null);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      processSelectedFile(droppedFile);
      return;
    }

    // Support dragging an image directly from Pinterest or another browser tab
    const htmlData = e.dataTransfer.getData('text/html');
    const uriData =
      e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');

    let extractedUrl = '';
    if (htmlData) {
      const match = htmlData.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (match?.[1]) {
        extractedUrl = match[1];
      }
    }
    if (!extractedUrl && uriData && /^https?:\/\//i.test(uriData.trim())) {
      extractedUrl = uriData.trim().split('\n')[0].trim();
    }

    if (extractedUrl) {
      setReferenceFile(null);
      setReferencePreview(extractedUrl);
      setReferenceFileName('Pinterest / Web Reference Design');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const cleanedPhone = phoneNumber.replace(/\D/g, '');
    if (cleanedPhone.length !== 10) {
      setUploadError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!designNotes.trim()) {
      setUploadError('Please enter your design notes or theme idea.');
      return;
    }
    const hasUserRef = Boolean(referencePreview || referenceFile);
    if (!hasUserRef) {
      setUploadError('Please upload a reference image of your cake.');
      return;
    }
    setUploadError(null);
    setIsSubmitting(true);

    try {
      let finalImageUrl = referencePreview || HERO_CAKE_URL;
      let shareableRefUrl =
        referencePreview && /^https?:\/\//i.test(referencePreview) ? referencePreview : '';

      if (referenceFile) {
        const uploaded = await uploadFileToAppStorage({
          file: referenceFile,
          featureName: 'custom-cake-requests',
        });
        if (uploaded.signedUrl) {
          finalImageUrl = uploaded.signedUrl;
          shareableRefUrl = uploaded.signedUrl;
        }
      }

      const refDisplayForDetails = shareableRefUrl
        ? shareableRefUrl
        : referenceFileName
        ? `${referenceFileName} (Attached)`
        : hasUserRef
        ? 'Uploaded Reference Image (Attached)'
        : 'Not provided';

      const summaryNotes = [
        fullName.trim() ? `Client: ${fullName.trim()}` : '',
        cleanedPhone ? `Phone: ${cleanedPhone}` : '',
        eventDate ? `Event Date: ${eventDate}` : '',
        designNotes.trim() ? `Notes: ${designNotes.trim()}` : 'Notes: Custom Reference Design',
        `Ref: ${refDisplayForDetails}`,
      ]
        .filter(Boolean)
        .join(' · ');

      await createCustomCakeInDb({
        tiers: 1,
        sponge_flavor: fullName.trim()
          ? `Custom Request (${fullName.trim()})`
          : 'Custom Design Request',
        filling: cleanedPhone ? `Contact: ${cleanedPhone}` : 'Chef Consultation',
        exterior_finish: referenceFileName || 'Reference Image Design',
        accents: hasUserRef ? ['Reference Image Attached'] : [],
        inscription: designNotes.trim() || 'Custom Cake Vision',
        event_date: eventDate || new Date().toISOString().split('T')[0],
        estimated_price: 0,
      });

      onAddCustomCake({
        name: fullName.trim()
          ? `Custom Cake Request (${fullName.trim()})`
          : 'Custom Cake Design Request',
        price: 0,
        image: finalImageUrl,
        details: summaryNotes,
        phoneNumber: cleanedPhone,
        isCustomCake: true,
        customCakeData: {
          customerName: fullName.trim(),
          phoneNumber: cleanedPhone,
          eventDate: eventDate.trim(),
          designNotes: designNotes.trim() || 'Custom Reference Design',
          referenceImageName: referenceFileName.trim(),
          referenceImageUrl: shareableRefUrl || (hasUserRef ? finalImageUrl : ''),
        },
      });

      setFullName('');
      setPhoneNumber('');
      setEventDate('');
      setDesignNotes('');
      setReferenceFile(null);
      setReferencePreview('');
      setReferenceFileName('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4">
      <div className="relative bg-[#FFFEFC] max-w-[335px] sm:max-w-[375px] w-full rounded-[20px] sm:rounded-[22px] shadow-2xl border border-[#EDE6DF] px-4 py-3.5 sm:px-5 sm:py-4 overflow-hidden">
        {/* Top-Right Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-3 right-3 w-7 h-7 rounded-full bg-[#F3F2F0] hover:bg-[#E6E4E1] text-[#23140D] flex items-center justify-center transition-colors cursor-pointer"
        >
          <svg
            className="w-3 h-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Header with Fountain Pen Nib Icon */}
        <div className="text-center mb-2.5 sm:mb-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#EFE6FF] flex items-center justify-center mx-auto mb-1.5 sm:mb-2">
            <svg
              className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-[#731EE2]"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M19.35 2.65a2.22 2.22 0 0 0-3.14 0l-2.34 2.34 3.14 3.14 2.34-2.34a2.22 2.22 0 0 0 0-3.14ZM12.46 6.4 4.7 10.28a1.5 1.5 0 0 0-.77.96L2.04 19.8a.75.75 0 0 0 .92.9l8.56-1.89a1.5 1.5 0 0 0 .96-.77l3.88-7.76-3.9-3.88Zm-4.08 8.3a1.25 1.25 0 1 1 1.77-1.77 1.25 1.25 0 0 1-1.77 1.77l-3.2 3.2-1.06-1.06 3.2-3.2Z" />
            </svg>
          </div>

          <h2 className="text-[16px] sm:text-[18px] font-extrabold font-headline text-[#23140D] tracking-tight leading-tight">
            Request Custom Cake Design
          </h2>
          <p className="text-[10.5px] sm:text-[11px] text-[#6E6764] mt-0.5 max-w-[290px] mx-auto leading-snug">
            Tell us your vision and our master pastry chef will get back to you within 2 hours.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-2 sm:space-y-2.5">
          {/* Your Full Name */}
          <div>
            <label className="block text-[10.5px] sm:text-[11px] font-bold text-[#3F3A37] mb-0.5">
              Your Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Sarah Jenkins"
              className="w-full px-3 py-1.5 rounded-lg border border-[#E5E0DC] bg-white text-[11.5px] sm:text-xs text-[#1F1A17] placeholder:text-[#98A0AC] focus:outline-none focus:border-[#731EE2] focus:ring-2 focus:ring-[#731EE2]/15 transition-all"
            />
          </div>

          {/* Phone Number & Event Date */}
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
            <div>
              <label className="block text-[10.5px] sm:text-[11px] font-bold text-[#3F3A37] mb-0.5">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                required
                inputMode="numeric"
                pattern="[0-9]{10}"
                minLength={10}
                maxLength={10}
                title="Please enter a 10-digit Indian mobile number (e.g. 9876543210)"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="e.g. 9876543210"
                className="w-full px-2.5 sm:px-3 py-1.5 rounded-lg border border-[#E5E0DC] bg-white text-[11px] sm:text-xs text-[#1F1A17] placeholder:text-[#98A0AC] focus:outline-none focus:border-[#731EE2] focus:ring-2 focus:ring-[#731EE2]/15 transition-all"
              />
            </div>

            <div>
              <label className="block text-[10.5px] sm:text-[11px] font-bold text-[#3F3A37] mb-0.5">
                Event Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full px-2.5 sm:px-3 py-1.5 rounded-lg border border-[#E5E0DC] bg-white text-[11px] sm:text-xs text-[#1F1A17] placeholder:text-[#98A0AC] focus:outline-none focus:border-[#731EE2] focus:ring-2 focus:ring-[#731EE2]/15 transition-all"
              />
            </div>
          </div>

          {/* Design Notes or Theme Idea */}
          <div>
            <label className="block text-[10.5px] sm:text-[11px] font-bold text-[#3F3A37] mb-0.5">
              Design Notes or Theme Idea <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={2}
              required
              value={designNotes}
              onChange={(e) => {
                setDesignNotes(e.target.value);
                if (uploadError) setUploadError(null);
              }}
              placeholder="Describe your dream cake’s design, colors, flavors, tiers, theme, or special details..."
              className="w-full px-3 py-1.5 rounded-lg border border-[#E5E0DC] bg-white text-[11.5px] sm:text-xs text-[#1F1A17] placeholder:text-[#98A0AC] resize-none focus:outline-none focus:border-[#731EE2] focus:ring-2 focus:ring-[#731EE2]/15 transition-all"
            />
            <p className="text-[10px] sm:text-[10.5px] font-medium text-[#731EE2] mt-1 leading-snug">
              ✨ Inspired by a design on Pinterest? Upload your dream cake reference image below!
            </p>
          </div>

          {/* Drag & Drop Reference Image Box */}
          <div>
            <label className="block text-[10.5px] sm:text-[11px] font-bold text-[#3F3A37] mb-0.5">
              Reference Image <span className="text-red-500">*</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative rounded-xl border border-dashed transition-all px-3 py-2.5 sm:py-3 flex flex-col items-center justify-center text-center cursor-pointer select-none ${
                isDragging
                  ? 'border-[#731EE2] bg-[#EFE6FF]/40 ring-2 ring-[#731EE2]/20'
                  : 'border-[#DFDAD5] bg-[#FAF7F4]/90 hover:bg-[#F5EFE9] hover:border-[#731EE2]/45'
              }`}
            >
              {referencePreview ? (
                <div className="flex flex-col items-center gap-1 w-full">
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-[#E5E0DC] shadow-xs bg-white">
                    <img
                      src={referencePreview}
                      alt="Reference preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="text-[10.5px] font-bold text-[#3F3A37] truncate max-w-[220px]">
                    {referenceFileName}
                  </p>
                  <span className="text-[9.5px] font-semibold text-[#731EE2] hover:underline">
                    Click or drop another image to replace
                  </span>
                </div>
              ) : (
                <>
                  {/* Purple Cloud Upload Icon */}
                  <svg
                    className="w-5 h-5 text-[#731EE2] mb-0.5"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96ZM14 13v4h-4v-4H7l5-5 5 5h-3Z" />
                  </svg>
                  <p className="text-[11px] font-bold text-[#4B4643]">
                    Click or drag reference image here <span className="text-red-500">*</span>
                  </p>
                  <p className="text-[9.5px] text-[#8E8783]">
                    PNG, JPG up to 10MB (Required)
                  </p>
                </>
              )}
            </div>

            {uploadError && (
              <p className="text-[10.5px] text-red-600 font-medium mt-1 text-center">
                {uploadError}
              </p>
            )}
          </div>

          {/* Submit Custom Request CTA */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2 sm:py-2.5 rounded-lg bg-[#731EE2] hover:bg-[#6215C7] active:scale-[0.99] disabled:opacity-60 text-white font-bold text-[11.5px] sm:text-xs shadow-[0_8px_20px_-4px_rgba(115,30,226,0.45)] transition-all cursor-pointer mt-0.5"
          >
            {isSubmitting ? 'Submitting Request...' : 'Submit Custom Request'}
          </button>
        </form>
      </div>
    </div>
  );
};


