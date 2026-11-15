'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/network/AuthProvider';
import { MISSIONS } from '@/data/missions';
import type { ScreenState } from '@/types/game';
import { useGameStore } from '@/store/gameStore';
import { StarfieldCanvas } from '@/components/canvas/StarfieldCanvas';
import { GalaxyBackground } from '@/components/canvas/GalaxyBackground';
import { PlanetBackdrop } from '@/components/canvas/PlanetBackdrop';
import { TopNavHeader } from '@/components/ui/TopNavHeader';
import { TitleScreen } from '@/components/screens/TitleScreen';
import { MissionSelectScreen } from '@/components/screens/MissionSelectScreen';
import { MissionBriefingScreen } from '@/components/screens/MissionBriefingScreen';
import { SpacecraftBuilderScreen } from '@/components/screens/SpacecraftBuilderScreen';
import { LauncherTrajectoryScreen } from '@/components/screens/LauncherTrajectoryScreen';
import { LaunchSequenceScreen } from '@/components/screens/LaunchSequenceScreen';
import { MissionControlScreen } from '@/components/screens/MissionControlScreen';
import { DebriefScreen } from '@/components/screens/DebriefScreen';
import { DataExplorerScreen } from '@/components/screens/DataExplorerScreen';
import { DataSourcesScreen } from '@/components/screens/DataSourcesScreen';
import { TutorialModal } from '@/components/modals/TutorialModal';
import { LeaderboardModal } from '@/components/modals/LeaderboardModal';
import { AchievementsModal } from '@/components/modals/AchievementsModal';
import { SettingsModal } from '@/components/modals/SettingsModal';
import { SquadHud } from '@/components/squadgame/SquadHud';
import { useSquadSync } from '@/lib/squad/useSquadSync';
import type { SquadCtx, SquadGameRow } from '@/lib/squad/types';

export function GameShell({ squad }: { squad?: { ctx: SquadCtx; row: SquadGameRow } }) {
  const screen = useGameStore(s => s.screen);
  const reducedMotion = useGameStore(s => s.reducedMotion);
  const activeTarget = useGameStore(s => s.activeMission.target);

  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isAchievementsOpen, setIsAchievementsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const router = useRouter();
  const { configured, status } = useAuth();

  // Deep links from multiplayer pages: /?view=missions | briefing&mission=mission-03&gm=<squad mission id>
  useEffect(() => {
    if (squad) return;
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    const missionId = params.get('mission');
    const gm = params.get('gm');
    const store = useGameStore.getState();
    const mission = MISSIONS.find(m => m.id === missionId);
    if (mission) store.setActiveMission(mission);
    store.setGroupMission(gm && mission ? gm : null);
    const allowed: ScreenState[] = ['missions', 'briefing', 'data_explorer', 'data_sources'];
    if (view && (allowed as string[]).includes(view)) store.setScreen(view as ScreenState);
    if (params.toString()) window.history.replaceState(null, '', '/');
  }, [squad]);

  // Anyone can browse missions and briefings; starting one (spacecraft build onward) needs an account.
  // The database independently refuses runs from unauthenticated callers.
  const startedMission = ['builder', 'launcher_trajectory', 'launch', 'mission_control', 'debrief'].includes(screen);
  useEffect(() => {
    if (!squad && configured && status === 'signedOut' && startedMission) {
      const missionId = useGameStore.getState().activeMission.id;
      useGameStore.getState().setScreen('briefing');
      router.push(`/join?next=${encodeURIComponent(`/?view=briefing&mission=${missionId}`)}&reason=mission`);
    }
  }, [configured, status, startedMission, router, squad]);

  // Squad room: hydrate the store from the server row, keep it in sync, and leave cleanly.
  const enterSquad = useGameStore(s => s.enterSquad);
  const leaveSquad = useGameStore(s => s.leaveSquad);
  useEffect(() => {
    if (!squad) return;
    enterSquad(squad.ctx, squad.row);
    return () => leaveSquad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [squad?.ctx.gameId]);
  useSquadSync(squad?.ctx.gameId ?? null);

  const renderActiveScreen = () => {
    switch (screen) {
      case 'title':
        return (
          <TitleScreen
            onOpenTutorial={() => setIsTutorialOpen(true)}
            onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        );
      case 'missions':
        return <MissionSelectScreen />;
      case 'briefing':
        return <MissionBriefingScreen />;
      case 'builder':
        return <SpacecraftBuilderScreen />;
      case 'launcher_trajectory':
        return <LauncherTrajectoryScreen />;
      case 'launch':
        return <LaunchSequenceScreen />;
      case 'mission_control':
        return (
          <MissionControlScreen
            onOpenTutorial={() => setIsTutorialOpen(true)}
          />
        );
      case 'debrief':
        return (
          <DebriefScreen
            onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
          />
        );
      case 'data_explorer':
        return <DataExplorerScreen />;
      case 'data_sources':
        return <DataSourcesScreen />;
      default:
        return (
          <TitleScreen
            onOpenTutorial={() => setIsTutorialOpen(true)}
            onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        );
    }
  };

  return (
    <main className="relative h-[100dvh] max-h-[100dvh] flex flex-col overflow-hidden bg-[#02040b] text-slate-100">
      {/* Deep-space environment: animated galaxy on the home page, light starfield elsewhere */}
      {screen === 'title' ? (
        <GalaxyBackground reducedMotion={reducedMotion} />
      ) : screen === 'launch' || screen === 'mission_control' ? (
        <StarfieldCanvas density={120} speed={0.15} />
      ) : (
        // Mission screens show the selected destination: Moon, Mars, asteroid or Earth
        <PlanetBackdrop target={activeTarget} reducedMotion={reducedMotion} />
      )}

      {/* Persistent Flight Director Navigation Bar */}
      <TopNavHeader
        onOpenTutorial={() => setIsTutorialOpen(true)}
        onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
        onOpenAchievements={() => setIsAchievementsOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {squad && <SquadHud />}

      {/* Main Screen Content */}
      <div
        className={`flex-1 flex flex-col min-h-0 ${
          screen === 'launch' || screen === 'mission_control'
            ? 'overflow-hidden'
            : 'overflow-y-auto'
        }`}
      >
        {renderActiveScreen()}
      </div>

      {/* Persistent Modals */}
      <TutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
      />
      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
      />
      <AchievementsModal
        isOpen={isAchievementsOpen}
        onClose={() => setIsAchievementsOpen(false)}
      />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </main>
  );
}
