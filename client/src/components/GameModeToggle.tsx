import type { GameMode } from "shared";

const ClassicIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 372 372" fill="none" className="w-full h-auto">
    <rect width="182" height="20" x="94" y="325" fill="currentColor" rx="10" />
    <circle cx="223" cy="224" r="16" fill="currentColor" />
    <path stroke="currentColor" strokeWidth="6" d="M4.99936 337.516H367.001" opacity=".3" />
    <path stroke="currentColor" strokeLinecap="round" strokeWidth="6" d="M7.5 332.009V53.9921M365 332.001V50" opacity=".3" />
  </svg>
);

const GoalsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 372 372" fill="none" className="w-full h-auto">
    <circle cx="182.55" cy="116.497" r="16" fill="currentColor" transform="rotate(-49.75 182.55 116.497)" />
    <circle cx="255.194" cy="287.696" r="46" stroke="currentColor" strokeWidth="8" transform="rotate(-49.75 255.194 287.696)" />
    <path stroke="currentColor" strokeLinecap="round" strokeWidth="18" d="M214.545 196.528c-18.057.436-47.041 23.067-49.396 45.968" />
    <path stroke="currentColor" strokeLinecap="round" strokeWidth="6" d="M350.5 46.1163C322.989 35.7008 293.16 30 262 30 123.929 30 12 141.929 12 280c0 22.483 2.968 44.273 8.5335 65" opacity=".3" />
  </svg>
);

interface GameModeToggleProps {
  value: GameMode;
  onChange: (mode: GameMode) => void;
}

export const GameModeToggle = ({ value, onChange }: GameModeToggleProps) => {
  const options: { mode: GameMode; label: string; icon: React.ReactNode }[] = [
    { mode: "classic", label: "Classic", icon: <ClassicIcon /> },
    { mode: "goals", label: "Goals", icon: <GoalsIcon /> },
  ];

  return (
      <div className="flex gap-2">
        {options.map(({ mode, label, icon }) => {
          const active = value === mode;
          return (
            <button
              key={mode}
              type="button"
              className={`flex-1 flex flex-col items-center gap-3 px-4 pt-4 pb-3 border text-sm cursor-pointer transition-colors rounded-lg ${
                active
                  ? "bg-white/15 text-white border-white/30"
                  : "bg-surface-elevated text-text-muted border-border hover:bg-white/5"
              }`}
              onClick={() => onChange(mode)}
            >
              {label}
              <div className={`w-20 h-20 ${active ? "opacity-100" : "opacity-40"} transition-opacity`}>
                {icon}
              </div>
              
            </button>
          );
        })}
      </div>
  );
};
