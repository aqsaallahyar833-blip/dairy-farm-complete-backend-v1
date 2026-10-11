import React, { useState, useEffect, useCallback } from 'react';
import {
  QrCode,
  RefreshCw,
  AlertTriangle,
  ArrowLeft,
  Droplets,
  Heart,
  Activity,
  Wheat,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Info,
  MapPin,
  Tag,
} from 'lucide-react';
import { Animal } from '../../types';
import { animalWritesApi, type QrResolutionResult } from '../../services/api/apiClient';
import { ReturnButton } from '../layout/ReturnButton';

interface LiveQrAnimalProfileProps {
  qrTokenOrId: string;
  onGoToDashboard?: () => void;
}

type Resolution = QrResolutionResult;

/**
 * LIVE ANIMAL PASSPORT (Phase 2B)
 *
 * DATA SOURCE, and it is only one:
 *
 *   QR URL -> React SPA -> this component -> animalWritesApi.resolveQrToken()
 *          -> GET /api/animals/qr/{token} -> ASP.NET Core -> MySQL "Dairy Farm 1"
 *
 * There is deliberately NO mock fallback. The previous implementation called
 * `/api/animals/qr/{token}/dossier` (a route that never existed) and then fell
 * back to `mockApi.getAnimalQrProfile()`, which meant a failed lookup rendered a
 * FABRICATED animal under a "LIVE ANIMAL DIGITAL PASSPORT" heading. That is
 * removed. If the real API cannot answer, this page says so.
 *
 * The backend returns `AnimalDetailDto`: the animal, its relationships, its real
 * status history and its real identifications. It does NOT return milk,
 * breeding, health, treatment or withdrawal data, because those modules have no
 * real API yet. Those sections are kept in the layout and state plainly that no
 * live source is connected, rather than showing invented figures.
 */
export const LiveQrAnimalProfile: React.FC<LiveQrAnimalProfileProps> = ({
  qrTokenOrId,
  onGoToDashboard,
}) => {
  const [resolution, setResolution] = useState<Resolution | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  const fetchLiveProfile = useCallback(
    async (isBackground = false) => {
      if (!isBackground) setRefreshing(true);
      setPhotoFailed(false);

      const result = await animalWritesApi.resolveQrToken(qrTokenOrId);

      setResolution(result);
      setLastRefreshedAt(new Date());
      setLoading(false);
      setRefreshing(false);
    },
    [qrTokenOrId]
  );

  useEffect(() => {
    setLoading(true);
    fetchLiveProfile();
  }, [fetchLiveProfile]);

  const animal: Animal | null = resolution?.animal ?? null;
  const detail = resolution?.detail ?? null;

  const isLactating = animal?.status === 'Lactating';
  const isSick = animal?.status === 'Sick';
  const isDead = animal?.status === 'Dead';
  const isSold = animal?.status === 'Sold';

  const calculateAge = (dob: string) => {
    if (!dob) return 'Not available';
    try {
      const birth = new Date(dob);
      if (Number.isNaN(birth.getTime())) return 'Not available';
      const now = new Date();
      const months =
        (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
      if (months < 12) return `${Math.max(0, months)} months`;
      const years = Math.floor(months / 12);
      const rem = months % 12;
      return rem > 0 ? `${years}y ${rem}m` : `${years} years`;
    } catch {
      return 'Not available';
    }
  };

  /** The real photo endpoint. 404 simply means "no photo stored" - not a failure. */
  const photoUrl = animal
    ? animalWritesApi.photoUrl(Number(animal.id))
    : null;

  // -----------------------------------------------------------------------
  // 1. Loading
  // -----------------------------------------------------------------------
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 rounded-2xl bg-emerald-950 border border-emerald-500/30 flex items-center justify-center mb-4 relative">
          <QrCode className="w-8 h-8 text-emerald-400 animate-pulse" />
        </div>
        <h2 className="text-lg font-bold text-white tracking-wide">
          Loading live animal data...
        </h2>
        <p className="text-xs text-slate-400 mt-1 font-mono truncate max-w-xs text-center">
          {qrTokenOrId}
        </p>
        <div className="mt-6 flex items-center space-x-2 text-xs text-emerald-400">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>Querying the farm database...</span>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // 2. Unknown token (server answered 404)
  // -----------------------------------------------------------------------
  if (resolution?.status === 'notFound') {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-950/80 border border-rose-500/40 flex items-center justify-center mb-4 text-rose-400">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Animal QR code not found.</h1>
        <p className="text-sm text-slate-300 max-w-md mb-6 leading-relaxed">
          This token is not recognised by the farm database. It may belong to a tag
          that has been replaced, or the record may have been removed.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => fetchLiveProfile()}
            className="inline-flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-5 py-2.5 rounded-xl transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try again</span>
          </button>
          {onGoToDashboard && (
            <button
              type="button"
              onClick={onGoToDashboard}
              className="inline-flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium px-5 py-2.5 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to dashboard</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // 3. API unavailable (network failure / non-2xx / bad payload)
  // -----------------------------------------------------------------------
  if (resolution?.status === 'unavailable' || !animal) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-950/80 border border-amber-500/40 flex items-center justify-center mb-4 text-amber-400">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">
          Live animal data is currently unavailable.
        </h1>
        <p className="text-sm text-slate-300 max-w-md mb-2 leading-relaxed">
          The farm database could not be reached, so no animal record can be shown.
          No placeholder or sample data is displayed in its place.
        </p>
        {resolution?.message && (
          <p className="text-xs text-slate-400 max-w-md mb-6 font-mono">{resolution.message}</p>
        )}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => fetchLiveProfile()}
            className="inline-flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-5 py-2.5 rounded-xl transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry</span>
          </button>
          {onGoToDashboard && (
            <button
              type="button"
              onClick={onGoToDashboard}
              className="inline-flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium px-5 py-2.5 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to dashboard</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // 4. Real animal resolved
  // -----------------------------------------------------------------------
  const identifications = detail?.identifications ?? [];
  const statusHistory = detail?.statusHistory ?? [];

  /** Panels whose modules have no real API in this phase. */
  const NoLiveSource = ({ icon: Icon, title, note }: { icon: any; title: string; note: string }) => (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-slate-500" />
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">{title}</h3>
      </div>
      <div className="flex items-start gap-2 text-xs text-slate-400 bg-slate-800/50 border border-slate-700/60 rounded-lg p-3">
        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-400" />
        <span>
          <strong className="text-amber-300">No live data source connected yet.</strong>{' '}
          {note}
        </span>
      </div>
    </div>
  );

  const Field = ({ label, value }: { label: string; value: string }) => (
    <div>
      <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
        {label}
      </span>
      <span className="text-xs text-slate-100 font-medium">{value}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 pb-10">
      {/* Header */}
      <header className="bg-slate-950/80 border-b border-slate-800 px-4 py-3 flex items-center gap-3 sticky top-0 z-10 backdrop-blur">
        <div className="w-9 h-9 rounded-lg bg-emerald-950 border border-emerald-500/30 flex items-center justify-center shrink-0">
          <QrCode className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-sm font-bold text-white truncate">Live Animal Passport</h1>
          <p className="text-[10px] text-emerald-400/90 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Verified from farm database
          </p>
        </div>
        {lastRefreshedAt && (
          <span className="hidden sm:flex items-center gap-1 text-[10px] text-slate-400 font-mono">
            <Clock className="w-3 h-3" />
            {lastRefreshedAt.toLocaleTimeString()}
          </span>
        )}
        <button
          type="button"
          onClick={() => fetchLiveProfile()}
          disabled={refreshing}
          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors disabled:opacity-50"
          title="Refresh from the farm database"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        {/* Historical lifecycle banner */}
        {(isSold || isDead) && (
          <div className="bg-amber-950/60 border border-amber-500/40 rounded-2xl p-3.5 text-amber-200 flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="text-xs">
              <span className="font-bold uppercase tracking-wider block">
                Historical Lifecycle Record
              </span>
              This animal is marked as <strong>{animal.status.toUpperCase()}</strong> in the farm
              database.
            </div>
          </div>
        )}

        {/* Hero card with REAL photo */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="relative h-48 sm:h-56 bg-slate-800 w-full overflow-hidden flex items-center justify-center">
            {photoUrl && !photoFailed ? (
              <img
                src={photoUrl}
                alt={`Animal ${animal.animalId}`}
                className="w-full h-full object-cover object-center brightness-95"
                onError={() => setPhotoFailed(true)}
              />
            ) : (
              /* No stored photo. A clean placeholder - not an API failure. */
              <div className="flex flex-col items-center justify-center text-slate-500 gap-2">
                <div className="w-20 h-20 rounded-full bg-slate-700/60 border border-slate-600 flex items-center justify-center text-2xl font-black text-slate-400">
                  {animal.animalId?.slice(-3) || '??'}
                </div>
                <span className="text-xs">No photo stored for this animal</span>
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent pointer-events-none"></div>

            <div className="absolute top-3 left-3">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-md backdrop-blur-md ${
                  isLactating
                    ? 'bg-emerald-500/90 text-white'
                    : isSick
                      ? 'bg-rose-600/90 text-white'
                      : isDead || isSold
                        ? 'bg-slate-800/90 text-slate-300 border border-slate-600'
                        : 'bg-blue-600/90 text-white'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-white"></span>
                {animal.status}
              </span>
            </div>
          </div>

          <div className="p-4 space-y-3">
            <div>
              <h2 className="text-xl font-black text-white font-mono">
                {animal.animalId || 'Uncoded animal'}
              </h2>
              <p className="text-sm text-slate-300">
                {animal.name || <span className="italic text-slate-500">Unnamed</span>}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <Field label="Breed" value={animal.breed || 'Not available'} />
              <Field label="Sex" value={animal.sex || 'Not available'} />
              <Field
                label="Age"
                value={animal.dateOfBirth ? calculateAge(animal.dateOfBirth) : 'Not available'}
              />
              <Field label="Ear tag" value={animal.earTag || 'Not available'} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Field label="Farm" value={detail?.farmName || 'Not available'} />
              <Field label="Group" value={detail?.groupName || 'Not available'} />
              <Field
                label="Shed"
                value={detail?.shed?.shedName || 'Not available'}
              />
              <Field
                label="Dam / Sire"
                value={
                  detail?.damAnimalCode || detail?.sireAnimalCode
                    ? `${detail.damAnimalCode || '—'} / ${detail.sireAnimalCode || '—'}`
                    : 'Not available'
                }
              />
            </div>

            {detail?.notes && (
              <div className="pt-1">
                <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
                  Farm notes
                </span>
                <p className="text-xs text-slate-300 bg-slate-800/50 border border-slate-700/60 rounded-lg p-3 leading-relaxed">
                  {detail.notes}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Real status history from animal_status_history */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Status history
            </h3>
            <span className="ml-auto text-[10px] text-slate-500 font-mono">
              {statusHistory.length} record{statusHistory.length === 1 ? '' : 's'}
            </span>
          </div>

          {statusHistory.length === 0 ? (
            <p className="text-xs text-slate-400 bg-slate-800/50 border border-slate-700/60 rounded-lg p-3">
              No status history recorded.
            </p>
          ) : (
            <ol className="space-y-2">
              {statusHistory.map((h) => (
                <li
                  key={h.id}
                  className="bg-slate-800/50 border border-slate-700/60 rounded-lg p-3 text-xs"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-slate-400">
                      {h.oldStatus || 'CREATED'}
                    </span>
                    <span className="text-slate-600">&rarr;</span>
                    <span className="font-mono font-bold text-emerald-300">{h.newStatus}</span>
                    <span className="ml-auto text-[10px] text-slate-500 font-mono">
                      {h.changedAt ? new Date(h.changedAt).toLocaleString() : ''}
                    </span>
                  </div>
                  {h.reason && <p className="text-slate-400 mt-1">{h.reason}</p>}
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* Real identifications from animal_identifications */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Tag className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Identifications
            </h3>
          </div>

          {identifications.length === 0 ? (
            <p className="text-xs text-slate-400 bg-slate-800/50 border border-slate-700/60 rounded-lg p-3">
              No ear tag, RFID or QR identification recorded for this animal.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {identifications.map((i) => (
                <li
                  key={i.id}
                  className="flex items-center justify-between gap-3 bg-slate-800/50 border border-slate-700/60 rounded-lg px-3 py-2 text-xs"
                >
                  <span className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold">
                    {i.type}
                  </span>
                  <span className="font-mono text-slate-100 truncate">
                    {i.type.toUpperCase() === 'QR' ? `${i.value.slice(0, 10)}...` : i.value}
                  </span>
                  {i.isPrimary && (
                    <span className="text-[10px] text-emerald-400 font-bold shrink-0">PRIMARY</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Modules without a real API in this phase - stated, never invented */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <NoLiveSource
            icon={Droplets}
            title="Milk production"
            note="The milk module has no live database endpoint in this release."
          />
          <NoLiveSource
            icon={Heart}
            title="Health & treatment"
            note="The health module has no live database endpoint in this release."
          />
          <NoLiveSource
            icon={Activity}
            title="Reproduction"
            note="The breeding module has no live database endpoint in this release."
          />
          <NoLiveSource
            icon={Wheat}
            title="Withdrawal status"
            note="Withdrawal data depends on the health module, which is not connected yet."
          />
        </div>

        <div className="flex items-center gap-2 text-[10px] text-slate-500 pt-2">
          <Calendar className="w-3 h-3" />
          <span>
            Record created {detail?.createdAt ? new Date(detail.createdAt).toLocaleDateString() : '—'}
            &nbsp;&middot;&nbsp; last updated{' '}
            {detail?.updatedAt ? new Date(detail.updatedAt).toLocaleString() : '—'}
          </span>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-slate-500">
          <MapPin className="w-3 h-3" />
          <span className="font-mono truncate">Served from the farm database (Dairy Farm 1)</span>
        </div>

        <div className="pt-2">
          <ReturnButton onClick={onGoToDashboard} label="Back to farm dashboard" />
        </div>

        <p className="text-[10px] text-slate-600 flex items-start gap-1.5">
          <FileText className="w-3 h-3 mt-0.5 shrink-0" />
          <span>
            Only values actually present in the farm database are shown above. Missing values are
            reported as &ldquo;Not available&rdquo; rather than estimated.
          </span>
        </p>
      </main>
    </div>
  );
};
