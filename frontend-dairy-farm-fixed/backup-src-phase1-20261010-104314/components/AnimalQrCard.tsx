import React, { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  QrCode,
  Download,
  Printer,
  RefreshCw,
  ExternalLink,
  Settings,
  Check,
  Copy,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';
import { Animal } from '../types';
import { animalWritesApi, isAuthenticated } from '../services/api/apiClient';

interface AnimalQrCardProps {
  animal: Animal;
  onRegenerateToken?: () => Promise<void>;
  farmName?: string;
  isRegenerating?: boolean;
}

/**
 * TRUE when the configured base URL points at the generating computer itself.
 * A phone scanning such a QR resolves `localhost` to the PHONE, so the tag will
 * never work in the field. We warn rather than block, so PC testing still works.
 */
function isLoopbackHost(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]';
  } catch {
    return false;
  }
}

export const AnimalQrCard: React.FC<AnimalQrCardProps> = ({
  animal,
  onRegenerateToken,
  farmName = 'Green Dairy Farm',
  isRegenerating = false,
}) => {
  const qrRef = useRef<HTMLDivElement>(null);
  const printCardRef = useRef<HTMLDivElement>(null);

  // Read configured base URL from localStorage or import.meta.env, defaulting to window.location.origin
  const [baseUrl, setBaseUrl] = useState(() => {
    return (
      localStorage.getItem('dairy_farm_qr_base_url') ||
      (import.meta as any).env?.VITE_QR_BASE_URL ||
      (typeof window !== 'undefined' ? window.location.origin : '')
    );
  });
  const [isEditingBaseUrl, setIsEditingBaseUrl] = useState(false);
  const [tempUrl, setTempUrl] = useState(baseUrl);
  const [copied, setCopied] = useState(false);

  /**
   * Phase 2B: the QR encodes ONLY a real, backend-issued token.
   *
   * There is no `|| animal.animalId` fallback. The animal code and the numeric
   * primary key are both guessable and neither is a secret, so encoding either
   * would let anyone enumerate the herd. When the database has issued no token
   * we render an explicit "issue" action instead of a fake QR.
   */
  const token = animal.qrToken;
  const hasToken = Boolean(token);

  const [isIssuing, setIsIssuing] = useState(false);
  const [issueError, setIssueError] = useState<string | null>(null);
  const [issuedToken, setIssuedToken] = useState<string | null>(null);

  // Prefer a freshly issued token over the one loaded with the animal.
  const effectiveToken = issuedToken || token;
  const hasEffectiveToken = Boolean(effectiveToken);

  const liveProfileUrl = hasEffectiveToken
    ? `${baseUrl.replace(/\/$/, '')}/qr/animal/${effectiveToken}`
    : null;

  const baseUrlIsLoopback = isLoopbackHost(baseUrl);

  const handleSaveBaseUrl = () => {
    const cleaned = tempUrl.trim().replace(/\/$/, '');
    setBaseUrl(cleaned);
    localStorage.setItem('dairy_farm_qr_base_url', cleaned);
    setIsEditingBaseUrl(false);
  };

  /**
   * Issues a QR token through the REAL authenticated backend endpoint
   * POST /api/animals/{numericId}/qr. The token is generated and stored by the
   * server in animal_identifications; nothing is fabricated here.
   */
  const handleIssueToken = async () => {
    setIssueError(null);

    if (!isAuthenticated()) {
      setIssueError('Sign in required to issue a QR token.');
      return;
    }

    setIsIssuing(true);
    try {
      const numericId = Number(animal.id);
      if (!Number.isFinite(numericId) || numericId <= 0) {
        setIssueError('This animal has no valid database identifier.');
        return;
      }

      const res = await animalWritesApi.ensureQrToken(numericId);

      if (!res.success || !res.data?.token) {
        setIssueError(
          res.message || 'The QR token could not be issued. Please try again.'
        );
        return;
      }

      setIssuedToken(res.data.token);
    } catch (err: any) {
      setIssueError(err.message || 'The QR token could not be issued.');
    } finally {
      setIsIssuing(false);
    }
  };

  const handleCopyLink = () => {
    if (!liveProfileUrl) return;
    navigator.clipboard.writeText(liveProfileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQrPng = () => {
    // Nothing to export when no real token has been issued.
    if (!hasEffectiveToken || !liveProfileUrl) return;

    const svgElement = qrRef.current?.querySelector('svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    canvas.width = 600;
    canvas.height = 750;

    img.onload = () => {
      if (!ctx) return;
      // White background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Farm Header
      ctx.fillStyle = '#0f4c3a';
      ctx.font = 'bold 30px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(farmName.toUpperCase(), 300, 60);

      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('LIVE ANIMAL DIGITAL PASSPORT', 300, 95);

      // Draw QR
      ctx.drawImage(img, 75, 130, 450, 450);

      // Animal Info Footer
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 38px monospace';
      ctx.fillText(animal.animalId, 300, 630);

      ctx.fillStyle = '#475569';
      ctx.font = '22px sans-serif';
      ctx.fillText(`${animal.breed} • Tag #${animal.earTag}`, 300, 670);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('SCAN WITH ANY PHONE CAMERA FOR LIVE PROFILE', 300, 710);

      // Download
      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `${animal.animalId}_QR_Code.png`;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handlePrintTag = () => {
    const printContent = printCardRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=600,height=700');
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Animal QR Card - ${animal.animalId}</title>
          <style>
            @page { size: auto; margin: 10mm; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 90vh;
              background-color: #fff;
              margin: 0;
            }
            .card {
              border: 3px solid #0f4c3a;
              border-radius: 16px;
              padding: 24px;
              text-align: center;
              max-width: 320px;
              width: 100%;
              box-sizing: border-box;
            }
            .farm-name {
              font-size: 16px;
              font-weight: 800;
              color: #0f4c3a;
              letter-spacing: 1px;
              margin-bottom: 4px;
              text-transform: uppercase;
            }
            .subhead {
              font-size: 11px;
              font-weight: 600;
              color: #64748b;
              margin-bottom: 16px;
              text-transform: uppercase;
            }
            .qr-wrapper {
              margin: 12px auto;
              display: inline-block;
              background: #fff;
              padding: 8px;
            }
            .animal-code {
              font-size: 26px;
              font-weight: 900;
              font-family: monospace;
              color: #0f172a;
              margin-top: 10px;
              letter-spacing: 1px;
            }
            .animal-meta {
              font-size: 13px;
              color: #334155;
              font-weight: 600;
              margin: 4px 0 12px;
            }
            .scan-callout {
              font-size: 11px;
              font-weight: 700;
              color: #0f4c3a;
              background: #f0fdf4;
              border: 1px dashed #16a34a;
              padding: 6px 10px;
              border-radius: 8px;
              margin-top: 8px;
            }
            .token-text {
              font-size: 9px;
              color: #94a3b8;
              font-family: monospace;
              margin-top: 8px;
              word-break: break-all;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="farm-name">${farmName}</div>
            <div class="subhead">Animal ID & Health Tag</div>
            <div class="qr-wrapper">
              ${printContent.innerHTML}
            </div>
            <div class="animal-code">${animal.animalId}</div>
            <div class="animal-meta">${animal.breed} • Tag #${animal.earTag}</div>
            <div class="scan-callout">Scan for Live Animal Profile</div>
            <div class="token-text">${liveProfileUrl}</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 transition-all">
      <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Live Animal QR Code</h3>
            <p className="text-xs text-slate-500">
              Unique identity payload linked directly to MySQL database
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsEditingBaseUrl(!isEditingBaseUrl)}
          className="flex items-center space-x-1.5 text-xs text-slate-600 hover:text-emerald-700 bg-slate-50 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200 transition-colors"
          title="Configure LAN IP Base URL"
        >
          <Settings className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">LAN URL</span>
        </button>
      </div>

      {/* LAN Base URL Configuration Box */}
      {isEditingBaseUrl && (
        <div className="mb-4 p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-xl text-xs space-y-2">
          <div className="font-semibold text-emerald-950 flex items-center justify-between">
            <span>Configure Farm LAN Host / Base URL:</span>
            <span className="text-[11px] font-normal text-emerald-700">Used inside QR payload for phone cameras</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={tempUrl}
              onChange={(e) => setTempUrl(e.target.value)}
              placeholder="e.g. http://192.168.18.14:3000"
              className="flex-1 bg-white border border-emerald-300 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="button"
              onClick={handleSaveBaseUrl}
              className="bg-emerald-700 text-white font-semibold px-3 py-1.5 rounded-lg hover:bg-emerald-800 transition-colors"
            >
              Save URL
            </button>
            <button
              type="button"
              onClick={() => {
                setTempUrl(window.location.origin);
              }}
              className="bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg hover:bg-slate-300 transition-colors"
              title="Reset to current browser origin"
            >
              Reset
            </button>
          </div>
          <p className="text-[11px] text-emerald-800">
            <strong>Farm LAN tip:</strong> Do NOT use <code className="bg-emerald-100 px-1 rounded">localhost</code> when scanning from a phone camera on your local WiFi. Use your computer's LAN IP (e.g. <code className="bg-emerald-100 px-1 rounded">http://192.168.18.14:3000</code>).
          </p>
        </div>
      )}

      {/* Main QR Display Box */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Left Column: QR Card Rendering */}
        <div className="md:col-span-5 flex flex-col items-center justify-center p-5 bg-gradient-to-b from-slate-50 to-slate-100/80 rounded-2xl border border-slate-200 text-center">
          <div className="text-xs font-black tracking-wider text-emerald-800 uppercase mb-1">
            {farmName}
          </div>
          <div className="text-[10px] uppercase font-bold text-slate-600 mb-3">
            Digital Herd Passport
          </div>

          {/* QR Code Container with hidden print clone */}
          {hasEffectiveToken && liveProfileUrl ? (
            <>
              <div
                ref={qrRef}
                className="p-3.5 bg-white rounded-xl shadow-xs border border-slate-200 inline-block transition-transform hover:scale-105"
              >
                <QRCodeSVG
                  value={liveProfileUrl}
                  size={180}
                  level="H"
                  includeMargin={true}
                  imageSettings={{
                    src: '/favicon.ico',
                    x: undefined,
                    y: undefined,
                    height: 24,
                    width: 24,
                    excavate: true,
                  }}
                />
              </div>

              {/* Hidden reference for print utility */}
              <div className="hidden">
                <div ref={printCardRef}>
                  <QRCodeSVG value={liveProfileUrl} size={220} level="H" includeMargin={true} />
                </div>
              </div>
            </>
          ) : (
            /*
             * No real token has been issued for this animal. A QR containing the
             * animal code or the numeric id would be guessable and would let
             * anyone enumerate the herd, so no QR is rendered at all.
             */
            <div className="w-full px-4 py-8 bg-white rounded-xl border-2 border-dashed border-amber-300 flex flex-col items-center gap-3">
              <ShieldAlert className="w-9 h-9 text-amber-500" />
              <div className="text-sm font-bold text-slate-800 text-center">
                No QR token issued yet
              </div>
              <p className="text-[11px] text-slate-600 text-center leading-relaxed max-w-[240px]">
                This animal has no secure QR token in the farm database. A tag is issued by the
                server and stored against the animal &mdash; no tag is generated in the browser.
              </p>
              <button
                type="button"
                onClick={handleIssueToken}
                disabled={isIssuing}
                className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-3.5 py-2 rounded-lg text-xs transition disabled:opacity-50"
              >
                {isIssuing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <QrCode className="w-3.5 h-3.5" />
                )}
                {isIssuing ? 'Issuing...' : 'Issue QR Token'}
              </button>
              {issueError && (
                <div className="flex items-start gap-1.5 text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-2 max-w-[260px]">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>{issueError}</span>
                </div>
              )}
            </div>
          )}

          {/* Identification labels under QR */}
          <div className="mt-3">
            <div className="text-xl font-black font-mono tracking-wider text-slate-800">
              {animal.animalId}
            </div>
            <div className="text-xs font-medium text-slate-700">
              {animal.breed} • Tag #{animal.earTag}
            </div>
            <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[11px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
              Scan to View Live Profile
            </div>
          </div>
        </div>

        {/* Right Column: Information, Live Link, Actions */}
        <div className="md:col-span-7 flex flex-col justify-between space-y-4">
          <div className="space-y-2.5">
            <div className="text-xs font-bold text-slate-600 uppercase tracking-wide">
              Live Scannable Endpoint
            </div>

            {/* Copyable URL box */}
            <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
              <input
                type="text"
                readOnly
                value={liveProfileUrl || 'No QR token issued yet'}
                className="w-full bg-transparent text-xs font-mono text-slate-700 select-all outline-none truncate"
              />
              {hasEffectiveToken && (
                <>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="shrink-0 p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-slate-200 rounded-md transition-colors"
                    title="Copy Link"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <a
                    href={liveProfileUrl || undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-slate-200 rounded-md transition-colors"
                    title="Open in new tab"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </>
              )}
            </div>

            {/*
             * LAN safety. A QR encoding localhost can never work from a phone,
             * because the phone resolves localhost to itself. We warn loudly but
             * do not block, so testing on the same PC is still possible. No LAN
             * address is guessed or hard-coded.
             */}
            {hasEffectiveToken && baseUrlIsLoopback && (
              <div className="flex items-start gap-2 text-[11px] text-amber-800 bg-amber-50 border border-amber-300 rounded-lg px-3 py-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                <span>
                  <strong>QR URL is using this computer's localhost</strong> and may not work when
                  scanned from a phone. Configure the farm LAN URL (for example
                  <code className="bg-amber-100 px-1 rounded mx-1">http://192.168.x.x:3000</code>)
                  using the settings button below.
                </span>
              </div>
            )}

            {/* Secure Token Info */}
            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="block text-[10px] uppercase font-bold text-slate-600">Secure QR Token</span>
                <span
                  className="font-mono text-slate-800 text-[11px] truncate block"
                  title={effectiveToken || undefined}
                >
                  {effectiveToken ? `${effectiveToken.substring(0, 16)}...` : 'Not issued'}
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="block text-[10px] uppercase font-bold text-slate-600">Security Mode</span>
                <span className="font-medium text-emerald-800 text-[11px] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                  Read-Only Public Passport
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed pt-1">
              Scanning this code opens a page that reads the animal directly from the farm
              database (animal identity, lifecycle status history and recorded identifications).
              Milk, health and reproduction data are shown as unavailable because those modules
              have no live database source in this release.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handlePrintTag}
              disabled={!hasEffectiveToken}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Printer className="w-4 h-4" />
              <span>Print QR Tag</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadQrPng}
              disabled={!hasEffectiveToken}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              <span>Download PNG</span>
            </button>

            {onRegenerateToken && (
              <button
                type="button"
                disabled={isRegenerating}
                onClick={onRegenerateToken}
                className="inline-flex items-center justify-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-2.5 rounded-xl transition-colors disabled:opacity-50"
                title="Rotate the QR token and invalidate the printed tag"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                <span className="hidden lg:inline">Rotate Token</span>
              </button>
            )}

            {hasEffectiveToken && (
              <a
                href={liveProfileUrl || undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center space-x-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold px-3 py-2.5 rounded-xl transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Test Live View</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
