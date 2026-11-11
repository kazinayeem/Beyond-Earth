'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useGameStore } from '@/store/gameStore';
import { ScreenState } from '@/types/game';
import {
  Volume2, VolumeX, Bell, Sliders, Compass, Menu, X, LogOut, User, Users, Trophy, Award, Database,
  ShieldCheck, HelpCircle, Search, Home, Rocket, ChevronDown,
} from 'lucide-react';
import { sounds } from '@/lib/sound';
import { useAuth } from '@/components/network/AuthProvider';
import { PlayerAvatar } from '@/components/network/PlayerAvatar';
import { rankProgress } from '@/lib/network/avatars';
import { signOutAction } from '@/app/actions/auth';

interface TopNavProps {
  onOpenTutorial?: () => void;
  onOpenLeaderboard?: () => void;
  onOpenAchievements?: () => void;
  onOpenSettings?: () => void;
}

const GAME_VIEWS: Partial<Record<string, ScreenState>> = { missions: 'missions', data_explorer: 'data_explorer', data_sources: 'data_sources' };

export const TopNavHeader: React.FC<TopNavProps> = ({ onOpenTutorial, onOpenAchievements, onOpenSettings }) => {
  const pathname = usePathname();
  const screen = useGameStore(s => s.screen);
  const setScreen = useGameStore(s => s.setScreen);
  const isMuted = useGameStore(s => s.isMuted);
  const toggleMute = useGameStore(s => s.toggleMute);
  const activeMission = useGameStore(s => s.activeMission);
  const { configured, status, player, unread } = useAuth();
  const [utc, setUtc] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tick = () => setUtc(new Date().toUTCString().slice(17, 25));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [menuOpen]);

  const onGame = pathname === '/';
  // Game views live inside the single-page simulator; elsewhere we deep-link into it.
  const goGame = (view: 'title' | keyof typeof GAME_VIEWS) => (e: React.MouseEvent) => {
    setMobileOpen(false);
    if (onGame) {
      e.preventDefault();
      setScreen(view === 'title' ? 'title' : GAME_VIEWS[view]!);
    }
  };

  const rank = player ? rankProgress(player.xp).rank : null;
  const inFlow = onGame && !['title', 'missions', 'data_explorer', 'data_sources'].includes(screen);

  const links = [
    { href: '/', label: 'Home', Icon: Home, onClick: goGame('title'), active: onGame && screen === 'title' },
    { href: '/?view=missions', label: 'Missions', Icon: Rocket, onClick: goGame('missions'), active: onGame && screen !== 'title' && screen !== 'data_explorer' && screen !== 'data_sources' },
    { href: '/squad', label: 'Squad', Icon: Users, active: pathname.startsWith('/squad') },
    { href: '/players', label: 'Players', Icon: Search, active: pathname.startsWith('/players') },
    { href: '/leaderboard', label: 'Leaderboard', Icon: Trophy, active: pathname.startsWith('/leaderboard') },
  ];

  return (
    <header className="relative z-40 w-full px-3 sm:px-4 py-2 bg-slate-950/70 backdrop-blur-md border-b border-white/10 text-slate-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/" onClick={goGame('title')} className="flex items-center gap-2.5 shrink-0" aria-label="Mission Control home">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center">
              <Compass className="w-5 h-5 text-white" />
            </span>
            <span className="hidden sm:block">
              <span className="block text-xs font-black tracking-widest text-white font-mono">MISSION CONTROL</span>
              <span className="block text-[10px] font-mono text-cyan-400/80">BEYOND EARTH</span>
            </span>
          </Link>
          {inFlow && (
            <span className="hidden xl:flex items-center gap-2 pl-3 border-l border-white/10 text-xs font-mono text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />{activeMission.name}
            </span>
          )}
        </div>

        <nav aria-label="Primary" className="hidden lg:flex items-center gap-0.5">
          {links.map(({ href, label, onClick, active }) => (
            <Link key={label} href={href} onClick={onClick} aria-current={active ? 'page' : undefined}
              className={`px-3 py-1.5 rounded-lg text-[13px] transition-colors ${active ? 'text-white bg-white/[0.08]' : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'}`}>
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="hidden md:inline font-mono text-[11px] text-slate-500 tabular-nums mr-1" aria-label="UTC time">UTC {utc}</span>
          {/* Signed-in players see their real, server-verified balance; visitors see nothing */}
          {status === 'signedIn' && player && (
            <Link href="/profile" className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-500/25 text-xs font-mono hover:border-emerald-400/50 transition-colors"
              title="Your credits and experience (from your player record)">
              <span className="text-emerald-300"><span className="text-slate-500 mr-1">CR</span><span className="tabular-nums">{player.credits.toLocaleString()}</span></span>
              <span className="w-px h-3 bg-white/10" aria-hidden />
              <span className="text-cyan-200"><span className="text-slate-500 mr-1">XP</span><span className="tabular-nums">{player.xp.toLocaleString()}</span></span>
            </Link>
          )}
          <button type="button" onClick={toggleMute} className="hud-btn" aria-label={isMuted ? 'Unmute sound' : 'Mute sound'} aria-pressed={isMuted}>
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-300" /> : <Volume2 className="w-4 h-4" />}
          </button>
          {status === 'signedIn' && (
            <Link href="/notifications" className="hud-btn relative" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}>
              <Bell className="w-4 h-4" />
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-cyan-400 text-slate-950 text-[10px] font-bold flex items-center justify-center">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </Link>
          )}
          {onOpenSettings && (
            <button type="button" onClick={() => { sounds.playClick(); onOpenSettings(); }} className="hud-btn hidden sm:inline-flex" aria-label="Settings">
              <Sliders className="w-4 h-4" />
            </button>
          )}

          {configured && status === 'signedIn' && player ? (
            <div className="relative" ref={menuRef}>
              <button type="button" onClick={() => setMenuOpen(o => !o)} aria-haspopup="menu" aria-expanded={menuOpen}
                className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-white/[0.06] transition-colors" aria-label="Account menu">
                <PlayerAvatar avatar={player.avatar} size={30} />
                <span className="hidden md:block text-left leading-tight">
                  <span className="block text-xs text-white max-w-[110px] truncate">{player.display_name}</span>
                  <span className="block text-[10px] font-mono text-cyan-300/80">{rank}</span>
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 hidden md:block" />
              </button>
              {menuOpen && (
                <div role="menu" className="absolute right-0 mt-2 w-60 rounded-2xl bg-slate-950/95 backdrop-blur-xl border border-white/10 p-1.5 shadow-2xl">
                  <div className="px-3 py-2 border-b border-white/5 mb-1">
                    <div className="text-sm text-white truncate">{player.display_name}</div>
                    <div className="text-[11px] font-mono text-slate-500">{player.player_code} · @{player.username}</div>
                  </div>
                  <MenuLink href="/profile" Icon={User} label="My profile" onClick={() => setMenuOpen(false)} />
                  <MenuLink href="/squad" Icon={Users} label="My squad" onClick={() => setMenuOpen(false)} />
                  <MenuLink href="/notifications" Icon={Bell} label="Notifications" badge={unread} onClick={() => setMenuOpen(false)} />
                  {onOpenAchievements && <MenuButton Icon={Award} label="Achievements (local)" onClick={() => { setMenuOpen(false); onOpenAchievements(); }} />}
                  <MenuLink href="/?view=data_explorer" Icon={Database} label="NASA data" onClick={(e) => { setMenuOpen(false); goGame('data_explorer')(e); }} />
                  <MenuLink href="/?view=data_sources" Icon={ShieldCheck} label="Data sources" onClick={(e) => { setMenuOpen(false); goGame('data_sources')(e); }} />
                  {onOpenTutorial && <MenuButton Icon={HelpCircle} label="How to play" onClick={() => { setMenuOpen(false); onOpenTutorial(); }} />}
                  <form action={signOutAction} className="border-t border-white/5 mt-1 pt-1">
                    <button type="submit" role="menuitem" className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-rose-200 hover:bg-rose-500/10">
                      <LogOut className="w-4 h-4" /> Sign out
                    </button>
                  </form>
                </div>
              )}
            </div>
          ) : configured && status === 'signedOut' ? (
            <div className="hidden sm:flex items-center gap-1.5">
              <Link href="/login" className="px-3 py-1.5 rounded-lg text-[13px] text-slate-300 hover:text-white hover:bg-white/[0.06]">Log in</Link>
              <Link href="/register" className="cta-primary px-3 py-1.5 rounded-lg text-[13px] font-semibold text-slate-950">Create account</Link>
            </div>
          ) : null}

          <button type="button" className="hud-btn lg:hidden" aria-label={mobileOpen ? 'Close menu' : 'Open menu'} aria-expanded={mobileOpen} onClick={() => setMobileOpen(o => !o)}>
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav aria-label="Mobile" className="lg:hidden max-w-7xl mx-auto mt-2 pb-2 grid grid-cols-2 gap-1">
          {links.map(({ href, label, Icon, onClick, active }) => (
            <Link key={label} href={href} onClick={(e) => { onClick?.(e); setMobileOpen(false); }}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm ${active ? 'bg-white/[0.08] text-white' : 'text-slate-300 hover:bg-white/[0.05]'}`}>
              <Icon className="w-4 h-4 text-cyan-300" /> {label}
            </Link>
          ))}
          {status === 'signedIn' ? (
            <Link href="/profile" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-slate-300 hover:bg-white/[0.05]"><User className="w-4 h-4 text-cyan-300" /> My profile</Link>
          ) : configured ? (
            <>
              <Link href="/login" className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-slate-300 hover:bg-white/[0.05]">Log in</Link>
              <Link href="/register" className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-cyan-200 hover:bg-white/[0.05]">Create account</Link>
            </>
          ) : null}
          {onOpenSettings && (
            <button type="button" onClick={() => { setMobileOpen(false); onOpenSettings(); }} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-slate-300 hover:bg-white/[0.05] text-left"><Sliders className="w-4 h-4 text-cyan-300" /> Settings</button>
          )}
        </nav>
      )}
    </header>
  );
};

function MenuLink({ href, Icon, label, onClick, badge }: { href: string; Icon: React.ComponentType<{ className?: string }>; label: string; onClick?: (e: React.MouseEvent) => void; badge?: number }) {
  return (
    <Link href={href} role="menuitem" onClick={onClick} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-white/[0.06]">
      <Icon className="w-4 h-4 text-cyan-300" /> <span className="flex-1">{label}</span>
      {badge ? <span className="text-[10px] font-mono px-1.5 rounded bg-cyan-400/20 text-cyan-100">{badge}</span> : null}
    </Link>
  );
}
function MenuButton({ Icon, label, onClick }: { Icon: React.ComponentType<{ className?: string }>; label: string; onClick: () => void }) {
  return (
    <button type="button" role="menuitem" onClick={onClick} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-white/[0.06] text-left">
      <Icon className="w-4 h-4 text-cyan-300" /> {label}
    </button>
  );
}
