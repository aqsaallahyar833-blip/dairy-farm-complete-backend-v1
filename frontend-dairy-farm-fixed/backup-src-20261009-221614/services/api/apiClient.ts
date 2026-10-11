/**
 * API Client Contract
 *
 * Two layers live here:
 *   1. The original transport INTERFACE (unchanged - other modules still rely on it).
 *   2. The real Animals HTTP client, used by animalService for reads.
 *
 * DATA PROVENANCE
 * ----------------
 * Animals reads now come from the ASP.NET Core API, which reads the real
 * `Dairy Farm 1` MySQL database. The database is the single source of truth for
 * every value, including `status`, which arrives UPPERCASE exactly as stored
 * (ACTIVE, LACTATING, DRY, PREGNANT, SICK, QUARANTINE, SOLD, DEAD, CALF,
 * HEIFER, BULL). Title-casing happens ONLY for display, in the adapter.
 *
 * Nothing is invented: when the database has no ear tag for an animal
 * (animal_identifications is currently empty), `earTag` is left empty rather
 * than being derived from the animal code.
 */

import { ApiResponse, PaginatedResponse, ApiError } from '../../types';
import { Animal } from '../../types';
import { MilkingSession, MilkQualityStatus, MilkRecord } from '../../types';
import { BreedingRecord } from '../../types';
import { CalvingRecord } from '../../types';
import { HealthRecord, TreatmentRecord, VaccinationRecord, Medicine } from '../../types';
import {
  FeedItem, Ration, RationIngredient, FeedInventoryTransaction, InventoryTransaction, Supplier,
} from '../../types';
import { PregnancyRecord, PregnancyStatus } from '../../types';

interface InventoryItem {
  id: string;
  farmId: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  minimumStock: number;
  unitPrice: number;
  supplierName: string;
  batchNumber: string;
  expiryDate: string;
  warehouse: string;
  status: string;
  notes?: string;
}

export interface ApiClientOptions {
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
}

export interface IApiClient {
  get<T>(path: string, options?: ApiClientOptions): Promise<ApiResponse<T>>;
  getList<T>(path: string, options?: ApiClientOptions): Promise<PaginatedResponse<T>>;
  post<T, B = unknown>(path: string, body: B, options?: ApiClientOptions): Promise<ApiResponse<T>>;
  put<T, B = unknown>(path: string, body: B, options?: ApiClientOptions): Promise<ApiResponse<T>>;
  delete<T>(path: string, options?: ApiClientOptions): Promise<ApiResponse<T>>;
}

export class AppApiError extends Error implements ApiError {
  public success = false as const;
  public code?: string;
  public fieldErrors?: Record<string, string>;

  constructor(message: string, code?: string, fieldErrors?: Record<string, string>) {
    super(message);
    this.name = 'AppApiError';
    this.success = false;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

// ===========================================================================
// Real Animals client
// ===========================================================================

const API_BASE_URL: string =
  ((import.meta as any).env?.VITE_API_BASE_URL as string | undefined) || 'http://localhost:5080/api';

/** Shape returned by GET /api/animals. */
interface AnimalApiDto {
  animalId: number;
  animalCode: string;
  tagNumber?: string | null;
  name?: string | null;
  breedId?: number | null;
  breedName?: string | null;
  dateOfBirth?: string | null;
  status: string;
  sex: string;
  farmId: number;
  farmName?: string | null;
  groupId?: number | null;
  groupName?: string | null;
  photo?: string | null;
  notes?: string | null;
  purchaseDate?: string | null;
  purchasePrice?: number | null;
  ageInMonths?: number | null;
  createdAt?: string;
  updatedAt?: string;
  damId?: number | null;
  damAnimalCode?: string | null;
  sireId?: number | null;
  sireAnimalCode?: string | null;
  shed?: { shedId: number; shedName: string } | null;
  statusHistory?: Array<{
    id: number;
    oldStatus?: string | null;
    newStatus: string;
    reason?: string | null;
    changedAt: string;
    userId?: number | null;
  }>;
  identifications?: Array<{
    id: number;
    type: string;
    value: string;
    isPrimary: boolean;
    activeFrom?: string | null;
    activeTo?: string | null;
  }>;
}

/**
 * Maps a database status enum (UPPERCASE) to the UI's AnimalStatus union.
 * The database remains the source of truth; this only bridges casing.
 *
 * 'Active' and 'Bull' exist in the database enum but were absent from the old
 * mock union, so they are handled explicitly rather than silently coerced.
 */
export function dbStatusToUiStatus(dbStatus: string | null | undefined): Animal['status'] {
  switch ((dbStatus || '').toUpperCase()) {
    case 'ACTIVE':
      return 'Active';
    case 'LACTATING':
      return 'Lactating';
    case 'DRY':
      return 'Dry';
    case 'PREGNANT':
      return 'Pregnant';
    case 'OPEN':
      return 'Open';
    case 'SICK':
      return 'Sick';
    case 'QUARANTINE':
      return 'Quarantine';
    case 'SOLD':
      return 'Sold';
    case 'DEAD':
      return 'Dead';
    case 'CALF':
      return 'Calf';
    case 'HEIFER':
      return 'Heifer';
    case 'BULL':
      return 'Bull';
    default:
      return 'Open';
  }
}

/** Inverse of dbStatusToUiStatus, so a UI filter becomes a valid enum filter. */
export function uiStatusToDbStatus(uiStatus: string | undefined): string | undefined {
  if (!uiStatus || uiStatus === 'ALL') return undefined;
  return uiStatus.toUpperCase();
}

export function dbSexToUiSex(dbSex: string | null | undefined): Animal['sex'] {
  return String(dbSex || '').toUpperCase() === 'MALE' ? 'Male' : 'Female';
}

export function uiSexToDbSex(uiSex: string | undefined): string | undefined {
  if (!uiSex || uiSex === 'ALL') return undefined;
  return uiSex.toUpperCase();
}

const KNOWN_BREEDS: Animal['breed'][] = ['Holstein Friesian', 'Jersey', 'Crossbred', 'Other'];

/**
 * Converts one API record into the frontend `Animal` shape.
 *
 * IDENTIFIER SEMANTICS (Phase 2B)
 * --------------------------------
 * The database has TWO identifiers and they are not interchangeable:
 *   - animal_id   : numeric surrogate primary key. API routes take THIS.
 *   - animal_code : human-readable farm code, e.g. "AN-001". The UI shows THIS.
 *
 * `mapApiAnimal` previously assigned the numeric key to `animal.animalId`,
 * which is wrong: every label, QR card and printed tag in the UI is documented
 * and expected to show the human-readable code. It now maps:
 *
 *   id          <- numeric database key  (API routes, selection, write calls)
 *   animalId    <- human-readable code   (display, labels, printed tags)
 *   databaseId  <- explicit alias of the numeric key, for new code
 *   qrToken     <- the REAL backend-issued token from animal_identifications
 *                  where type = 'QR'. Never derived, never invented.
 */
export function mapApiAnimal(dto: AnimalApiDto): Animal {
  const breed = KNOWN_BREEDS.includes(dto.breedName as Animal['breed'])
    ? (dto.breedName as Animal['breed'])
    : 'Other';

  // The QR token is issued by the backend and stored as an identification row.
  // It is used verbatim or not at all - the UI must never manufacture one.
  const realQrToken = (dto.identifications || []).find(
    (i) => String(i.type).toUpperCase() === 'QR' && i.value
  )?.value;

  const numericId = String(dto.animalId);

  /*
   * The ear tag is read ONLY from a real EAR_TAG identification.
   *
   * `dto.tagNumber` is deliberately NOT used. The backend selects the primary
   * identification, and a QR row carries is_primary = 1 whenever the animal has
   * no other identifier - so `tagNumber` can legitimately BE the QR token. The
   * QR token authorises the [AllowAnonymous] GET /api/animals/qr/{token}
   * endpoint, so trusting tagNumber here would render the animal's bearer secret
   * under a routine farm label, and print it on the physical tag.
   *
   * Deriving it from the typed identification keeps this correct regardless of
   * how the upstream projection is implemented.
   */
  const realEarTag = (dto.identifications || []).find(
    (i) => String(i.type).toUpperCase() === 'EAR_TAG' && i.value && !i.activeTo
  )?.value;

  return {
    id: numericId,
    /** Explicit, unambiguous name for the numeric key. */
    databaseId: numericId,
    /** Human-readable farm code, e.g. "AN-001". */
    animalId: dto.animalCode,
    farmId: String(dto.farmId ?? ''),
    // Only a real EAR_TAG identification yields a tag. Never derived from
    // animalCode, and never taken from tagNumber (see the note above).
    earTag: realEarTag || '',
    name: dto.name || undefined,
    photoUrl: dto.photo || undefined,
    // Undefined when the backend has issued no QR token. Callers must show an
    // "issue token" action rather than substituting another value.
    qrToken: realQrToken || undefined,
    breed,
    sex: dbSexToUiSex(dto.sex),
    dateOfBirth: dto.dateOfBirth || '',
    status: dbStatusToUiStatus(dto.status),
    groupId: dto.groupId != null ? String(dto.groupId) : '',
    // A shed is only known through the animal's group; blank when unassigned.
    shedId: dto.shed ? String(dto.shed.shedId) : '',
    location: dto.groupName || undefined,
    damId: dto.damId != null ? String(dto.damId) : undefined,
    sireId: dto.sireId != null ? String(dto.sireId) : undefined,
    damTag: dto.damAnimalCode || undefined,
    sireTag: dto.sireAnimalCode || undefined,
    purchaseDate: dto.purchaseDate || undefined,
    purchasePrice: dto.purchasePrice ?? undefined,
    remarks: dto.notes || undefined,
  };
}

export interface AnimalListFilters {
  status?: string;
  sex?: string;
  breedId?: number;
  groupId?: number;
  farmId?: number;
  search?: string;
  page?: number;
  pageSize?: number;
}

/** Thrown when the API is unreachable, so the caller can fall back to mock. */
export class ApiUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiUnavailableError';
  }
}

async function fetchAnimalsRaw(filters: AnimalListFilters = {}): Promise<AnimalApiDto[]> {
  const params = new URLSearchParams();

  const status = uiStatusToDbStatus(filters.status);
  if (status) params.set('status', status);

  const sex = uiSexToDbSex(filters.sex);
  if (sex) params.set('sex', sex);

  if (filters.farmId != null) params.set('farmId', String(filters.farmId));
  if (filters.breedId != null) params.set('breedId', String(filters.breedId));
  if (filters.groupId != null) params.set('groupId', String(filters.groupId));
  if (filters.search && filters.search.trim()) params.set('search', filters.search.trim());

  const qs = params.toString();
  const url = `${API_BASE_URL}/animals${qs ? `?${qs}` : ''}`;

  let response: Response;
  try {
    response = await fetch(url, { headers: { Accept: 'application/json' } });
  } catch (err) {
    throw new ApiUnavailableError(
      `Animals API unreachable at ${API_BASE_URL}: ${(err as Error).message}`
    );
  }

  if (!response.ok) {
    throw new AppApiError(`Failed to fetch animals (HTTP ${response.status}).`);
  }

  const payload = (await response.json()) as AnimalApiDto[];
  return Array.isArray(payload) ? payload : [];
}

async function fetchAnimalByIdRaw(id: string | number): Promise<AnimalApiDto | null> {
  const url = `${API_BASE_URL}/animals/${encodeURIComponent(String(id))}`;

  let response: Response;
  try {
    response = await fetch(url, { headers: { Accept: 'application/json' } });
  } catch (err) {
    throw new ApiUnavailableError(
      `Animals API unreachable at ${API_BASE_URL}: ${(err as Error).message}`
    );
  }

  // 404 is a legitimate answer, not a transport failure.
  if (response.status === 404) return null;

  if (!response.ok) {
    throw new AppApiError(`Failed to fetch animal ${id} (HTTP ${response.status}).`);
  }

  return (await response.json()) as AnimalApiDto;
}

export const animalsApi = {
  getApiBaseUrl: () => API_BASE_URL,

  /** Returns a paginated response shaped exactly like the mock layer's. */
  async list(filters: AnimalListFilters = {}): Promise<PaginatedResponse<Animal>> {
    const dtos = await fetchAnimalsRaw(filters);
    const animals = dtos.map(mapApiAnimal);
    const pageSize = filters.pageSize && filters.pageSize > 0 ? filters.pageSize : animals.length || 1;
    const page = filters.page && filters.page > 0 ? filters.page : 1;

    return {
      data: animals,
      page,
      pageSize,
      total: animals.length,
      totalPages: Math.max(1, Math.ceil(animals.length / pageSize)),
    };
  },

  async getById(id: string | number): Promise<ApiResponse<Animal | null>> {
    const dto = await fetchAnimalByIdRaw(id);
    return { success: true, data: dto ? mapApiAnimal(dto) : null };
  },
};

// ===========================================================================
// Lookup client: breeds, farms, groups, sheds (read-only)
// ===========================================================================

/** Shared fetch so all lookups behave identically, including error handling. */
async function fetchLookup<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { headers: { Accept: 'application/json' } });
  } catch (err) {
    throw new ApiUnavailableError(
      `API unreachable at ${API_BASE_URL}${path}: ${(err as Error).message}`
    );
  }

  if (response.status === 404) {
    throw new AppApiError(`Not found: ${path}`);
  }
  if (!response.ok) {
    throw new AppApiError(`Lookup failed (HTTP ${response.status}) for ${path}`);
  }

  return (await response.json()) as T;
}

export interface BreedLookup {
  breedId: number;
  name: string;
  description?: string | null;
  active: boolean;
}

export interface FarmLookup {
  farmId: number;
  companyId: number;
  name: string;
  location?: string | null;
  contact?: string | null;
  status: string;
}

export interface AnimalGroupLookup {
  groupId: number;
  farmId: number;
  farmName?: string | null;
  name: string;
  animalType: string;
  status: string;
  shedId?: number | null;
  animalCount: number;
}

export interface ShedLookup {
  shedId: number;
  shedName: string;
  farmId: number;
  farmName?: string | null;
  capacity?: number | null;
  groupCount: number;
}

export const lookupsApi = {
  getBreeds: (activeOnly = false) =>
    fetchLookup<BreedLookup[]>(`/breeds${activeOnly ? '?activeOnly=true' : ''}`),

  getBreedByName: (name: string) =>
    fetchLookup<BreedLookup>(`/breeds/by-name/${encodeURIComponent(name)}`),

  getFarms: () => fetchLookup<FarmLookup[]>('/farms'),

  getAnimalGroups: (farmId?: number) =>
    fetchLookup<AnimalGroupLookup[]>(`/animal-groups${farmId ? `?farmId=${farmId}` : ''}`),

  getSheds: (farmId?: number) =>
    fetchLookup<ShedLookup[]>(`/sheds${farmId ? `?farmId=${farmId}` : ''}`),

  /** Identifications for one animal. Empty array when the animal has none. */
  getAnimalIdentifications: (id: string | number) =>
    fetchLookup<Array<{ id: number; type: string; value: string; isPrimary: boolean }>>(
      `/animals/${encodeURIComponent(String(id))}/identifications`
    ),

  /** Status history for one animal, most recent first. */
  getAnimalStatusHistory: (id: string | number) =>
    fetchLookup<Array<{ id: number; oldStatus?: string | null; newStatus: string; reason?: string | null; changedAt: string }>>(
      `/animals/${encodeURIComponent(String(id))}/status-history`
    ),
};

/**
 * Resolves a breed NAME to its id for the Animals list filter.
 *
 * The Animals view filters by breed name (its dropdown holds names), while the
 * API filters by breed_id. The name -> id map is fetched once and cached for
 * the session, so switching filters does not re-query per keystroke.
 */
let breedNameToIdCache: Map<string, number> | null = null;

export async function resolveBreedId(breedName: string | undefined): Promise<number | undefined> {
  if (!breedName || breedName === 'ALL') return undefined;

  if (!breedNameToIdCache) {
    const breeds = await lookupsApi.getBreeds();
    breedNameToIdCache = new Map(breeds.map((b) => [b.name.toLowerCase(), b.breedId]));
  }

  return breedNameToIdCache.get(breedName.trim().toLowerCase());
}

/** Clears the cached breed map. Used by tests and after a data reload. */
export function clearBreedCache(): void {
  breedNameToIdCache = null;
}

// ===========================================================================
// Authentication (Phase 2A)
//
// The token is held in memory first and mirrored to sessionStorage so a page
// refresh does not sign the user out. It is NEVER written to localStorage, so
// it does not outlive the browser session the way a long-lived localStorage
// token would.
// ===========================================================================

const TOKEN_STORAGE_KEY = 'dairy_farm_jwt';
let inMemoryToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

/**
 * The authenticated identity, exactly as `GET /api/auth/me` returns it.
 *
 * CONTRACT NOTE: this deliberately has NO `companyId`. The canonical backend
 * scopes a user to a FARM (`users.farm_id`), not to a company, so the identity
 * carries `farmId` / `farmName`. The previous `companyId` field did not exist
 * server-side and was always undefined.
 */
export interface AuthenticatedUser {
  userId: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  /** From `users.farm_id`. This is the farm every scoped request must use. */
  farmId: number;
  /** Display name of the current farm, from the server. Never hardcoded. */
  farmName?: string | null;
  status: string;
  roles: string[];
}

interface LoginResponse {
  token: string;
  tokenType: string;
  expiresInSeconds: number;
  expiresAtUtc: string;
  user: AuthenticatedUser;
}

function readStoredToken(): string | null {
  if (inMemoryToken) return inMemoryToken;
  try {
    inMemoryToken = sessionStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    // Private browsing can block sessionStorage. The in-memory copy still
    // works for the lifetime of this page.
  }
  return inMemoryToken;
}

function writeStoredToken(token: string | null): void {
  inMemoryToken = token;
  try {
    if (token) sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    else sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // Ignore: the in-memory copy is authoritative for this page.
  }
}

/** Registered by the app shell so a 401 can send the user back to sign-in. */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

export function getToken(): string | null {
  return readStoredToken();
}

export function isAuthenticated(): boolean {
  return !!readStoredToken();
}

export function clearToken(): void {
  writeStoredToken(null);
}

/** Header set for every protected request. Empty while signed out. */
function authHeaders(): Record<string, string> {
  const token = readStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Shared request helper for write endpoints.
 *
 * The backend returns the same `{ success, message, data, error }` envelope as
 * the read endpoints. That envelope is preserved rather than reshaped so the
 * existing error handling keeps working.
 */
async function requestWrite<T>(
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'GET',
  path: string,
  body?: unknown,
  authenticated = true
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (authenticated) Object.assign(headers, authHeaders());
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (err) {
    throw new ApiUnavailableError(
      `API unreachable at ${API_BASE_URL}${path}: ${(err as Error).message}`
    );
  }

  // 401 means the token is missing, expired or rejected. Clear it so the app
  // does not keep retrying with a dead token, and let the shell react.
  if (response.status === 401) {
    clearToken();
    onUnauthorized?.();
    return {
      success: false,
      message: 'Your session has expired. Please sign in again.',
    } as ApiResponse<T>;
  }

  let payload: any = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    return {
      success: false,
      message: payload?.message || `Request failed (HTTP ${response.status}).`,
    } as ApiResponse<T>;
  }

  return {
    success: payload?.success !== false,
    message: payload?.message || '',
    data: payload?.data,
  } as ApiResponse<T>;
}

export const authApi = {
  /**
   * POST /api/auth/login
   *
   * CONTRACT FIX: the request property is `username`, NOT `email`. The
   * canonical backend's LoginRequest has a single required field `username`
   * (the `users` table has a UNIQUE `username` and a nullable `email`), and
   * rejects an `email` body with 400 `{"username is required."}`.
   *
   * The field is still labelled for the user as an email-or-username, because
   * the server falls back to `u.Email` when matching.
   */
  async login(username: string, password: string): Promise<ApiResponse<LoginResponse>> {
    const result = await requestWrite<LoginResponse>(
      'POST',
      '/auth/login',
      { username, password },
      false
    );

    // Only keep a token the server actually issued.
    if (result.success && result.data?.token) {
      writeStoredToken(result.data.token);
    }

    return result;
  },

  async me(): Promise<ApiResponse<AuthenticatedUser | null>> {
    if (!isAuthenticated()) {
      return { success: false, message: 'Not signed in.' } as ApiResponse<AuthenticatedUser>;
    }
    return requestWrite<AuthenticatedUser>('GET', '/auth/me');
  },

  logout(): void {
    clearToken();
  },
};

// ===========================================================================
// Animal write operations (Phase 2A)
//
// IDENTIFIER NOTE: these routes take the NUMERIC database primary key
// (animal_id). The UI field `animal.animalId` holds the animal CODE (e.g.
// "AN-001") while `animal.id` holds the numeric key. Always pass `animal.id`,
// never `animal.animalId`, to these methods.
// ===========================================================================

export interface CreateAnimalBody {
  farmId: number;
  animalCode?: string;
  name?: string;
  breedId?: number;
  sex: 'MALE' | 'FEMALE';
  dateOfBirth?: string;
  status?: string;
  groupId?: number;
  damId?: number;
  sireId?: number;
  purchaseDate?: string;
  purchasePrice?: number;
  notes?: string;
  earTag?: string;
  rfid?: string;
}

/**
 * The real database status enum. `INACTIVE` is deliberately absent because it
 * does not exist in `animals.status`; retirement uses SOLD or DEAD.
 * `QUARANTINE` is the exact stored spelling (not QUARANTINED).
 */
export const DB_STATUSES = [
  'ACTIVE',
  'LACTATING',
  'DRY',
  'PREGNANT',
  'SICK',
  'QUARANTINE',
  'SOLD',
  'DEAD',
  'CALF',
  'HEIFER',
  'BULL',
] as const;

export type DbStatus = (typeof DB_STATUSES)[number];

/**
 * Outcome of resolving a scanned QR token against the real backend.
 *
 * The three states are deliberately distinct so the UI can say something true
 * in each case instead of collapsing everything into a generic error:
 *   - 'found'       the token resolved to a real animal
 *   - 'notFound'    the server answered 404: the token is unknown/rotated
 *   - 'unavailable' network failure, non-2xx, or an unparseable response
 */
export type QrResolutionStatus = 'found' | 'notFound' | 'unavailable';

export interface QrResolutionResult {
  status: QrResolutionStatus;
  /** Convenience view of the resolved animal. Null unless status === 'found'. */
  animal: Animal | null;
  /** The raw AnimalDetailDto, for status history and identifications. */
  detail: AnimalApiDto | null;
  message: string | null;
}

function toAnimalResponse(result: ApiResponse<AnimalApiDto>): ApiResponse<Animal | null> {
  return {
    success: result.success,
    message: result.message,
    data: result.data ? mapApiAnimal(result.data) : null,
  } as ApiResponse<Animal | null>;
}

export const animalWritesApi = {
  create: (body: CreateAnimalBody) =>
    requestWrite<AnimalApiDto>('POST', '/animals', body).then(toAnimalResponse),

  /** Partial update. `status` is rejected by the server with a 400 on purpose. */
  update: (animalId: number, body: Record<string, unknown>) =>
    requestWrite<AnimalApiDto>('PUT', `/animals/${animalId}`, body).then(toAnimalResponse),

  /** The lifecycle operation. There is intentionally no delete endpoint. */
  changeStatus: (animalId: number, status: DbStatus, reason?: string) =>
    requestWrite<AnimalApiDto>('PATCH', `/animals/${animalId}/status`, { status, reason }).then(
      toAnimalResponse
    ),

  /**
   * Uploads image BYTES, not base64.
   * `animals.photo` is varchar(500) and cannot hold an image, so the server
   * stores the bytes in `animal_photos` and this never round-trips base64
   * through a JSON payload.
   */
  async uploadPhoto(
    animalId: number,
    file: File,
    makePrimary = true
  ): Promise<ApiResponse<unknown>> {
    const form = new FormData();
    form.append('file', file, file.name);

    const headers: Record<string, string> = { Accept: 'application/json', ...authHeaders() };

    let response: Response;
    try {
      response = await fetch(
        `${API_BASE_URL}/animals/${animalId}/photo?makePrimary=${makePrimary}`,
        { method: 'POST', headers, body: form }
      );
    } catch (err) {
      throw new ApiUnavailableError(`Photo upload failed: ${(err as Error).message}`);
    }

    if (response.status === 401) {
      clearToken();
      onUnauthorized?.();
      return { success: false, message: 'Your session has expired. Please sign in again.', data: null };
    }

    let payload: any = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    return {
      success: response.ok && payload?.success !== false,
      message:
        payload?.message || (response.ok ? '' : `Upload failed (HTTP ${response.status}).`),
      data: payload?.data,
    } as ApiResponse<unknown>;
  },

  /** Direct URL for rendering a stored photo. Public - no token needed. */
  photoUrl: (animalId: number) => `${API_BASE_URL}/animals/${animalId}/photo`,

  /** Ensures the animal has a server-side QR token and returns it. */
  ensureQrToken: (animalId: number) =>
    requestWrite<{ animalId: number; token: string; lookupUrl: string }>(
      'POST',
      `/animals/${animalId}/qr`
    ),

  /**
   * Rotates (invalidates and re-issues) an animal's QR token.
   * Used when a printed tag is lost or replaced. Requires authentication.
   */
  rotateQrToken: (animalId: number) =>
    requestWrite<{ animalId: number; token: string; lookupUrl: string }>(
      'POST',
      `/animals/${animalId}/qr/rotate`
    ),

  /**
   * Public lookup used by the QR scan flow.
   *
   * Calls the REAL backend endpoint GET /api/animals/qr/{token}, which returns
   * `ApiResponse<AnimalDetailDto>`. The full detail is preserved here so the
   * caller can render real status history and identifications.
   *
   * A 404 is returned as `data: null` (an unknown token is a legitimate answer,
   * not a transport failure). There is deliberately NO mock fallback.
   */
  async resolveQrToken(token: string): Promise<QrResolutionResult> {
    const url = `${API_BASE_URL}/animals/qr/${encodeURIComponent(token)}`;

    let response: Response;
    try {
      response = await fetch(url, { headers: { Accept: 'application/json' } });
    } catch (err) {
      // Network/API unreachable - a real failure state, never a silent fallback.
      return { status: 'unavailable', animal: null, detail: null, message: null };
    }

    let payload: ApiResponse<AnimalApiDto> | null = null;
    try {
      payload = (await response.json()) as ApiResponse<AnimalApiDto>;
    } catch {
      payload = null;
    }

    if (response.status === 404) {
      return { status: 'notFound', animal: null, detail: null, message: null };
    }

    if (!response.ok || !payload?.success || !payload.data) {
      return {
        status: 'unavailable',
        animal: null,
        detail: null,
        message: payload?.message || `The server returned HTTP ${response.status}.`,
      };
    }

    return {
      status: 'found',
      animal: mapApiAnimal(payload.data),
      detail: payload.data,
      message: payload.message || null,
    };
  },
};

export { API_BASE_URL };

// ===========================================================================
// Dashboard + reports (canonical backend)
//
// Field names below are the REAL server names, not the old mock names.
// Every response is wrapped by the backend in { success, message, data }, which
// requestWrite already unwraps into ApiResponse<T>.
// ===========================================================================

/** Raw shape of `GET /api/dashboard?farmId=&date=`. */
export interface DashboardApiDto {
  totalAnimals: number;
  lactating: number;
  dry: number;
  pregnant: number;
  open: number;
  heifers: number;
  calves: number;
  bulls: number;
  sick: number;
  quarantine: number;
  todayMilk: number;
  yesterdayMilk: number;
  averageMilkPerCow: number;
  monthlyMilk: number;
  milkRevenue: number;
  monthlyExpenses: number;
  estimatedProfit: number;
  breedingReminders: number;
  healthAlerts: number;
}

/** Raw shape of `GET /api/reports/farm?farmId=&from=&to=`. */
export interface FarmReportApiDto {
  from: string;
  to: string;
  milkLiters: number;
  saleableLiters: number;
  rejectedLiters: number;
  milkRecords: number;
  income: number;
  expenses: number;
  estimatedProfit: number;
  healthEvents: number;
  breedingEvents: number;
}

/**
 * One row of `GET /api/reports/milk`, which returns a flat array of daily
 * aggregates: { date, total, saleable, animals }.
 */
export interface MilkReportRowApiDto {
  date: string;
  total: number;
  saleable: number;
  animals: number;
}

/**
 * The dashboard endpoint takes an explicit farmId query parameter; the backend
 * does NOT infer the farm from the token on this route. The caller supplies the
 * farm from the authenticated identity (AuthContext.user.farmId).
 */
export const dashboardApi = {
  async get(farmId: number, date?: string): Promise<ApiResponse<DashboardApiDto>> {
    const query = new URLSearchParams({ farmId: String(farmId) });
    if (date) query.set('date', date);
    return requestWrite<DashboardApiDto>('GET', `/dashboard?${query.toString()}`);
  },
};

export const farmReportApi = {
  async get(
    farmId: number,
    from: string,
    to: string
  ): Promise<ApiResponse<FarmReportApiDto>> {
    const query = new URLSearchParams({ farmId: String(farmId), from, to });
    return requestWrite<FarmReportApiDto>('GET', `/reports/farm?${query.toString()}`);
  },
};

export const milkReportApi = {
  async get(
    farmId: number,
    from: string,
    to: string
  ): Promise<ApiResponse<MilkReportRowApiDto[]>> {
    const query = new URLSearchParams({ farmId: String(farmId), from, to });
    return requestWrite<MilkReportRowApiDto[]>('GET', `/reports/milk?${query.toString()}`);
  },
};

// ===========================================================================
// Real Milk client (`milk_records`)
// ===========================================================================

/** The `milk_records` row exactly as the canonical backend serialises it. */
export interface MilkRecordApiDto {
  milkRecordId: number;
  farmId: number;
  animalId: number;
  lactationId?: number | null;
  recordDate: string;
  session: string;
  milkLiters: number;
  fatPercent?: number | null;
  proteinPercent?: number | null;
  snfPercent?: number | null;
  scc?: number | null;
  isRejected: boolean;
  rejectionReason?: string | null;
  notes?: string | null;
  createdBy?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

/** Body for POST /api/milk-records. Never carries sales-only fields. */
export interface MilkRecordCreateApiDto {
  farmId: number;
  animalId: number;
  recordDate: string;
  session: string;
  milkLiters: number;
  fatPercent?: number | null;
  proteinPercent?: number | null;
  snfPercent?: number | null;
  scc?: number | null;
  isRejected: boolean;
  rejectionReason?: string | null;
  notes?: string | null;
}

/**
 * UI session is Title case; the `session` ENUM column stores UPPERCASE.
 * Unknown values become 'Morning' rather than leaking raw DB text into the UI.
 */
export function dbSessionToUiSession(db: string | null | undefined): MilkingSession {
  switch ((db || '').toUpperCase()) {
    case 'EVENING':
      return 'Evening';
    case 'THIRD':
      return 'Third';
    case 'MORNING':
    default:
      return 'Morning';
  }
}

/** Inverse of {@link dbSessionToUiSession}. Sent to the API as UPPERCASE. */
export function uiSessionToDbSession(ui: MilkingSession | string | undefined): string {
  const s = String(ui || '').trim().toUpperCase();
  return s === 'EVENING' || s === 'THIRD' ? s : 'MORNING';
}

/** UI `qualityStatus` is a word; the DB column `is_rejected` is a boolean. */
export function dbRejectedToUiQuality(isRejected: boolean | null | undefined): MilkQualityStatus {
  return isRejected ? 'Rejected' : 'Accepted';
}

export function uiQualityToDbRejected(quality: MilkQualityStatus | undefined): boolean {
  return quality === 'Rejected';
}

/**
 * Maps one API row to the UI record.
 *
 * `pricePerLiter` / `totalAmount` are intentionally LEFT UNSET: there are no
 * such columns in `milk_records` (they belong to `milk_sales`). They are not
 * fabricated and not zero-filled.
 */
export function mapApiMilkRecord(dto: MilkRecordApiDto): MilkRecord {
  return {
    id: String(dto.milkRecordId),
    animalId: String(dto.animalId),
    farmId: String(dto.farmId),
    date: dto.recordDate,
    session: dbSessionToUiSession(dto.session),
    quantityLiters: Number(dto.milkLiters ?? 0),
    fatPercent: dto.fatPercent ?? undefined,
    proteinPercent: dto.proteinPercent ?? undefined,
    snfPercent: dto.snfPercent ?? undefined,
    scc: dto.scc ?? undefined,
    qualityStatus: dbRejectedToUiQuality(dto.isRejected),
    rejectionReason: dto.rejectionReason ?? undefined,
    remarks: dto.notes ?? undefined,
  };
}

// ===========================================================================
// Real Milk list filters
// ===========================================================================
export interface MilkListFilters {
  from?: string;
  to?: string;
  animalId?: string;
  page?: number;
  pageSize?: number;
}

// ===========================================================================
// Real Breeding Events client (`breeding_events`)
// ===========================================================================

/** The five values the live `event_type` ENUM accepts. */
export type BreedingEventType =
  | 'HEAT'
  | 'AI'
  | 'NATURAL_SERVICE'
  | 'OBSERVATION'
  | 'PREGNANCY_CHECK';

/** The `breeding_events` row exactly as the canonical backend serialises it. */
export interface BreedingEventApiDto {
  breedingEventId: number;
  farmId: number;
  animalId: number;
  serviceAnimalId?: number | null;
  eventType: string;
  eventDate: string;
  serviceNumber?: number | null;
  technicianName?: string | null;
  semenBull?: string | null;
  semenBatch?: string | null;
  pregnancyResult?: string | null;
  expectedCalvingDate?: string | null;
  calvingDate?: string | null;
  notes?: string | null;
}

/** Body for POST /api/breeding-events. Only real columns appear here. */
export interface BreedingEventCreateApiDto {
  farmId: number;
  animalId: number;
  eventType: BreedingEventType;
  eventDate: string;
  serviceNumber?: number | null;
  technicianName?: string | null;
  semenBull?: string | null;
  semenBatch?: string | null;
  pregnancyResult?: string | null;
  expectedCalvingDate?: string | null;
  notes?: string | null;
}

/** `event_type` -> the UI's breeding method. Never invents a value. */
export function dbEventTypeToMethod(eventType: string | null | undefined): BreedingRecord['method'] {
  return (eventType || '').toUpperCase() === 'NATURAL_SERVICE' ? 'Natural Service' : 'AI';
}

/** The UI's method -> `event_type`. Only for genuine service submissions. */
export function uiMethodToEventType(method: string | undefined): BreedingEventType {
  const m = (method || '').toUpperCase();
  if (m === 'NATURAL' || m === 'NATURAL SERVICE') return 'NATURAL_SERVICE';
  return 'AI';
}

/** `pregnancy_result` is free text; map only the values we actually understand. */
export function dbPregnancyResultToUi(
  value: string | null | undefined
): BreedingRecord['pregnancyResult'] {
  const v = (value || '').toUpperCase();
  if (v === 'POSITIVE' || v === 'PREGNANT') return 'Positive';
  if (v === 'NEGATIVE' || v === 'NOT_PREGNANT') return 'Negative';
  if (v === 'PENDING') return 'Pending';
  return undefined;
}

/**
 * Maps ONE backend row to the UI record.
 *
 * The backend stores a single `event_date` per row, so exactly one of
 * `heatDate` / `serviceDate` is populated - whichever matches `event_type`.
 * The other stays undefined rather than being faked, so the UI can never show
 * a date that was not persisted.
 *
 * Fields with no genuine backend column (heatIntensity, observedBy, bullId,
 * bullTag, semenCode, pregnancyCheckDate, pregnancyStage, cost) are
 * intentionally left unset.
 */
export function mapApiBreedingEvent(dto: BreedingEventApiDto): BreedingRecord {
  const type = (dto.eventType || '').toUpperCase();
  const isHeat = type === 'HEAT' || type === 'OBSERVATION';
  return {
    id: String(dto.breedingEventId),
    animalId: String(dto.animalId),
    farmId: String(dto.farmId),
    method: dbEventTypeToMethod(dto.eventType),
    inseminatorName: dto.technicianName ?? undefined,
    technician: dto.technicianName ?? undefined,
    semenStrawCode: dto.semenBatch ?? undefined,
    expectedCalvingDate: dto.expectedCalvingDate ?? undefined,
    pregnancyResult: dbPregnancyResultToUi(dto.pregnancyResult),
    serviceNumber: dto.serviceNumber ?? undefined,
    remarks: dto.notes ?? undefined,
    notes: dto.notes ?? undefined,
    ...(isHeat ? { heatDate: dto.eventDate } : { serviceDate: dto.eventDate }),
  } as BreedingRecord;
}

export interface BreedingEventListFilters {
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Milk read/write client.
 *
 * `farmId` is always supplied by the caller from the authenticated identity.
 * There is no hardcoded default and no fallback: a missing farmId throws rather
 * than silently reading farm 1.
 */
export const milkApi = {
  async list(
    farmId: number,
    filters: MilkListFilters = {}
  ): Promise<PaginatedResponse<MilkRecord>> {
    if (farmId == null) throw new Error('milkApi.list requires an authenticated farmId.');

    const params = new URLSearchParams({ farmId: String(farmId) });
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    if (filters.animalId) params.set('search', filters.animalId);
    if (filters.page) params.set('page', String(filters.page));
    if (filters.pageSize) params.set('pageSize', String(filters.pageSize));

    const headers: Record<string, string> = { Accept: 'application/json', ...authHeaders() };

    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}/milk-records?${params.toString()}`, { headers });
    } catch (err) {
      throw new ApiUnavailableError(
        `Milk API unreachable at ${API_BASE_URL}/milk-records: ${(err as Error).message}`
      );
    }

    // 401 is a session problem, never an empty list.
    if (response.status === 401) {
      clearToken();
      onUnauthorized?.();
      throw new AppApiError('Your session has expired. Please sign in again.');
    }

    if (!response.ok) {
      let message = `Failed to fetch milk records (HTTP ${response.status}).`;
      try {
        const body = await response.json();
        if (body?.message) message = body.message;
      } catch {
        /* keep the status-derived message */
      }
      throw new AppApiError(message);
    }

    const payload = await response.json();
    const rows: MilkRecordApiDto[] = Array.isArray(payload?.data) ? payload.data : [];

    return {
      data: rows.map(mapApiMilkRecord),
      page: payload?.page ?? 1,
      pageSize: payload?.pageSize ?? rows.length,
      total: payload?.total ?? rows.length,
      totalPages: payload?.totalPages ?? 1,
    };
  },

  /**
   * Prepared for the real endpoint but NOT executed in Phase E Step 1A.
   * Deliberately omits `pricePerLiter` / `totalAmount`: `milk_records` has no
   * such columns and nothing is invented to stand in for them.
   */
  async create(
    farmId: number,
    input: {
      animalId: string;
      date: string;
      session: MilkingSession | string;
      quantityLiters: number;
      fatPercent?: number;
      proteinPercent?: number;
      snfPercent?: number;
      scc?: number;
      qualityStatus?: MilkQualityStatus;
      rejectionReason?: string;
      remarks?: string;
    }
  ): Promise<ApiResponse<MilkRecord>> {
    if (farmId == null) throw new Error('milkApi.create requires an authenticated farmId.');

    const body: MilkRecordCreateApiDto = {
      farmId,
      animalId: Number(input.animalId),
      recordDate: input.date,
      session: uiSessionToDbSession(input.session),
      milkLiters: Number(input.quantityLiters),
      fatPercent: input.fatPercent ?? null,
      proteinPercent: input.proteinPercent ?? null,
      snfPercent: input.snfPercent ?? null,
      scc: input.scc ?? null,
      isRejected: uiQualityToDbRejected(input.qualityStatus),
      rejectionReason: input.rejectionReason ?? null,
      notes: input.remarks ?? null,
    };

    const result = await requestWrite<MilkRecordApiDto>(
      'POST',
      `/milk-records?farmId=${encodeURIComponent(String(farmId))}`,
      body
    );

    return {
      success: result.success,
      message: result.message,
      data: result.data ? mapApiMilkRecord(result.data) : undefined,
    } as ApiResponse<MilkRecord>;
  },
};

// ===========================================================================
// Real Pregnancy client (`pregnancies`)
// ===========================================================================

/** The `pregnancies` row exactly as the canonical backend serialises it. */
export interface PregnancyApiDto {
  pregnancyId: number;
  farmId: number;
  animalId: number;
  breedingEventId?: number | null;
  conceptionDate?: string | null;
  confirmationDate?: string | null;
  expectedCalvingDate?: string | null;
  actualCalvingDate?: string | null;
  status: string;
  calfCount?: number | null;
  notes?: string | null;
}

/** Body for POST /api/pregnancies. Mirrors the real columns exactly. */
export interface PregnancyCreateApiDto {
  farmId: number;
  animalId: number;
  breedingEventId?: number | null;
  conceptionDate?: string | null;
  confirmationDate?: string | null;
  expectedCalvingDate?: string | null;
  status: PregnancyStatus;
  calfCount?: number | null;
  notes?: string | null;
}

/** Narrow a DB string to the UI union; unknown values fall back to CONFIRMED. */
function dbPregnancyStatus(value: string | null | undefined): PregnancyStatus {
  const v = (value || '').toUpperCase();
  if (v === 'NOT_PREGNANT' || v === 'ABORTED' || v === 'CALVED') return v;
  return 'CONFIRMED';
}

export function mapApiPregnancy(dto: PregnancyApiDto): PregnancyRecord {
  return {
    id: String(dto.pregnancyId),
    farmId: String(dto.farmId),
    animalId: String(dto.animalId),
    breedingEventId: dto.breedingEventId != null ? String(dto.breedingEventId) : undefined,
    conceptionDate: dto.conceptionDate ?? undefined,
    confirmationDate: dto.confirmationDate ?? undefined,
    expectedCalvingDate: dto.expectedCalvingDate ?? undefined,
    actualCalvingDate: dto.actualCalvingDate ?? undefined,
    status: dbPregnancyStatus(dto.status),
    calfCount: dto.calfCount ?? undefined,
    notes: dto.notes ?? undefined,
  };
}

export interface PregnancyListFilters {
  page?: number;
  pageSize?: number;
}

// ===========================================================================
// ===========================================================================
// ===========================================================================
// Real Inventory clients (inventory_items / inventory_transactions)
// ===========================================================================

export interface InventoryItemApiDto {
  inventoryItemId: number; farmId: number; name: string; category?: string | null;
  unit: string; minimumStock?: number | null; description?: string | null; status: string;
}

export interface InventoryTransactionApiDto {
  inventoryTransactionId: number; farmId: number; inventoryItemId: number;
  transactionDate: string; transactionType: string; quantity: number;
  unitCost?: number | null; totalCost?: number | null;
  supplierId?: number | null; supplierName?: string | null;
  referenceNumber?: string | null; notes?: string | null;
}

export function dbInvTxTypeToUi(v: string | null | undefined): string {
  switch ((v || '').toUpperCase()) {
    case 'PURCHASE': return 'Purchase';
    case 'RECEIVED': return 'Received';
    case 'USAGE': return 'Consumption';
    case 'WASTAGE': return 'Wastage';
    case 'ADJUSTMENT': return 'Adjustment';
    case 'RETURN': return 'Return';
    default: return (v || '').toUpperCase();
  }
}

/**
 * Stock derived from the transaction ledger ONLY.
 * `inventory_items` has no stock column; consumption writes to
 * `inventory_transactions` and does NOT update a balance server-side.
 */
export function deriveInventoryStock(transactions: { type: string; quantity: number }[]): number {
  return transactions.reduce((sum, t) => {
    const type = String(t.type).toUpperCase();
    if (type === 'PURCHASE' || type === 'RECEIVED' || type === 'RETURN') return sum + (t.quantity || 0);
    if (type === 'USAGE' || type === 'WASTAGE') return sum - (t.quantity || 0);
    return sum;
  }, 0);
}

export const inventoryApi = {
  list: (farmId: number, pageSize = 500) =>
    moduleList<InventoryItemApiDto, InventoryItem>(farmId, '/inventory-items', (d) => ({
      id: String(d.inventoryItemId),
      farmId: String(d.farmId),
      name: d.name,
      category: d.category ?? 'General',
      unit: d.unit,
      quantity: 0,          // DERIVED from transactions, never stored
      minimumStock: d.minimumStock ?? 0,
      unitPrice: 0,         // no price column on inventory_items
      supplierName: '',     // no supplier FK on inventory_items
      batchNumber: '',      // unsupported
      expiryDate: '',       // unsupported
      warehouse: '',        // no warehouses table
      status: d.status,
      notes: d.description ?? undefined,
    }) as unknown as InventoryItem, pageSize),

  listTransactions: (farmId: number, pageSize = 500) =>
    moduleList<InventoryTransactionApiDto, InventoryTransaction>(farmId, '/inventory-transactions', (d) => ({
      id: String(d.inventoryTransactionId),
      farmId: String(d.farmId),
      itemId: String(d.inventoryItemId),
      itemName: '',         // DERIVED by caller via join
      date: d.transactionDate,
      type: dbInvTxTypeToUi(d.transactionType),
      quantity: d.quantity,
      unitPrice: d.unitCost ?? undefined,
      totalCost: d.totalCost ?? undefined,
      supplierName: d.supplierName ?? '',
      referenceNumber: d.referenceNumber ?? undefined,
      notes: d.notes ?? undefined,
    }) as unknown as InventoryTransaction, pageSize),
};

export const supplierApi = {
  list: (farmId: number, pageSize = 500) =>
    moduleList<{ supplierId: number; farmId: number; name: string; contactPerson?: string | null; phone?: string | null; email?: string | null; supplierType?: string | null; status: string }, Supplier>(
      farmId, '/suppliers',
      (d) => ({
        id: String(d.supplierId), farmId: String(d.farmId), name: d.name,
        contactPerson: d.contactPerson ?? '', phone: d.phone ?? '',
        email: d.email ?? '', supplierType: d.supplierType ?? '',
        status: d.status,
      }) as unknown as Supplier, pageSize),
};

// Real Feed clients (feed_items / feed_transactions / feed_consumptions /
// ration_plans / ration_plan_items)
// ===========================================================================

export type FeedTransactionType = 'PURCHASE' | 'RECEIVED' | 'USAGE' | 'WASTAGE' | 'ADJUSTMENT' | 'RETURN';

export interface FeedItemApiDto {
  feedItemId: number; farmId: number; name: string; category?: string | null;
  unit: string; description?: string | null;
  dryMatterPercent?: number | null; crudeProteinPercent?: number | null;
  meMjPerKg?: number | null; pricePerUnit?: number | null;
  minimumStock?: number | null; status: string;
}

export interface FeedTransactionApiDto {
  feedTransactionId: number; farmId: number; feedItemId: number;
  transactionDate: string; transactionType: string; quantity: number;
  unitCost?: number | null; totalCost?: number | null;
  supplierId?: number | null; supplierName?: string | null;
  referenceNumber?: string | null; notes?: string | null;
}

export interface FeedConsumptionApiDto {
  feedConsumptionId: number; farmId: number; feedItemId: number;
  consumptionDate: string; animalId?: number | null; groupId?: number | null;
  rationPlanId?: number | null; quantity: number; unit?: string | null;
  notes?: string | null; recordedBy?: number | null;
}

export interface RationPlanApiDto {
  rationPlanId: number; farmId: number; name: string; description?: string | null;
  animalId?: number | null; groupId?: number | null;
  startDate?: string | null; endDate?: string | null; status: string;
  notes?: string | null;
}

export interface RationPlanItemApiDto {
  rationPlanItemId: number; rationPlanId: number; feedItemId: number;
  quantityPerDay: number; notes?: string | null;
}

/**
 * UI transaction types -> the live `transaction_type` ENUM. Only these three
 * have a safe mapping; RECEIVED / WASTAGE / RETURN are backend-only and are
 * deliberately NOT invented here.
 */
export function uiFeedTxTypeToDb(v: string | undefined): FeedTransactionType {
  switch (v) {
    case 'Purchase': return 'PURCHASE';
    case 'Consumption': return 'USAGE';
    case 'Adjustment': return 'ADJUSTMENT';
    default: return 'ADJUSTMENT';
  }
}

/** DB -> UI. Unknown/NEW backend types are preserved, never coerced. */
export function dbFeedTxTypeToUi(v: string | null | undefined): FeedInventoryTransaction['type'] | string {
  switch ((v || '').toUpperCase()) {
    case 'PURCHASE': return 'Purchase';
    case 'USAGE': return 'Consumption';
    case 'ADJUSTMENT': return 'Adjustment';
    default: return (v || '').toUpperCase();
  }
}

/**
 * Stock derived from the TRANSACTION LEDGER ONLY.
 *
 * `POST /api/feed-consumption` does NOT create a transaction and does NOT
 * decrement anything (verified: ApplySideEffectsBeforeSave has no feed branch).
 * Consumption is a separate table; combining the two would misreport stock.
 */
export function deriveFeedStock(transactions: FeedInventoryTransaction[]): number {
  return transactions.reduce((sum, t) => {
    const type = String(t.type).toUpperCase();
    if (type === 'PURCHASE' || type === 'RECEIVED' || type === 'RETURN') return sum + (t.quantityKg || 0);
    if (type === 'USAGE' || type === 'WASTAGE') return sum - (t.quantityKg || 0);
    return sum;
  }, 0);
}

/**
 * Feed consumption - SINGLE route name (not plural), verified from the backend
 * module map. Rows are inserted only; NO stock decrement happens server-side.
 */
export const feedConsumptionApi = {
  list: (farmId: number, pageSize = 500) =>
    moduleList<FeedConsumptionApiDto, FeedConsumptionApiDto>(farmId, '/feed-consumption', (d) => d, pageSize),

  create(farmId: number, input: {
    feedItemId: string; consumptionDate: string; quantity: number;
    animalId?: string; groupId?: string; rationPlanId?: string;
    unit?: string; notes?: string;
  }): Promise<ApiResponse<void>> {
    const body = {
      farmId, feedItemId: Number(input.feedItemId),
      consumptionDate: input.consumptionDate,
      // animal_id / group_id / ration_plan_id are all NULLABLE: herd-level and
      // ration-level consumption are legitimate, so none is required.
      animalId: input.animalId ? Number(input.animalId) : null,
      groupId: input.groupId ? Number(input.groupId) : null,
      rationPlanId: input.rationPlanId ? Number(input.rationPlanId) : null,
      quantity: input.quantity,
      unit: input.unit ?? null,
      notes: input.notes ?? null,
    };
    return requestWrite<FeedConsumptionApiDto>('POST', `/feed-consumption?farmId=${encodeURIComponent(String(farmId))}`, body)
      .then((r) => ({ success: r.success, message: r.message, data: undefined } as ApiResponse<void>));
  },
};

export const rationApi = {
  list: (farmId: number, pageSize = 200) =>
    moduleList<RationPlanApiDto, Ration>(farmId, '/rations', (d) => ({
      id: String(d.rationPlanId), farmId: String(d.farmId), name: d.name,
      targetGroup: d.groupId != null ? String(d.groupId) : '',
      description: d.description ?? undefined,
      ingredients: [],                      // children come from /ration-items
      totalKgPerCow: 0,                     // DERIVED
      costPerCowPerDay: 0,                  // DERIVED
      isActive: (d.status || '').toUpperCase() === 'ACTIVE',
    }) as Ration, pageSize),

  create(farmId: number, input: {
    name: string; description?: string; animalId?: string; groupId?: string;
    startDate?: string; endDate?: string; notes?: string;
  }): Promise<ApiResponse<Ration>> {
    const body = {
      farmId, name: input.name,
      description: input.description ?? null,
      animalId: input.animalId ? Number(input.animalId) : null,
      groupId: input.groupId ? Number(input.groupId) : null,
      startDate: input.startDate || null,
      endDate: input.endDate || null,
      notes: input.notes ?? null,
      // varchar(20) NOT NULL with NO authoritative vocabulary. 'ACTIVE' is only
      // a non-null marker - `isActive` is NOT round-tripped as a persisted state.
      status: 'ACTIVE',
    };
    return requestWrite<RationPlanApiDto>('POST', `/rations?farmId=${encodeURIComponent(String(farmId))}`, body)
      .then((r) => ({ success: r.success, message: r.message, data: undefined } as ApiResponse<Ration>));
  },
};

/** Child rows for a ration plan; ownership resolves via the parent plan. */
export const rationItemApi = {
  list: (farmId: number, pageSize = 500) =>
    moduleList<RationPlanItemApiDto, RationIngredient>(farmId, '/ration-items', (d) => ({
      feedItemId: String(d.feedItemId),
      feedItemName: '',                     // DERIVED by the caller
      quantityKg: d.quantityPerDay,
      costPerKg: 0,                         // DERIVED from feed_items.price_per_unit
    }), pageSize),

  create(farmId: number, input: {
    rationPlanId: string; feedItemId: string; quantityPerDay: number; notes?: string;
  }): Promise<ApiResponse<void>> {
    const body = {
      farmId, rationPlanId: Number(input.rationPlanId),
      feedItemId: Number(input.feedItemId),
      quantityPerDay: input.quantityPerDay,
      notes: input.notes ?? null,
    };
    return requestWrite<RationPlanItemApiDto>('POST', `/ration-items?farmId=${encodeURIComponent(String(farmId))}`, body)
      .then((r) => ({ success: r.success, message: r.message, data: undefined } as ApiResponse<void>));
  },
};

function feedItemFromDto(d: FeedItemApiDto): FeedItem {
  return {
    id: String(d.feedItemId), farmId: String(d.farmId), name: d.name,
    category: (d.category ?? 'Fodder') as FeedItem['category'],
    unit: d.unit as FeedItem['unit'],
    unitPrice: d.pricePerUnit ?? 0,
    // `minimum_stock` is a bare quantity column - NOT guaranteed kilograms.
    // The *Kg suffix on the UI field is a UI convention only.
    minStockThresholdKg: d.minimumStock ?? 0,
    dryMatterPercent: d.dryMatterPercent ?? undefined,
    crudeProteinPercent: d.crudeProteinPercent ?? undefined,
    notes: d.description ?? undefined,
    // currentStockKg / supplier* / purchaseDate / expiryDate / warehouse* /
    // batchNumber / minAlertLevel have NO backend column -> left unset.
    currentStockKg: undefined,
  } as FeedItem;
}

/**
 * Feed items. UPDATE is deliberately absent - the generic PUT is blocked by the
 * backend PK-reflection defect (`GetProperty("Id")` vs `FeedItemId`).
 */
export const feedApi = {
  list: (farmId: number, pageSize = 200) =>
    moduleList<FeedItemApiDto, FeedItem>(farmId, '/feeds', feedItemFromDto, pageSize),

  create(farmId: number, input: {
    name: string; category?: string; unit: string;
    dryMatterPercent?: number; crudeProteinPercent?: number;
    unitPrice?: number; minimumStock?: number; notes?: string;
  }): Promise<ApiResponse<FeedItem>> {
    // `status` is varchar(20) NOT NULL with NO authoritative enum; the four UI
    // labels are stock-level, not persisted state. 'ACTIVE' is only a non-null
    // marker, not a claim about a backend vocabulary.
    const body = {
      farmId, name: input.name,
      category: input.category ?? null, unit: input.unit,
      description: input.notes ?? null,
      dryMatterPercent: input.dryMatterPercent ?? null,
      crudeProteinPercent: input.crudeProteinPercent ?? null,
      pricePerUnit: input.unitPrice ?? null,
      minimumStock: input.minimumStock ?? null,
      status: 'ACTIVE',
    };
    return requestWrite<FeedItemApiDto>('POST', `/feeds?farmId=${encodeURIComponent(String(farmId))}`, body)
      .then((r) => ({ success: r.success, message: r.message, data: r.data ? feedItemFromDto(r.data) : undefined } as ApiResponse<FeedItem>));
  },

  remove(farmId: number, id: string): Promise<ApiResponse<void>> {
    return requestWrite<void>('DELETE', `/feeds/${encodeURIComponent(id)}`);
  },
};

export const feedTransactionApi = {
  list: (farmId: number, pageSize = 500) =>
    moduleList<FeedTransactionApiDto, FeedInventoryTransaction>(farmId, '/feed-transactions', (d) => ({
      id: String(d.feedTransactionId), farmId: String(d.farmId),
      feedItemId: String(d.feedItemId),
      feedItemName: '',                    // DERIVED by the caller via a join
      date: d.transactionDate,
      type: dbFeedTxTypeToUi(d.transactionType) as FeedInventoryTransaction['type'],
      quantityKg: d.quantity,
      unitPrice: d.unitCost ?? undefined,
      totalCost: d.totalCost ?? undefined,
      notes: d.notes ?? undefined,
    }) as FeedInventoryTransaction, pageSize),

  create(farmId: number, input: {
    feedItemId: string; date: string; type: string; quantityKg: number;
    unitPrice?: number; totalCost?: number; notes?: string;
  }): Promise<ApiResponse<FeedInventoryTransaction>> {
    const body = {
      farmId, feedItemId: Number(input.feedItemId),
      transactionDate: input.date,
      transactionType: uiFeedTxTypeToDb(input.type),
      quantity: input.quantityKg,
      unitCost: input.unitPrice ?? null,
      totalCost: input.totalCost ?? null,
      notes: input.notes ?? null,
    };
    return requestWrite<FeedTransactionApiDto>('POST', `/feed-transactions?farmId=${encodeURIComponent(String(farmId))}`, body)
      .then((r) => ({ success: r.success, message: r.message, data: undefined } as ApiResponse<FeedInventoryTransaction>));
  },

  remove(farmId: number, id: string): Promise<ApiResponse<void>> {
    return requestWrite<void>('DELETE', `/feed-transactions/${encodeURIComponent(id)}`);
  },
};

// Real Health client (health_records / treatments / vaccinations)

export type HealthRecordType = 'ILLNESS' | 'INJURY' | 'CHECKUP' | 'VACCINATION' | 'DEWORMING' | 'TREATMENT' | 'OTHER';
export type HealthRecordStatus = 'OPEN' | 'IN_TREATMENT' | 'RECOVERED' | 'CLOSED';
export type TreatmentStatus = 'ONGOING' | 'COMPLETED' | 'STOPPED';
export type VaccinationStatus = 'SCHEDULED' | 'COMPLETED' | 'MISSED' | 'CANCELLED';

export interface HealthRecordApiDto {
  healthRecordId: number; farmId: number; animalId: number; diseaseId?: number | null;
  recordDate: string; recordType: string; symptoms?: string | null; diagnosis?: string | null;
  veterinarianName?: string | null; followUpDate?: string | null; status: string;
}

export interface TreatmentApiDto {
  treatmentId: number; farmId: number; animalId: number; healthRecordId?: number | null;
  medicineId?: number | null; treatmentDate: string; startDate?: string | null; endDate?: string | null;
  dosage?: string | null; administrationRoute?: string | null; frequency?: string | null;
  durationDays?: number | null; veterinarianName?: string | null; treatmentStatus: string;
  withdrawalMilkUntil?: string | null; withdrawalMeatUntil?: string | null; notes?: string | null;
}

export interface VaccinationApiDto {
  vaccinationId: number; farmId: number; animalId?: number | null; groupId?: number | null;
  vaccineName: string; vaccinationDate: string; nextDueDate?: string | null;
  batchNumber?: string | null; manufacturer?: string | null;
  veterinarianName?: string | null; status: string; notes?: string | null;
}

export interface DiseaseApiDto {
  diseaseId: number; name: string; code?: string | null; description?: string | null; isActive: boolean;
}

export interface MedicineApiDto {
  medicineId: number; name: string; code?: string | null; manufacturer?: string | null;
  activeIngredient?: string | null; strength?: string | null;
  defaultDosage?: string | null; administrationRoute?: string | null;
  withdrawalMilkHours: number; withdrawalMeatDays: number; isActive: boolean;
}

const HEALTH_TYPES: HealthRecordType[] = ['ILLNESS', 'INJURY', 'CHECKUP', 'VACCINATION', 'DEWORMING', 'TREATMENT', 'OTHER'];

function dbHealthType(v: string | null | undefined): HealthRecordType {
  const u = (v || '').toUpperCase();
  return HEALTH_TYPES.includes(u as HealthRecordType) ? (u as HealthRecordType) : 'OTHER';
}

export function dbHealthStatusToUi(v: string | null | undefined): HealthRecord['status'] {
  switch ((v || '').toUpperCase()) {
    case 'IN_TREATMENT': return 'In Treatment';
    case 'RECOVERED':
    case 'CLOSED': return 'Recovered';
    default: return 'Reported';
  }
}

export function uiHealthType(v: string | undefined): HealthRecordType {
  const m: Record<string, HealthRecordType> = {
    Illness: 'ILLNESS', Injury: 'INJURY', Checkup: 'CHECKUP', Vaccination: 'VACCINATION',
    Deworming: 'DEWORMING', Treatment: 'TREATMENT', Other: 'OTHER',
  };
  return m[v || ''] ?? 'OTHER';
}

export function uiHealthStatusToDb(v: string | undefined): HealthRecordStatus {
  switch (v) {
    case 'In Treatment': case 'Under Treatment': return 'IN_TREATMENT';
    case 'Recovered': case 'Chronic': return 'RECOVERED';
    case 'Closed': return 'CLOSED';
    default: return 'OPEN';
  }
}

/**
 * Fields with NO `health_records` column are intentionally left unset rather
 * than fabricated: problem, severity, temperature, weight, heartRate,
 * respiratoryRate, clinicalFindings, treatmentRequired, attachments, cost.
 */
export function mapApiHealthRecord(d: HealthRecordApiDto): HealthRecord {
  return {
    id: String(d.healthRecordId), farmId: String(d.farmId), animalId: String(d.animalId),
    date: d.recordDate, eventType: dbHealthType(d.recordType),
    // `problem` has no column. Left empty rather than derived from diagnosis.
    problem: '',
    symptoms: d.symptoms ?? undefined, diagnosis: d.diagnosis ?? '',
    followUpDate: d.followUpDate ?? undefined, veterinarian: d.veterinarianName ?? '',
    status: dbHealthStatusToUi(d.status),
  } as unknown as HealthRecord;
}

/** Withdrawal values are DATES in the backend, never day counts. */
export function mapApiTreatment(d: TreatmentApiDto): TreatmentRecord {
  return {
    id: String(d.treatmentId), farmId: String(d.farmId), animalId: String(d.animalId),
    healthRecordId: d.healthRecordId != null ? String(d.healthRecordId) : undefined,
    date: d.treatmentDate, startDate: d.startDate ?? undefined,
    medicineId: d.medicineId != null ? String(d.medicineId) : '',
    dosage: d.dosage ?? '', frequency: d.frequency ?? '',
    route: d.administrationRoute ?? '', durationDays: d.durationDays ?? 0,
    withdrawalMilkUntil: d.withdrawalMilkUntil ?? undefined,
    withdrawalMeatUntil: d.withdrawalMeatUntil ?? undefined,
    diagnosis: '', notes: d.notes ?? undefined,
  } as unknown as TreatmentRecord;
}

export function mapApiVaccination(d: VaccinationApiDto): VaccinationRecord {
  return {
    id: String(d.vaccinationId), farmId: String(d.farmId),
    animalId: d.animalId != null ? String(d.animalId) : undefined,
    groupId: d.groupId != null ? String(d.groupId) : undefined,
    vaccineName: d.vaccineName, date: d.vaccinationDate, nextDueDate: d.nextDueDate ?? '',
    batchNumber: d.batchNumber ?? '', manufacturer: d.manufacturer ?? '',
    veterinarian: d.veterinarianName ?? '',
    status: d.status === 'COMPLETED' ? 'Completed' : 'Scheduled',
  } as unknown as VaccinationRecord;
}

export function mapApiDisease(d: DiseaseApiDto): { id: string; name: string; code: string; description: string } {
  return { id: String(d.diseaseId), name: d.name, code: d.code ?? '', description: d.description ?? '' };
}

export function mapApiMedicine(d: MedicineApiDto): Medicine {
  return {
    id: String(d.medicineId), name: d.name, manufacturer: d.manufacturer ?? '',
    activeIngredient: d.activeIngredient ?? '', strength: d.strength ?? '',
    defaultDosage: d.defaultDosage ?? '', administrationRoute: d.administrationRoute ?? '',
    withdrawalMilkHours: d.withdrawalMilkHours, withdrawalMeatDays: d.withdrawalMeatDays,
  } as unknown as Medicine;
}

/** Shared GET for the generic paged FarmModules list envelope. */
async function moduleList<TDto, TUi>(
  farmId: number, path: string, map: (dto: TDto) => TUi, pageSize = 200
): Promise<PaginatedResponse<TUi>> {
  if (farmId == null) throw new Error(`${path} requires an authenticated farmId.`);
  const params = new URLSearchParams({ farmId: String(farmId), pageSize: String(pageSize) });
  const headers: Record<string, string> = { Accept: 'application/json', ...authHeaders() };
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}?${params.toString()}`, { headers });
  } catch (err) {
    throw new ApiUnavailableError(`API unreachable at ${API_BASE_URL}${path}: ${(err as Error).message}`);
  }
  if (response.status === 401) { clearToken(); onUnauthorized?.(); throw new AppApiError('Your session has expired. Please sign in again.'); }
  if (!response.ok) {
    let message = `Request failed (HTTP ${response.status}).`;
    try { const b = await response.json(); if (b?.message) message = b.message; } catch { /* keep default */ }
    throw new AppApiError(message);
  }
  const payload = await response.json();
  const rows: TDto[] = Array.isArray(payload?.data) ? payload.data : [];
  return {
    data: rows.map(map), page: payload?.page ?? 1, pageSize: payload?.pageSize ?? rows.length,
    total: payload?.total ?? rows.length, totalPages: payload?.totalPages ?? 1
  };
}

/** diseases / medicines are GLOBAL catalogues (Ownership.None) - no farmId. */
export const catalogApi = {
  diseases: () => moduleList<DiseaseApiDto, { id: string; name: string; code: string; description: string }>(1, '/diseases', mapApiDisease),
  medicines: () => moduleList<MedicineApiDto, Medicine>(1, '/medicines', mapApiMedicine),
};

// Real Calving client (`calvings`)
// ===========================================================================

/** The live `calving_type` ENUM values - the only selectable difficulties. */
export type CalvingTypeEnum = 'EASY' | 'NORMAL' | 'HARD' | 'ASSISTED' | 'DYSTOCIA';

/** The `calvings` row exactly as the canonical backend serialises it. */
export interface CalvingApiDto {
  calvingId: number;
  farmId: number;
  animalId: number;
  pregnancyId?: number | null;
  calvingDate: string;
  calvingType: string;
  calfCount: number;
  liveCalfCount?: number | null;
  deadCalfCount?: number | null;
  calvingStatus: string;
  veterinarianName?: string | null;
  colostrumGiven: boolean;
  colostrumTimeHours?: number | null;
  complications?: string | null;
  notes?: string | null;
}

/**
 * Body for POST /api/calvings.
 *
 * ONLY columns that actually exist on `calvings`. Calf-level attributes (sex,
 * birth weight, calf number) are deliberately absent: they belong to the
 * `calves` table, which the backend populates server-side via
 * TryCreateCalfAsync, and there is currently no writable path for them.
 */
export interface CalvingCreateApiDto {
  farmId: number;
  animalId: number;
  pregnancyId?: number | null;
  calvingDate: string;
  calvingType: CalvingTypeEnum;
  calfCount: number;
  calvingStatus: string;
  veterinarianName?: string | null;
  notes?: string | null;
}

export function mapApiCalving(dto: CalvingApiDto): CalvingRecord {
  return {
    id: String(dto.calvingId),
    farmId: String(dto.farmId),
    damId: String(dto.animalId),
    // The dam's tag lives on the `animals` row, not on `calvings`.
    damTag: '',
    // Calf attributes are NOT on the calving row. They are left at their empty
    // defaults rather than invented, because `calves` is a separate table that
    // this read path does not join.
    calfSex: 'Female',
    birthWeightKg: 0,
    pregnancyId: dto.pregnancyId != null ? String(dto.pregnancyId) : undefined,
    calvingDate: dto.calvingDate,
    difficulty: dbCalvingTypeToDifficulty(dto.calvingType),
    calfCount: dto.calfCount,
    liveCalfCount: dto.liveCalfCount ?? undefined,
    calvingStatus: dto.calvingStatus,
    veterinarianName: dto.veterinarianName ?? undefined,
    colostrumTimeHours: dto.colostrumTimeHours ?? undefined,
    complications: dto.complications ?? undefined,
    notes: dto.notes ?? undefined,
  } as CalvingRecord;
}

/** `calving_type` -> the UI's difficulty wording. Unknown values are not invented. */
export function dbCalvingTypeToDifficulty(value: string | null | undefined): CalvingRecord['difficulty'] {
  switch ((value || '').toUpperCase()) {
    case 'EASY':
      return 'Easy Assist';
    case 'HARD':
      return 'Hard Assist';
    case 'ASSISTED':
    case 'DYSTOCIA':
      return 'Caesarean';
    case 'NORMAL':
    default:
      return 'Normal / Unassisted';
  }
}

/** The UI's difficulty -> `calving_type`. 'Surgical' is intentionally absent. */
export function difficultyToCalvingType(value: string): CalvingTypeEnum {
  switch (value) {
    case 'Easy Assist':
      return 'EASY';
    case 'Hard Assist':
      return 'HARD';
    case 'Caesarean':
      return 'DYSTOCIA';
    default:
      return 'NORMAL';
  }
}

export const calvingApi = {
  async list(farmId: number, pageSize = 200): Promise<PaginatedResponse<CalvingRecord>> {
    if (farmId == null) throw new Error('calvingApi.list requires an authenticated farmId.');

    const params = new URLSearchParams({ farmId: String(farmId), pageSize: String(pageSize) });
    const headers: Record<string, string> = { Accept: 'application/json', ...authHeaders() };

    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}/calvings?${params.toString()}`, { headers });
    } catch (err) {
      throw new ApiUnavailableError(
        `Calving API unreachable at ${API_BASE_URL}/calvings: ${(err as Error).message}`
      );
    }

    if (response.status === 401) {
      clearToken();
      onUnauthorized?.();
      throw new AppApiError('Your session has expired. Please sign in again.');
    }

    if (!response.ok) {
      let message = `Failed to fetch calvings (HTTP ${response.status}).`;
      try {
        const body = await response.json();
        if (body?.message) message = body.message;
      } catch {
        /* keep the status-derived message */
      }
      throw new AppApiError(message);
    }

    const payload = await response.json();
    const rows: CalvingApiDto[] = Array.isArray(payload?.data) ? payload.data : [];

    return {
      data: rows.map(mapApiCalving),
      page: payload?.page ?? 1,
      pageSize: payload?.pageSize ?? rows.length,
      total: payload?.total ?? rows.length,
      totalPages: payload?.totalPages ?? 1,
    };
  },

  /**
   * Prepared and type-checked, but NOT executed in this step.
   *
   * The backend creates the `calves` rows itself from `calfCount`; this call
   * never POSTs to `/api/calves` and never fabricates a calf locally.
   */
  async create(
    farmId: number,
    input: {
      damId: string;
      calvingDate: string;
      difficulty: string;
      calfCount: number;
      pregnancyId?: string;
      veterinarianName?: string;
      notes?: string;
    }
  ): Promise<ApiResponse<CalvingRecord>> {
    if (farmId == null) throw new Error('calvingApi.create requires an authenticated farmId.');

    const body: CalvingCreateApiDto = {
      farmId,
      animalId: Number(input.damId),
      pregnancyId: input.pregnancyId != null ? Number(input.pregnancyId) : null,
      calvingDate: input.calvingDate,
      calvingType: difficultyToCalvingType(input.difficulty),
      calfCount: input.calfCount,
      calvingStatus: 'COMPLETED',
      veterinarianName: input.veterinarianName ?? null,
      notes: input.notes ?? null,
    };

    const result = await requestWrite<CalvingApiDto>(
      'POST',
      `/calvings?farmId=${encodeURIComponent(String(farmId))}`,
      body
    );

    return {
      success: result.success,
      message: result.message,
      data: result.data ? mapApiCalving(result.data) : undefined,
    } as ApiResponse<CalvingRecord>;
  },
};

/**
 * Health / treatment / vaccination clients.
 *
 * No mock fallback: a failed request throws so the UI can distinguish
 * "no records" from "unable to load". UPDATE is deliberately absent - the
 * generic PUT is blocked by the backend PK-reflection defect.
 */
export const healthApi = {
  list: (farmId: number, pageSize = 200) =>
    moduleList<HealthRecordApiDto, HealthRecord>(farmId, '/health-records', mapApiHealthRecord, pageSize),

  create(farmId: number, input: {
    animalId: string; recordDate: string; eventType?: string; symptoms?: string;
    diagnosis?: string; veterinarian?: string; followUpDate?: string; status?: string;
  }): Promise<ApiResponse<HealthRecord>> {
    const body = {
      farmId, animalId: Number(input.animalId), recordDate: input.recordDate,
      recordType: uiHealthType(input.eventType),
      symptoms: input.symptoms || null, diagnosis: input.diagnosis || null,
      veterinarianName: input.veterinarian || null,
      followUpDate: input.followUpDate || null,
      status: uiHealthStatusToDb(input.status),
    };
    return requestWrite<HealthRecordApiDto>('POST', `/health-records?farmId=${encodeURIComponent(String(farmId))}`, body)
      .then((r) => ({ success: r.success, message: r.message, data: r.data ? mapApiHealthRecord(r.data) : undefined } as ApiResponse<HealthRecord>));
  },

  remove(farmId: number, id: string): Promise<ApiResponse<void>> {
    return requestWrite<void>('DELETE', `/health-records/${encodeURIComponent(id)}`);
  },
};

export const treatmentApi = {
  list: (farmId: number, pageSize = 200) =>
    moduleList<TreatmentApiDto, TreatmentRecord>(farmId, '/treatments', mapApiTreatment, pageSize),

  create(farmId: number, input: {
    animalId: string; treatmentDate: string; healthRecordId?: string; medicineId?: string;
    dosage?: string; administrationRoute?: string; frequency?: string; durationDays?: number;
    veterinarian?: string; status?: string; notes?: string;
    withdrawalMilkUntil?: string; withdrawalMeatUntil?: string;
  }): Promise<ApiResponse<TreatmentRecord>> {
    const body = {
      farmId, animalId: Number(input.animalId), treatmentDate: input.treatmentDate,
      healthRecordId: input.healthRecordId ? Number(input.healthRecordId) : null,
      medicineId: input.medicineId ? Number(input.medicineId) : null,
      dosage: input.dosage || null, administrationRoute: input.administrationRoute || null,
      frequency: input.frequency || null, durationDays: input.durationDays ?? null,
      veterinarianName: input.veterinarian || null,
      treatmentStatus: input.status === 'COMPLETED' ? 'COMPLETED' : input.status === 'STOPPED' ? 'STOPPED' : 'ONGOING',
      withdrawalMilkUntil: input.withdrawalMilkUntil || null,
      withdrawalMeatUntil: input.withdrawalMeatUntil || null,
      notes: input.notes || null,
    };
    return requestWrite<TreatmentApiDto>('POST', `/treatments?farmId=${encodeURIComponent(String(farmId))}`, body)
      .then((r) => ({ success: r.success, message: r.message, data: r.data ? mapApiTreatment(r.data) : undefined } as ApiResponse<TreatmentRecord>));
  },
};

export const vaccinationApi = {
  list: (farmId: number, pageSize = 200) =>
    moduleList<VaccinationApiDto, VaccinationRecord>(farmId, '/vaccinations', mapApiVaccination, pageSize),

  create(farmId: number, input: {
    vaccineName: string; vaccinationDate: string; nextDueDate?: string; batchNumber?: string;
    manufacturer?: string; veterinarian?: string; animalId?: string; groupId?: string;
    status?: string; notes?: string;
  }): Promise<ApiResponse<VaccinationRecord>> {
    const body = {
      farmId, vaccineName: input.vaccineName, vaccinationDate: input.vaccinationDate,
      nextDueDate: input.nextDueDate || null, batchNumber: input.batchNumber || null,
      manufacturer: input.manufacturer || null, veterinarianName: input.veterinarian || null,
      animalId: input.animalId ? Number(input.animalId) : null,
      groupId: input.groupId ? Number(input.groupId) : null,
      status: input.status === 'COMPLETED' ? 'COMPLETED' : 'SCHEDULED',
      notes: input.notes || null,
    };
    return requestWrite<VaccinationApiDto>('POST', `/vaccinations?farmId=${encodeURIComponent(String(farmId))}`, body)
      .then((r) => ({ success: r.success, message: r.message, data: r.data ? mapApiVaccination(r.data) : undefined } as ApiResponse<VaccinationRecord>));
  },

  remove(farmId: number, id: string): Promise<ApiResponse<void>> {
    return requestWrite<void>('DELETE', `/vaccinations/${encodeURIComponent(id)}`);
  },
};

/**
 * Pregnancy read/write client.
 *
 * `farmId` always comes from the authenticated identity. No mock fallback and
 * no default farm: an error stays an error and is never turned into demo rows.
 */
export const pregnancyApi = {
  async list(
    farmId: number,
    filters: PregnancyListFilters = {}
  ): Promise<PaginatedResponse<PregnancyRecord>> {
    if (farmId == null) throw new Error('pregnancyApi.list requires an authenticated farmId.');

    const params = new URLSearchParams({ farmId: String(farmId) });
    if (filters.page) params.set('page', String(filters.page));
    if (filters.pageSize) params.set('pageSize', String(filters.pageSize));

    const headers: Record<string, string> = { Accept: 'application/json', ...authHeaders() };

    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}/pregnancies?${params.toString()}`, { headers });
    } catch (err) {
      throw new ApiUnavailableError(
        `Pregnancy API unreachable at ${API_BASE_URL}/pregnancies: ${(err as Error).message}`
      );
    }

    if (response.status === 401) {
      clearToken();
      onUnauthorized?.();
      throw new AppApiError('Your session has expired. Please sign in again.');
    }

    if (!response.ok) {
      let message = `Failed to fetch pregnancies (HTTP ${response.status}).`;
      try {
        const body = await response.json();
        if (body?.message) message = body.message;
      } catch {
        /* keep the status-derived message */
      }
      throw new AppApiError(message);
    }

    const payload = await response.json();
    const rows: PregnancyApiDto[] = Array.isArray(payload?.data) ? payload.data : [];

    return {
      data: rows.map(mapApiPregnancy),
      page: payload?.page ?? 1,
      pageSize: payload?.pageSize ?? rows.length,
      total: payload?.total ?? rows.length,
      totalPages: payload?.totalPages ?? 1,
    };
  },

  /**
   * Prepared and type-checked, but NOT executed in this step.
   *
   * `breedingEventId` is the id of the already-persisted PREGNANCY_CHECK event,
   * so the pregnancy row points at the real event that confirmed it.
   */
  async create(
    farmId: number,
    input: {
      animalId: string;
      status: PregnancyStatus;
      breedingEventId?: string;
      conceptionDate?: string;
      confirmationDate?: string;
      expectedCalvingDate?: string;
      calfCount?: number;
      notes?: string;
    }
  ): Promise<ApiResponse<PregnancyRecord>> {
    if (farmId == null) throw new Error('pregnancyApi.create requires an authenticated farmId.');

    const body: PregnancyCreateApiDto = {
      farmId,
      animalId: Number(input.animalId),
      breedingEventId: input.breedingEventId != null ? Number(input.breedingEventId) : null,
      conceptionDate: input.conceptionDate ?? null,
      confirmationDate: input.confirmationDate ?? null,
      expectedCalvingDate: input.expectedCalvingDate ?? null,
      status: input.status,
      calfCount: input.calfCount ?? null,
      notes: input.notes ?? null,
    };

    const result = await requestWrite<PregnancyApiDto>(
      'POST',
      `/pregnancies?farmId=${encodeURIComponent(String(farmId))}`,
      body
    );

    return {
      success: result.success,
      message: result.message,
      data: result.data ? mapApiPregnancy(result.data) : undefined,
    } as ApiResponse<PregnancyRecord>;
  },
};

/**
 * Breeding Events read/write client.
 *
 * `farmId` always comes from the authenticated identity. No default, no
 * fallback, no mock: a failed request throws and is never converted into demo
 * records.
 */
export const breedingApi = {
  async list(
    farmId: number,
    filters: BreedingEventListFilters = {}
  ): Promise<PaginatedResponse<BreedingRecord>> {
    if (farmId == null) throw new Error('breedingApi.list requires an authenticated farmId.');

    const params = new URLSearchParams({ farmId: String(farmId) });
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    if (filters.page) params.set('page', String(filters.page));
    if (filters.pageSize) params.set('pageSize', String(filters.pageSize));

    const headers: Record<string, string> = { Accept: 'application/json', ...authHeaders() };

    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}/breeding-events?${params.toString()}`, { headers });
    } catch (err) {
      throw new ApiUnavailableError(
        `Breeding API unreachable at ${API_BASE_URL}/breeding-events: ${(err as Error).message}`
      );
    }

    if (response.status === 401) {
      clearToken();
      onUnauthorized?.();
      throw new AppApiError('Your session has expired. Please sign in again.');
    }

    if (!response.ok) {
      let message = `Failed to fetch breeding events (HTTP ${response.status}).`;
      try {
        const body = await response.json();
        if (body?.message) message = body.message;
      } catch {
        /* keep the status-derived message */
      }
      throw new AppApiError(message);
    }

    const payload = await response.json();
    const rows: BreedingEventApiDto[] = Array.isArray(payload?.data) ? payload.data : [];

    return {
      data: rows.map(mapApiBreedingEvent),
      page: payload?.page ?? 1,
      pageSize: payload?.pageSize ?? rows.length,
      total: payload?.total ?? rows.length,
      totalPages: payload?.totalPages ?? 1,
    };
  },

  /**
   * Prepared and type-checked, but NOT executed in this step.
   *
   * ONE submission becomes ONE `breeding_events` row: the caller states which
   * real event is being recorded and `eventDate` is that event's own date. A
   * second event is never generated to fill a second UI field.
   */
  async create(
    farmId: number,
    input: {
      animalId: string;
      eventType: BreedingEventType;
      eventDate: string;
      serviceNumber?: number;
      technicianName?: string;
      semenBull?: string;
      semenBatch?: string;
      pregnancyResult?: string;
      expectedCalvingDate?: string;
      notes?: string;
    }
  ): Promise<ApiResponse<BreedingRecord>> {
    if (farmId == null) throw new Error('breedingApi.create requires an authenticated farmId.');
    if (!input.eventDate) throw new Error('breedingApi.create requires a real event date.');

    const body: BreedingEventCreateApiDto = {
      farmId,
      animalId: Number(input.animalId),
      eventType: input.eventType,
      eventDate: input.eventDate,
      serviceNumber: input.serviceNumber ?? null,
      technicianName: input.technicianName ?? null,
      semenBull: input.semenBull ?? null,
      semenBatch: input.semenBatch ?? null,
      pregnancyResult: input.pregnancyResult ?? null,
      expectedCalvingDate: input.expectedCalvingDate ?? null,
      notes: input.notes ?? null,
    };

    const result = await requestWrite<BreedingEventApiDto>(
      'POST',
      `/breeding-events?farmId=${encodeURIComponent(String(farmId))}`,
      body
    );

    return {
      success: result.success,
      message: result.message,
      data: result.data ? mapApiBreedingEvent(result.data) : undefined,
    } as ApiResponse<BreedingRecord>;
  },
};
