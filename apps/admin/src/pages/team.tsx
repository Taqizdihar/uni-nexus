import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PawPrint, Search } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { api, assetUrl, type Envelope } from '../lib/api';
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
  pet: { id: string; name: string; subtitle: string | null; image_url: string | null } | null;
  role: { code: string; name: string } | null;
};

function initials(name: string) {
  return name.split(' ').map((part) => part[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

function TeamAvatar({ member, size = 52 }: { member: TeamMember; size?: number }) {
  return member.photo_url ? (
    <img className="profile-avatar" style={{ width: size, height: size }} src={assetUrl(member.photo_url)} alt={member.full_name} />
  ) : (
    <div className="profile-avatar-initials" style={{ width: size, height: size, fontSize: size * 0.32 }}>
      {initials(member.full_name)}
    </div>
  );
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
      <PageHeader eyebrow="TIM" title="Team" description="Internal member directory for this workspace." />
      <div className="field" style={{ maxWidth: 320, marginBottom: 18 }}>
        <span className="sr-only">Search team</span>
        <div className="nexus-password-field">
          <input placeholder="Search by name, username, or email" value={search} onChange={(event) => setSearch(event.target.value)} style={{ paddingLeft: 34 }} />
          <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)' }} />
        </div>
      </div>
      {query.isPending ? (
        <Spinner label="Loading team…" />
      ) : query.isError ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : !query.data.length ? (
        <EmptyState title="No team members found" description="Try a different search, or wait for accounts to be approved in User Management." />
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
                  <small>@{member.username}{member.role ? ` · ${member.role.name}` : ''}</small>
                </div>
              </div>
              <p className="team-card-bio">{member.bio || 'No bio yet.'}</p>
              {member.pet && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-faint)' }}>
                  <PawPrint size={13} />
                  {member.pet.name}
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
  if (query.isPending) return <Spinner label="Loading member…" />;
  if (query.isError) return <ErrorState error={query.error} retry={() => void query.refetch()} />;
  const member = query.data;
  return (
    <>
      <Link to="/app/team" className="back-link">← Back to Team</Link>
      <section className="panel profile-hero">
        <div className="profile-banner" style={member.banner_url ? { backgroundImage: `url(${assetUrl(member.banner_url)})` } : undefined} />
        <div className="profile-body">
          <div className="profile-avatar-wrap">
            <TeamAvatar member={member} size={108} />
            <span className="profile-presence-anchor"><PresenceBadge status={member.presence_status} size={30} /></span>
          </div>
          <div className="profile-identity">
            <h1>{member.full_name}</h1>
            <div className="profile-username-row">
              <span className="username">@{member.username}</span>
              {member.role && <span className="role-pill">{member.role.name}</span>}
            </div>
            <p className="profile-bio">{member.bio || 'No bio yet.'}</p>
            <div className="tag-row">
              {member.tags.map((tag) => (
                <span className="tag-pill" key={tag}>{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </section>
      <div className="profile-bottom-grid" style={{ gridTemplateColumns: '260px 1fr' }}>
        <div className="pet-card">
          <span className="pet-card-label">Pet Card</span>
          {member.pet ? <img src={member.pet.image_url ?? undefined} alt={member.pet.name} /> : <div className="pet-placeholder"><PawPrint size={34} strokeWidth={1.5} /></div>}
          <h3>{member.pet?.name ?? 'No pet selected'}</h3>
          <p>{member.pet?.subtitle ?? ''}</p>
        </div>
        <div />
      </div>
    </>
  );
}

export function Team({ mode }: { mode: 'list' | 'detail' }) {
  return mode === 'list' ? <TeamList /> : <TeamDetail />;
}
