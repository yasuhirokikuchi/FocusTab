import type { ModeSummary } from '@/shared/schemas';

interface Props {
  modes: ModeSummary[];
  activeModeId: string;
  locked: boolean;
  switching: boolean;
  onSwitch: (modeId: string) => void;
}

export function ModeSwitcher({
  modes,
  activeModeId,
  locked,
  switching,
  onSwitch,
}: Props) {
  return (
    <nav className="mode-switcher" aria-label="モード切替">
      {modes.map((mode) => (
        <button
          key={mode.id}
          type="button"
          className={`mode-btn${mode.id === activeModeId ? ' active' : ''}`}
          disabled={locked || switching || mode.id === activeModeId}
          aria-label={`${mode.name}モードに切り替え`}
          aria-current={mode.id === activeModeId ? 'true' : undefined}
          onClick={() => onSwitch(mode.id)}
        >
          {mode.name}
        </button>
      ))}
    </nav>
  );
}
