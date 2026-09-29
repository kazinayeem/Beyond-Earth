'use client';

import React, { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { StarfieldCanvas } from '@/components/canvas/StarfieldCanvas';
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

export default function GameMainPage() {
  const { screen } = useGameStore();

  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isAchievementsOpen, setIsAchievementsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
    <main className="relative h-[100dvh] max-h-[100dvh] flex flex-col overflow-hidden bg-[#020617] text-slate-100">
      {/* Animated Deep Space Canvas */}
      <StarfieldCanvas density={120} speed={0.15} />

      {/* Persistent Flight Director Navigation Bar */}
      <TopNavHeader
        onOpenTutorial={() => setIsTutorialOpen(true)}
        onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
        onOpenAchievements={() => setIsAchievementsOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

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
