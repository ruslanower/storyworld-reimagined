import { useState } from "react";
import { campaign, heroSprite, STAT_LABEL, type HeroDef, type Stats } from "../data";

export function PartySelect({ onBack, onConfirm }: { onBack: () => void; onConfirm: (heroes: HeroDef[]) => void }) {
  const [picked, setPicked] = useState<string[]>([]);
  const [focus, setFocus] = useState<HeroDef>(campaign.heroes[0]!);

  const toggle = (h: HeroDef) => {
    setFocus(h);
    setPicked((p) => (p.includes(h.id) ? p.filter((x) => x !== h.id) : p.length >= 4 ? p : [...p, h.id]));
  };

  return (
    <main className="min-h-screen bg-night px-4 py-8 md:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between">
          <button className="pixel-btn-ghost" onClick={onBack}>
            ◀ Назад
          </button>
          <p className="font-display text-[0.6rem] text-muted-foreground">ЗАГІН {picked.length}/4</p>
        </div>
        <h1 className="title-glow mt-8 text-center text-lg md:text-2xl">Зберіть загін повстанців</h1>
        <p className="mt-3 text-center text-lg text-muted-foreground">
          Оберіть від 1 до 4 героїв. Гравці ходять по черзі за одним екраном.
        </p>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px]">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
            {campaign.heroes.map((h) => {
              const on = picked.includes(h.id);
              const order = picked.indexOf(h.id) + 1;
              return (
                <button
                  key={h.id}
                  onClick={() => toggle(h)}
                  onMouseEnter={() => setFocus(h)}
                  className={`pixel-frame group relative flex flex-col items-center p-4 pt-6 text-left transition-transform hover:-translate-y-1 ${on ? "pixel-frame-gold" : ""}`}
                >
                  {on && (
                    <span className="absolute right-2 top-2 bg-gold px-2 py-1 font-display text-[0.55rem] text-primary-foreground">
                      P{order}
                    </span>
                  )}
                  <div
                    className="absolute inset-x-6 bottom-20 top-8 opacity-40 blur-2xl"
                    style={{ background: h.color }}
                  />
                  <img
                    src={heroSprite(h.classKey, on ? "action" : "idle")}
                    alt={h.name}
                    className={`pixel relative h-32 w-auto object-contain md:h-40 ${on ? "animate-bob" : "grayscale-[40%] group-hover:grayscale-0"}`}
                    width={240}
                    height={280}
                  />
                  <p className="relative mt-3 text-center text-base leading-tight text-parchment">{h.name}</p>
                </button>
              );
            })}
          </div>

          <aside className="pixel-frame h-fit p-6">
            <div className="flex items-center gap-4">
              <img src={heroSprite(focus.classKey, "front")} alt="" className="pixel h-24 w-auto" width={240} height={280} />
              <div>
                <h2 className="font-display text-[0.7rem] leading-relaxed" style={{ color: focus.color }}>
                  {focus.name}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">{focus.role}</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-4 gap-2 text-center">
              {(Object.keys(STAT_LABEL) as (keyof Stats)[]).map((k) => (
                <div key={k} className="bg-ink p-2">
                  <p className="font-display text-[0.5rem] text-muted-foreground">{STAT_LABEL[k]}</p>
                  <p className="font-display text-sm text-gold">+{focus.stats[k]}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 font-display text-[0.5rem] text-hp">♥ HP {focus.maxHp}</p>
            <div className="mt-5 space-y-3">
              {focus.skills.map((s) => (
                <div key={s.name}>
                  <p className="text-base text-gold">✦ {s.name}</p>
                  <p className="text-sm leading-snug text-parchment/75">{s.desc}</p>
                </div>
              ))}
            </div>
            <button
              className="pixel-btn mt-8 w-full"
              disabled={!picked.length}
              onClick={() => onConfirm(picked.map((id) => campaign.heroes.find((h) => h.id === id)!))}
            >
              Почати Акт I
            </button>
          </aside>
        </div>
      </div>
    </main>
  );
}
