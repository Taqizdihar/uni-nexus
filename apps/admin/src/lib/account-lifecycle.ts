import { ApiError } from './api';
export function accountActionMessage(error: unknown): string {
  const messages: Record<string, string> = {
    ACCOUNT_ACTION_FORBIDDEN: 'Anda tidak memiliki wewenang untuk melakukan tindakan ini.',
    ACCOUNT_ALREADY_SUSPENDED: 'Akun sudah Nonaktif. Muat ulang halaman.',
    ACCOUNT_NOT_SUSPENDED: 'Akun belum Nonaktif. Muat ulang halaman.',
    DEACTIVATION_REQUEST_ALREADY_PENDING: 'Permintaan Anda masih menunggu peninjauan.',
    DEACTIVATION_REQUEST_NOT_FOUND: 'Permintaan tidak ditemukan.',
    DEACTIVATION_REQUEST_ALREADY_RESOLVED: 'Permintaan telah diselesaikan. Muat ulang halaman.',
    DEACTIVATION_REQUEST_FORBIDDEN: 'Anda tidak memiliki wewenang untuk meninjau permintaan ini.',
    CONCURRENT_CHANGE: 'Ada perubahan bersamaan. Muat ulang halaman dan coba kembali.',
    LAST_REVIEWER: 'Tetapkan eksekutif Aktif lainnya sebelum menonaktifkan peninjau terakhir.',
    VALIDATION_ERROR: 'Periksa alasan atau catatan yang Anda isi.',
  };
  return error instanceof ApiError
    ? (messages[error.code] ?? error.message)
    : 'Permintaan belum berhasil. Silakan coba kembali.';
}
export const formatAccountDate = (date: string | null) =>
  date
    ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(date),
      )
    : '—';
