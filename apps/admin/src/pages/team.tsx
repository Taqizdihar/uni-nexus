import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PawPrint, Search, ShieldCheck } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { ROLE_LABELS, type RoleCode } from '@uni-nexus/shared';
import { api, type Envelope } from '../lib/api';
import { SafeImage } from '../components/safe-image';
import { displayPetName, handlePetImageError, resolvePetImage } from '../lib/pets';
import { useAuth } from '../lib/auth';
import { PresenceBadge } from '../components/presence-badge';
import { EmptyState, ErrorState, PageHeader, Spinner } from '../components/ui';

type TeamMember = {
  id: string;
  full_name: string;
  username: string;
  bio: string | null;
  presence_status: string;
  photo_url: string | null;
  banner_url: string | null;
  tags: string[];
  pet: { id: string; builtin_key: string | null; code: string | null; name: string | null; display_name: string; subtitle: string | null; description: string | null; image_storage_provider: string | null; image_url: string | null } | null;
  role: { code: string; name: string } | null;
};

function initials(name: string) {
  return name.split(' ').map((part) => part[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

const roleLabel = (role: TeamMember['role']) => (role ? ROLE_LABELS[role.code as RoleCode] ?? role.name : '');

function TeamAvatar({ member, size = 52 }: { member: TeamMember; size?: number }) {
  return <SafeImage source={member.photo_url} alt={member.full_name} className="profile-avatar" fallback={<div className="profile-avatar-initials" style={{ width: size, height: size, fontSize: size * 0.32 }}>{initials(member.full_name)}</div>} />;
}

function TeamList() {
  const { workspace } = useAuth();
  const [search, setSearch] = useState('');
  const query = useQuery({
    queryKey: ['team', workspace!.id, search],
    queryFn: async () =>
      (await api<Envelope<TeamMember[]>>(`/team${search ? `?search=${encodeURIComponent(search)}` : ''}`, { workspace: workspace!.id })).data,
  });
  return (
    <>
      <PageHeader eyebrow="TIM" title="Tim" description="Direktori anggota internal untuk workspace ini." />
      <div className="field" style={{ maxWidth: 320, marginBottom: 18 }}>
        <span className="sr-only">Cari anggota tim</span>
        <div className="nexus-password-field">
          <input placeholder="Cari berdasarkan nama, username, atau email" value={search} onChange={(event) => setSearch(event.target.value)} style={{ paddingLeft: 34 }} />
          <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)' }} />
        </div>
      </div>
      {query.isPending ? (
        <Spinner label="Memuat tim…" />
      ) : query.isError ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : !query.data.length ? (
        <EmptyState title="Tidak ada anggota tim ditemukan" description="Coba kata kunci pencarian lain, atau tunggu akun disetujui di Manajemen Pengguna." />
      ) : (
        <div className="team-grid">
          {query.data.map((member) => (
            <Link className="team-card" to={`/app/team/${member.id}`} key={member.id}>
              <div className="team-card-top">
                <div className="team-card-avatar">
                  <TeamAvatar member={member} />
                  <PresenceBadge status={member.presence_status} size={18} />
                </div>
                <div className="team-card-name">
                  {member.full_name}
                  <small>@{member.username}{member.role ? ` · ${roleLabel(member.role)}` : ''}</small>
                </div>
              </div>
              <p className="team-card-bio">{member.bio || 'Belum ada bio.'}</p>
              {member.pet && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-faint)' }}>
                  <PawPrint size={13} />
                  {displayPetName(member.pet)}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

function TeamDetail() {
  const { workspace } = useAuth();
  const { userId } = useParams();
  const query = useQuery({
    queryKey: ['team-member', workspace!.id, userId],
    queryFn: async () => (await api<Envelope<TeamMember>>(`/team/${userId}`, { workspace: workspace!.id })).data,
  });
  if (query.isPending) return <Spinner label="Memuat anggota…" />;
  if (query.isError) return <ErrorState error={query.error} retry={() => void query.refetch()} />;
  const member = query.data;
  const pet = member.pet;
  return (
    <>
      <Link to="/app/team" className="back-link">← Kembali ke Tim</Link>
      <section className="panel profile-hero">
        <div className="profile-banner"><SafeImage source={member.banner_url} alt="" className="profile-banner-media" /></div>
        <div className="profile-body">
          <div className="profile-avatar-wrap">
            <TeamAvatar member={member} size={108} />
            <span className="profile-presence-anchor"><PresenceBadge status={member.presence_status} size={30} /></span>
          </div>
          <div className="profile-identity">
            <h1>{member.full_name}</h1>
            <div className="profile-username-row">
              <span className="username">@{member.username}</span>
              {member.role && (
                <span className="role-pill">
                  <ShieldCheck size={13} strokeWidth={2.5} />
                  {roleLabel(member.role)}
                </span>
              )}
            </div>
            <p className="profile-bio">{member.bio || 'Belum ada bio.'}</p>
            <div className="tag-row">
              {member.tags.map((tag) => (
                <span className="tag-pill" key={tag}>{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </section>
      <div className="profile-team-pet">
        <div className="profile-pet-card">
          <span className="profile-pet-card-label">Pet Card</span>
          <div className="profile-pet-card-media">
            {pet && resolvePetImage(pet) ? <img src={resolvePetImage(pet)} alt={displayPetName(pet)} onError={(event) => handlePetImageError(event, pet)} /> : <div className="pet-placeholder"><PawPrint size={36} strokeWidth={1.5} /></div>}
          </div>
          <h3>{pet ? displayPetName(pet) : 'Pet belum tersedia'}</h3>
          {pet?.subtitle && <p>{pet.subtitle}</p>}
        </div>
      </div>
    </>
  );
}

export function Team({ mode }: { mode: 'list' | 'detail' }) {
  return mode === 'list' ? <TeamList /> : <TeamDetail />;
}
