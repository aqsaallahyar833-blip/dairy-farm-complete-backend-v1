import React, { useState, useEffect } from 'react';
import {
  QrCode,
  X,
  Search,
  Scan,
  Camera,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { animalService, animalAdapter, AnimalViewModel } from '../../services';

interface QrAnimalLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAnimal: (animalId: string) => void;
}

export const QrAnimalLookupModal: React.FC<QrAnimalLookupModalProps> = ({
  isOpen,
  onClose,
  onSelectAnimal,
}) => {
  const [animals, setAnimals] = useState<AnimalViewModel[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [matchedAnimal, setMatchedAnimal] = useState<AnimalViewModel | null>(null);

  useEffect(() => {
    if (isOpen) {
      animalService.list({ pageSize: 100 }).then((res) => {
        const vms = animalAdapter.toViewModelList(res.data);
        setAnimals(vms);
        if (vms.length > 0) {
          setMatchedAnimal(vms[0]);
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSimulateScan = (animal: AnimalViewModel) => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setMatchedAnimal(animal);
    }, 600);
  };

  const filteredAnimals = animals.filter(
    (a) =>
      a.animalId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.earTag && a.earTag.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (a.rfid && a.rfid.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (a.breed && a.breed.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">QR &amp; Tag Animal Scanner</h3>
              <p className="text-[10px] text-slate-500">Scan QR / Ear Tag to open profile (Requirement 41)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs">
          {/* Simulated Camera Viewfinder */}
          <div className="relative aspect-video bg-slate-900 rounded-xl overflow-hidden flex flex-col items-center justify-center p-4 text-white">
            <div className="w-36 h-36 border-2 border-emerald-500/80 rounded-xl relative flex items-center justify-center">
              {isScanning && (
                <div className="absolute inset-x-0 top-0 h-0.5 bg-emerald-400 shadow-lg shadow-emerald-500/50 animate-bounce"></div>
              )}
              <QrCode className="w-20 h-20 text-emerald-400/80" />
            </div>
            <span className="text-[11px] text-slate-300 mt-2 font-mono flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-emerald-400" />
              {isScanning ? 'Decoding Tag / QR...' : 'Ready: Point at Cow Ear Tag or Stall QR'}
            </span>
          </div>

          {/* Quick Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Or type Ear Tag (e.g. 001) or Animal ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Detected / Selected Animal Card */}
          {matchedAnimal && (
            <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider block">
                    Recognized Animal
                  </span>
                  <span className="text-base font-bold text-slate-900 font-mono">
                    {matchedAnimal.animalId}
                  </span>
                  <span className="text-xs text-slate-600 block">
                    Ear Tag: <strong className="font-mono">{matchedAnimal.earTag || matchedAnimal.animalId}</strong> &bull; {matchedAnimal.breed}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-200 text-emerald-900">
                  {matchedAnimal.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => {
                    // Must be the NUMERIC database id: App.tsx passes this to
                    // AnimalProfileView, which calls GET /api/animals/{id}.
                    // `animalId` is now the human-readable code (AN-001).
                    onSelectAnimal(matchedAnimal.id);
                    onClose();
                  }}
                  className="py-2 px-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold flex items-center justify-center space-x-1 shadow-xs transition text-[11px]"
                >
                  <span>Admin Profile</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    /*
                     * Live Passport navigation.
                     *
                     * Phase 2B: only a REAL backend-issued token may be used.
                     * The previous `qrToken || animalId` fallback sent the
                     * animal CODE as a token, which the real API does not know.
                     * Without a real token there is nothing to open, so the
                     * button is hidden rather than navigating to a broken page.
                     */
                    const realToken = matchedAnimal.qrToken;
                    if (!realToken) return;

                    window.history.pushState({}, '', `/qr/animal/${encodeURIComponent(realToken)}`);
                    window.dispatchEvent(new Event('popstate'));
                    onClose();
                  }}
                  className="py-2 px-2 bg-slate-900 hover:bg-black text-white rounded-lg font-bold flex items-center justify-center space-x-1 shadow-xs transition text-[11px] disabled:opacity-50"
                  disabled={!matchedAnimal.qrToken}
                  title={
                    matchedAnimal.qrToken
                      ? 'Open the live passport for this animal'
                      : 'No QR token has been issued for this animal yet'
                  }
                >
                  <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{matchedAnimal.qrToken ? 'Live Passport' : 'No QR token'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Quick Select Candidate List */}
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Quick Select Ear Tag / QR Tag:
            </span>
            <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
              {filteredAnimals.slice(0, 8).map((a) => (
                <div
                  key={a.id}
                  onClick={() => handleSimulateScan(a)}
                  className="p-2 bg-slate-50 hover:bg-emerald-50 rounded-lg border border-slate-100 hover:border-emerald-200 cursor-pointer flex items-center justify-between transition"
                >
                  <div className="flex items-center space-x-2">
                    <QrCode className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-bold text-slate-900 font-mono">{a.animalId}</span>
                    <span className="text-slate-500 text-[11px]">(Tag {a.earTag || 'N/A'})</span>
                  </div>
                  <span className="text-[10px] text-slate-600">{a.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 font-semibold text-xs"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
