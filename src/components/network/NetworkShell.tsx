'use client';

import React, { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { GalaxyBackground } from '@/components/canvas/GalaxyBackground';
import { TopNavHeader } from '@/components/ui/TopNavHeader';
import { SettingsModal } from '@/components/modals/SettingsModal';
import { TutorialModal } from '@/components/modals/TutorialModal';
import { AchievementsModal } from '@/components/modals/AchievementsModal';

/** Frame for multiplayer pages: same galaxy + navigation as the simulator. */
export function NetworkShell({ children }: { children: React.ReactNode }) {
  const reducedMotion = useGameStore(s => s.reducedMotion);
  const [settings, setSettings] = useState(false);
  const [tutorial, setTutorial] = useState(false);
  const [achievements, setAchievements] = useState(false);
  return (
    <div className="relative min-h-[100dvh] flex flex-col bg-[#02040b] text-slate-100">
      <GalaxyBackground reducedMotion={reducedMotion} />
      <TopNavHeader onOpenSettings={() => setSettings(true)} onOpenTutorial={() => setTutorial(true)} onOpenAchievements={() => setAchievements(true)} />
      <main id="main" className="relative z-10 flex-1 w-full">{children}</main>
      <SettingsModal isOpen={settings} onClose={() => setSettings(false)} />
      <TutorialModal isOpen={tutorial} onClose={() => setTutorial(false)} />
      <AchievementsModal isOpen={achievements} onClose={() => setAchievements(false)} />
    </div>
  );
}
