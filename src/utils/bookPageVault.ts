export interface UploadedBookPage {
  id: string;
  chapterId: string;
  pageNumberLabel: string;
  fileName: string;
  mimeType: string;
  dataUrl: string;
  uploadedAt: number;
}

const DB_NAME = 'medhavi_book_pages_v1';
const STORE_NAME = 'book_pages';
const LS_FALLBACK_KEY = 'medhavi_uploaded_book_pages_fallback_v1';

function openVaultDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('by_chapter', 'chapterId', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open book page store'));
  });
}

function readLocalFallback(): UploadedBookPage[] {
  try {
    const raw = localStorage.getItem(LS_FALLBACK_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalFallback(items: UploadedBookPage[]): void {
  try {
    localStorage.setItem(LS_FALLBACK_KEY, JSON.stringify(items.slice(0, 12)));
  } catch {
    // Ignore quota limits in fallback storage
  }
}

export async function listUploadedBookPages(chapterId?: string): Promise<UploadedBookPage[]> {
  try {
    const db = await openVaultDb();
    return await new Promise<UploadedBookPage[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = chapterId
        ? store.index('by_chapter').getAll(IDBKeyRange.only(chapterId))
        : store.getAll();
      req.onsuccess = () => {
        const rows = Array.isArray(req.result) ? (req.result as UploadedBookPage[]) : [];
        resolve(rows.sort((a, b) => b.uploadedAt - a.uploadedAt));
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    const fallback = readLocalFallback();
    const filtered = chapterId ? fallback.filter((p) => p.chapterId === chapterId) : fallback;
    return filtered.sort((a, b) => b.uploadedAt - a.uploadedAt);
  }
}

export async function saveUploadedBookPage(page: UploadedBookPage): Promise<void> {
  try {
    const db = await openVaultDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(page);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    const existing = readLocalFallback().filter((item) => item.id !== page.id);
    writeLocalFallback([page, ...existing]);
  }
}

export async function deleteUploadedBookPage(id: string): Promise<void> {
  try {
    const db = await openVaultDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    const remaining = readLocalFallback().filter((item) => item.id !== id);
    writeLocalFallback(remaining);
  }
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Could not read file as Data URL'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('File read error'));
    reader.readAsDataURL(file);
  });
}
