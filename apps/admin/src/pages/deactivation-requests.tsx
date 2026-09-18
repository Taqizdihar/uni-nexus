import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ACCOUNT_STATUS_LABELS,
  DEACTIVATION_REQUEST_LABELS,
  DEACTIVATION_REQUEST_STATUSES,
  ROLE_LABELS,
  type AccountStatus,
  type DeactivationRequestStatus,
  type DeactivationRequestSummary,
  type RoleCode,
} from '@uni-nexus/shared';
import { api, assetUrl, body, type Envelope, type Page } from '../lib/api';
import { accountActionMessage, formatAccountDate } from '../lib/account-lifecycle';
import { AccountActionModal } from '../components/account-action-modal';
import { EmptyState, ErrorState, Spinner, useToast } from '../components/ui';
export type DeactivationRequest = DeactivationRequestSummary & {
  user: {
    id: string;
    full_name: string;
    username: string;
    photo_url: string | null;
    role: RoleCode | null;
    account_status: AccountStatus;
  };
  allowed_actions: { approve: boolean; reject: boolean };
};
export type RequestPage = Page<DeactivationRequest> & { pending_count: number };
function RequestReview({ request }: { request: DeactivationRequest }) {
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const client = useQueryClient(),
    navigate = useNavigate(),
    toast = useToast();
  const mutation = useMutation({
    mutationFn: (note: string) =>
      api<Envelope<{ session_ended?: boolean }>>(
        `/user-management/deactivation-requests/${request.id}/${action}`,
        { method: 'POST', body: body({ note }) },
      ),
    onSuccess: async (result) => {
      if (result.data.session_ended) {
        client.clear();
        client.setQueryData(['session'], null);
        navigate('/account-status', { replace: true, state: { code: 'ACCOUNT_SUSPENDED' } });
        return;
      }
      setAction(null);
      toast(
        action === 'approve'
          ? 'Permintaan disetujui. Akun kini Nonaktif.'
          : 'Permintaan ditolak. Akun tetap Aktif.',
      );
      await Promise.all([
        client.invalidateQueries({ queryKey: ['deactivation-requests'] }),
        client.invalidateQueries({ queryKey: ['user-management'] }),
        client.invalidateQueries({ queryKey: ['user-management-summary'] }),
        client.invalidateQueries({ queryKey: ['profile-deactivation-request'] }),
      ]);
    },
    onError: (error) => {
      toast(accountActionMessage(error), true);
      void client.invalidateQueries({ queryKey: ['deactivation-requests'] });
    },
  });
  return (
    <>
      <div className="button-row">
        {request.allowed_actions.approve && (
          <button
            className="button danger small"
            onClick={() => {
              mutation.reset();
              setAction('approve');
            }}
          >
            Setujui
          </button>
        )}
        {request.allowed_actions.reject && (
          <button
            className="button secondary small"
            onClick={() => {
              mutation.reset();
              setAction('reject');
            }}
          >
            Tolak
          </button>
        )}
        {!request.allowed_actions.approve && !request.allowed_actions.reject && (
          <span className="helper-note">
            {request.request_status === 'PENDING'
              ? 'Tidak ada tindakan yang tersedia untuk Anda.'
              : DEACTIVATION_REQUEST_LABELS[request.request_status]}
          </span>
        )}
      </div>
      {action && (
        <AccountActionModal
          title={action === 'approve' ? 'Setujui Penghapusan Akun' : 'Tolak Permintaan'}
          confirmLabel={action === 'approve' ? 'Setujui dan Nonaktifkan' : 'Tolak Permintaan'}
          busy={mutation.isPending}
          reasonLabel={action === 'reject' ? 'Alasan penolakan' : 'Catatan (opsional)'}
          minimumReason={action === 'reject' ? 1 : 0}
          error={mutation.isError ? accountActionMessage(mutation.error) : undefined}
          onClose={() => setAction(null)}
          onConfirm={(note) => mutation.mutate(note)}
        >
          <p>
            {action === 'approve'
              ? `Menyetujui permintaan ${request.user.full_name} akan membuat akun Nonaktif. Pengguna tidak dapat masuk atau menggunakan UNI-NEXUS. Data, role, histori, dan membership tetap tersimpan.`
              : `Tolak permintaan ${request.user.full_name}? Akun akan tetap Aktif.`}
          </p>
          {action === 'approve' && (request.user.role === 'CTO' || request.user.role === 'CEO') && (
            <p>
              Ini adalah konfirmasi penghapusan akun Anda sendiri. Sesi Anda akan langsung berakhir.
            </p>
          )}
        </AccountActionModal>
      )}
    </>
  );
}
export function DeactivationRequests() {
  const [status, setStatus] = useState<DeactivationRequestStatus | ''>('PENDING');
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['deactivation-requests', status, page],
    queryFn: () =>
      api<RequestPage>(
        `/user-management/deactivation-requests?page=${page}${status ? `&status=${status}` : ''}`,
      ),
    refetchInterval: 30000,
  });
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>Permintaan Penghapusan Akun</h2>
        <select
          aria-label="Status permintaan"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as DeactivationRequestStatus | '');
            setPage(1);
          }}
        >
          <option value="">Semua Permintaan</option>
          {DEACTIVATION_REQUEST_STATUSES.map((value) => (
            <option key={value} value={value}>
              {DEACTIVATION_REQUEST_LABELS[value]}
            </option>
          ))}
        </select>
      </div>
      <p className="helper-note">
        Permintaan yang menunggu peninjauan tidak mengubah status akun Aktif.
      </p>
      {query.isPending ? (
        <Spinner label="Memuat permintaan…" />
      ) : query.isError ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : !query.data.data.length ? (
        <EmptyState
          title="Tidak ada permintaan"
          description="Belum ada permintaan penghapusan akun pada status ini."
        />
      ) : (
        <>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Pengguna</th>
                  <th>Jabatan</th>
                  <th>Diajukan</th>
                  <th>Alasan</th>
                  <th>Status Akun</th>
                  <th>Permintaan</th>
                  <th>Peninjauan</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {query.data.data.map((request) => (
                  <tr key={request.id}>
                    <td>
                      <div className="account-cell">
                        <span className="avatar lg">
                          {request.user.photo_url ? (
                            <img src={assetUrl(request.user.photo_url)} alt="" />
                          ) : (
                            request.user.full_name
                              .split(' ')
                              .map((part) => part[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase()
                          )}
                        </span>
                        <div>
                          <strong>{request.user.full_name}</strong>
                          <small>@{request.user.username}</small>
                        </div>
                      </div>
                    </td>
                    <td>{request.user.role ? ROLE_LABELS[request.user.role] : '—'}</td>
                    <td>{formatAccountDate(request.requested_at)}</td>
                    <td>{request.request_reason || '—'}</td>
                    <td>{ACCOUNT_STATUS_LABELS[request.user.account_status]}</td>
                    <td>
                      <span className="badge amber">
                        {DEACTIVATION_REQUEST_LABELS[request.request_status]}
                      </span>
                    </td>
                    <td>
                      {request.reviewed_at ? formatAccountDate(request.reviewed_at) : '—'}
                      {request.review_note && <p>{request.review_note}</p>}
                    </td>
                    <td>
                      <RequestReview request={request} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="button-row" style={{ marginTop: 16 }}>
            <button
              className="button secondary small"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Sebelumnya
            </button>
            <span>
              {page} / {query.data.meta.totalPages}
            </span>
            <button
              className="button secondary small"
              disabled={page >= query.data.meta.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Berikutnya
            </button>
          </div>
        </>
      )}
    </section>
  );
}
