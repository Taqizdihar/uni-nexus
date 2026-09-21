import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode, type SyntheticEvent } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, IdCard, Mail, PawPrint, Phone, Search, ShieldCheck, UserRound, X } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { ROLE_LABELS, type RoleCode } from '@uni-nexus/shared';
import { api, type Envelope } from '../lib/api';
import { useAuth } from '../lib/auth';
import { displayPetName, type PetImageData } from '../lib/pets';
import { PetImage } from '../components/pet-image';
import { PresenceBadge } from '../components/presence-badge';
import { SafeImage } from '../components/safe-image';
import { EmptyState, ErrorState, PageHeader, Spinner } from '../components/ui';

type TeamPet = PetImageData & { id: string; display_name: string; subtitle: string | null; description: string | null };
type TeamMember = { id: string; full_name: string; username: string; email: string; phone: string | null; bio: string | null; presence_status: string; photo_url: string | null; banner_url: string | null; tags: string[]; pet: TeamPet | null; role: { code: string; name: string } | null };

const roleLabel = (role: TeamMember['role']) => role ? ROLE_LABELS[role.code as RoleCode] ?? role.name : '—';
function initials(name: string) { return name.split(' ').map((part) => part[0]).filter(Boolean).slice(0, 2).join('').toUpperCase(); }

/** Keeps an item near the active card, wrapping indices without duplicated records. */
export function carouselOffset(index: number, activeIndex: number, count: number) {
  if (count < 2) return 0;
  let offset = (index - activeIndex) % count;
  if (offset < 0) offset += count;
  if (offset > count / 2) offset -= count;
  return offset;
}
export function nextCarouselIndex(activeIndex: number, count: number, direction: -1 | 1) {
  return count < 2 ? 0 : (activeIndex + direction + count) % count;
}

function MemberAvatar({ member, className = 'team-avatar', size }: { member: TeamMember; className?: string; size?: number }) {
  const style = size ? { width: size, height: size, fontSize: Math.round(size * 0.32) } : undefined;
  return <SafeImage source={member.photo_url} alt={member.full_name} className={className} fallback={<div className={`${className}-initials`} style={style}>{initials(member.full_name)}</div>} />;
}
function ReadOnlyInfo({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return <div className="team-profile-info-field"><span>{label}</span><div className="profile-info-row">{icon}{children}</div></div>;
}

function TeamProfileModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const { workspace } = useAuth();
  const closeRef = useRef<HTMLButtonElement>(null);
  const query = useQuery({ queryKey: ['team-member', workspace!.id, userId], queryFn: async () => (await api<Envelope<TeamMember>>(`/team/${userId}`, { workspace: workspace!.id })).data });
  useEffect(() => {
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => { document.body.style.overflow = priorOverflow; };
  }, []);
  const trapFocus = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
    if (event.key !== 'Tab') return;
    const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'));
    if (!focusable.length) return;
    const first = focusable[0]!; const last = focusable[focusable.length - 1]!;
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  return createPortal(<div className="team-profile-backdrop" onMouseDown={onClose}>
    <section className="team-profile-modal" role="dialog" aria-modal="true" aria-labelledby="team-profile-title" onMouseDown={(event) => event.stopPropagation()} onKeyDown={trapFocus}>
      <button ref={closeRef} className="icon-button team-profile-close" aria-label="Tutup Profil" onClick={onClose}><X size={20} /></button>
      {query.isPending ? <Spinner label="Memuat profil anggota…" /> : query.isError ? <ErrorState error={query.error} retry={() => void query.refetch()} /> : <TeamProfileContent member={query.data} />}
    </section>
  </div>, document.body);
}

function TeamProfileContent({ member }: { member: TeamMember }) {
  const petName = member.pet ? displayPetName(member.pet) : 'Pet belum tersedia';
  return <>
    <section className="team-profile-hero">
      <div className="profile-banner"><SafeImage source={member.banner_url} alt="" className="profile-banner-media" /></div>
      <div className="profile-body">
        <div className="profile-avatar-wrap"><MemberAvatar member={member} className="profile-avatar" size={132} /><span className="profile-presence-anchor"><PresenceBadge status={member.presence_status} size={30} /></span></div>
        <div className="profile-identity"><h2 id="team-profile-title">{member.full_name}</h2><div className="profile-username-row"><span className="username">@{member.username}</span>{member.role && <span className="role-pill"><ShieldCheck size={13} strokeWidth={2.5} />{roleLabel(member.role)}</span>}</div><p className="profile-bio">{member.bio || 'Belum ada bio.'}</p>{member.tags.length > 0 && <div className="tag-row">{member.tags.map((tag) => <span className="tag-pill" key={tag}>{tag}</span>)}</div>}</div>
      </div>
    </section>
    <section className="team-profile-main panel"><div className="profile-info-grid">
      <div className="profile-pet-card"><span className="profile-pet-card-label">Pet</span><div className="profile-pet-card-media">{member.pet ? <PetImage pet={member.pet} alt={petName} /> : <div className="pet-placeholder"><PawPrint size={36} strokeWidth={1.5} /></div>}</div><h3>{petName}</h3>{member.pet?.subtitle && <p>{member.pet.subtitle}</p>}</div>
      <div className="team-profile-info-column">
        <ReadOnlyInfo label="Nama Lengkap" icon={<IdCard size={16} aria-hidden="true" />}><span>{member.full_name}</span></ReadOnlyInfo>
        <ReadOnlyInfo label="Username" icon={<UserRound size={16} aria-hidden="true" />}><span>@{member.username}</span></ReadOnlyInfo>
        <ReadOnlyInfo label="Email" icon={<Mail size={16} aria-hidden="true" />}><span>{member.email}</span></ReadOnlyInfo>
        <ReadOnlyInfo label="Nomor Telepon" icon={<Phone size={16} aria-hidden="true" />}><span>{member.phone || 'Belum diisi.'}</span></ReadOnlyInfo>
        <div className="team-profile-info-field"><span>Bio</span><div className="profile-info-bio"><p>{member.bio || 'Belum ada bio.'}</p></div></div>
      </div>
    </div></section>
  </>;
}

function TeamCarousel({ members, onOpen }: { members: TeamMember[]; onOpen: (id: string, event: SyntheticEvent<HTMLElement>) => void }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const startX = useRef<number | null>(null);
  useEffect(() => { setActiveIndex((value) => members.length ? value % members.length : 0); }, [members.length]);
  const move = (direction: -1 | 1) => setActiveIndex((value) => nextCarouselIndex(value, members.length, direction));
  if (!members.length) return <EmptyState title="Tidak ada anggota tim ditemukan" description="Belum ada anggota aktif pada workspace ini." />;
  return <section className="team-carousel-panel" aria-label="Carousel anggota tim" tabIndex={0} onKeyDown={(event) => { if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); } if (event.key === 'ArrowRight') { event.preventDefault(); move(1); } }} onPointerDown={(event: PointerEvent<HTMLElement>) => { startX.current = event.clientX; }} onPointerUp={(event: PointerEvent<HTMLElement>) => { if (startX.current === null) return; const distance = event.clientX - startX.current; startX.current = null; if (Math.abs(distance) > 42) move(distance > 0 ? -1 : 1); }}>
    <div className="team-carousel-stage">{members.map((member, index) => {
      const offset = carouselOffset(index, activeIndex, members.length); const active = offset === 0; const adjacent = Math.abs(offset) === 1;
      const style = { transform: `translateX(calc(${offset} * clamp(104px, 20vw, 230px))) scale(${active ? 1.08 : adjacent ? 0.87 : 0.62})`, opacity: active ? 1 : adjacent ? 0.68 : 0, zIndex: active ? 2 : adjacent ? 1 : 0, pointerEvents: active || adjacent ? 'auto' : 'none' } as CSSProperties;
      return <button type="button" key={member.id} className={`team-carousel-card${active ? ' active' : ''}`} style={style} onClick={(event) => onOpen(member.id, event)} aria-label={`Lihat profil ${member.full_name}`}><div className="team-carousel-avatar"><MemberAvatar member={member} /><PresenceBadge status={member.presence_status} size={18} /></div><strong>{member.full_name}</strong><span>@{member.username}</span><small>{roleLabel(member.role)}</small>{member.pet && <em><PawPrint size={12} />{displayPetName(member.pet)}</em>}</button>;
    })}</div>
    {members.length > 1 && <div className="team-carousel-controls"><button type="button" className="icon-button" onClick={() => move(-1)} aria-label="Anggota sebelumnya"><ChevronLeft size={21} /></button><button type="button" className="icon-button" onClick={() => move(1)} aria-label="Anggota berikutnya"><ChevronRight size={21} /></button></div>}
  </section>;
}

export function Team() {
  const { workspace } = useAuth(); const { userId } = useParams(); const navigate = useNavigate(); const openerRef = useRef<HTMLElement | null>(null); const [search, setSearch] = useState('');
  const query = useQuery({ queryKey: ['team', workspace!.id], queryFn: async () => (await api<Envelope<TeamMember[]>>('/team', { workspace: workspace!.id })).data });
  const members = query.data ?? [];
  const filteredMembers = useMemo(() => { const term = search.trim().toLocaleLowerCase('id-ID'); return term ? members.filter((member) => [member.full_name, member.username, member.email, roleLabel(member.role)].some((value) => value.toLocaleLowerCase('id-ID').includes(term))) : members; }, [members, search]);
  const openMember = (id: string, event: SyntheticEvent<HTMLElement>) => { openerRef.current = event.currentTarget; navigate(`/app/team/${id}`); };
  const closeMember = () => { navigate('/app/team'); window.setTimeout(() => openerRef.current?.focus(), 0); };
  return <><PageHeader eyebrow="TIM" title="Tim" description="Direktori anggota internal untuk workspace ini." actions={!query.isPending && !query.isError ? <span className="team-member-count">{members.length} Anggota</span> : undefined} />
    {query.isPending ? <Spinner label="Memuat tim…" /> : query.isError ? <ErrorState error={query.error} retry={() => void query.refetch()} /> : <><TeamCarousel members={members} onOpen={openMember} /><section className="panel team-directory"><div className="team-directory-head"><div><h2>Daftar Anggota</h2><p>Temukan dan lihat profil anggota di workspace ini.</p></div><label className="team-search"><span className="sr-only">Cari anggota tim</span><Search size={16} aria-hidden="true" /><input placeholder="Cari nama, username, email, atau jabatan..." value={search} onChange={(event) => setSearch(event.target.value)} /></label></div><div className="team-table-scroll"><table className="team-table"><thead><tr><th>No.</th><th>Anggota</th><th>Email</th><th>Jabatan</th><th>Kehadiran</th><th>Pet</th></tr></thead><tbody>{filteredMembers.length ? filteredMembers.map((member, index) => <tr key={member.id} tabIndex={0} onClick={(event) => openMember(member.id, event)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openMember(member.id, event); } }} aria-label={`Lihat profil ${member.full_name}`}><td>{index + 1}</td><td><div className="team-table-member"><MemberAvatar member={member} size={40} /><span><strong>{member.full_name}</strong><small>@{member.username}</small></span></div></td><td>{member.email}</td><td>{roleLabel(member.role)}</td><td><PresenceBadge status={member.presence_status} size={24} /></td><td>{member.pet ? displayPetName(member.pet) : '—'}</td></tr>) : <tr><td colSpan={6}><EmptyState title="Tidak ada anggota tim ditemukan" description="Coba kata kunci pencarian lain." /></td></tr>}</tbody></table></div></section></>}
    {userId && <TeamProfileModal userId={userId} onClose={closeMember} />}</>;
}
