// Animated robot button that opens the assistant, with a "here to help" pop-up.
// Robot image: public/assistant/robot.png. CSS-only animations; motion is turned off
// for people who set "reduce motion" in their OS.

import { useEffect, useState } from "react";

const GREETINGS = [
  "Hi! I'm here to help you 👋",
  "Feel free to ask me anything about our products!",
  "Looking for the best price? Just ask me.",
];

const DISMISS_KEY = "newtags-assistant-greeting-dismissed";

type Props = {
  open: boolean;
  onToggle: () => void;
  src?: string;
  /** ms before the pop-up first appears */
  greetDelay?: number;
};

export default function RobotLauncher({ open, onToggle, src = "/assistant/robot.png", greetDelay = 2500 }: Props) {
  const [showGreeting, setShowGreeting] = useState(false);
  const [line, setLine] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  // Show the pop-up after a short delay, unless dismissed earlier in this visit.
  useEffect(() => {
    let wasDismissed = false;
    try { wasDismissed = sessionStorage.getItem(DISMISS_KEY) === "1"; } catch {}
    if (wasDismissed) { setDismissed(true); return; }
    const t = setTimeout(() => setShowGreeting(true), greetDelay);
    return () => clearTimeout(t);
  }, [greetDelay]);

  // Rotate the pop-up text every few seconds while it is visible.
  useEffect(() => {
    if (!showGreeting || open) return;
    const t = setInterval(() => setLine((l) => (l + 1) % GREETINGS.length), 4500);
    return () => clearInterval(t);
  }, [showGreeting, open]);

  function dismiss() {
    setShowGreeting(false);
    setDismissed(true);
    try { sessionStorage.setItem(DISMISS_KEY, "1"); } catch {}
  }

  const bubbleVisible = showGreeting && !open && !dismissed;

  return (
    <>
      <style>{CSS}</style>

      {bubbleVisible && (
        <div className="sa-pop fixed bottom-32 right-4 z-50 w-56 rounded-2xl border border-[#18181520] bg-white p-3 pr-7 text-sm text-[#181815] shadow-xl" role="status">
          <button onClick={onToggle} className="text-left" key={line}>
            <span className="sa-fade block">{GREETINGS[line]}</span>
          </button>
          <button onClick={dismiss} aria-label="Dismiss" className="absolute right-2 top-1.5 text-gray-400 hover:text-gray-600">
            ×
          </button>
          {/* tail pointing at the robot */}
          <span className="absolute -bottom-2 right-10 h-4 w-4 rotate-45 border-b border-r border-[#18181520] bg-white" />
        </div>
      )}

      <button
        onClick={() => { onToggle(); setShowGreeting(false); }}
        aria-label={open ? "Close shopping assistant" : "Open shopping assistant"}
        className="sa-launcher group fixed bottom-3 right-4 z-50 flex h-28 w-20 items-end justify-center"
      >
        <span className="sa-shadow absolute bottom-0 h-2 w-10 rounded-full bg-black/20" />
        <span className={`sa-bob relative block ${open ? "" : "sa-idle"}`}>
          
          <img src={src} alt="" draggable={false} className="sa-turn h-24 w-auto select-none drop-shadow-lg" />
        </span>
        {open && (
          <span className="absolute right-0 top-0 flex h-6 w-6 items-center justify-center rounded-full bg-[#d94b24] text-xs text-white shadow">
            ✕
          </span>
        )}
        {!open && !dismissed && !showGreeting && (
          <span className="absolute right-1 top-1 h-3 w-3 animate-ping rounded-full bg-green-400" />
        )}
      </button>
    </>
  );
}

const CSS = `
.sa-launcher { perspective: 400px; }
.sa-bob { animation: sa-bob 2.6s ease-in-out infinite; }
.sa-shadow { animation: sa-shadow 2.6s ease-in-out infinite; }
/* Every ~7s the robot looks left, right, then does a full turn. */
.sa-idle .sa-turn { animation: sa-turn 7s ease-in-out infinite; transform-origin: 50% 60%; }
.sa-launcher:hover .sa-turn { animation: sa-wiggle 0.6s ease-in-out; }
.sa-pop { animation: sa-pop 0.35s cubic-bezier(.2,1.4,.4,1) both; transform-origin: 85% 100%; }
.sa-fade { animation: sa-fade 0.4s ease both; }

@keyframes sa-bob { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }
@keyframes sa-shadow { 0%,100% { transform: scaleX(1); opacity:.35 } 50% { transform: scaleX(.75); opacity:.2 } }
@keyframes sa-turn {
  0%, 40%  { transform: rotateY(0) }
  48%      { transform: rotateY(-35deg) }
  56%      { transform: rotateY(35deg) }
  62%      { transform: rotateY(0) }
  80%      { transform: rotateY(360deg) }
  100%     { transform: rotateY(360deg) }
}
@keyframes sa-wiggle { 0%,100% { transform: rotate(0) } 25% { transform: rotate(-10deg) } 75% { transform: rotate(10deg) } }
@keyframes sa-pop { from { opacity:0; transform: scale(.6) translateY(10px) } to { opacity:1; transform: scale(1) translateY(0) } }
@keyframes sa-fade { from { opacity:0; transform: translateY(4px) } to { opacity:1; transform: none } }

@media (prefers-reduced-motion: reduce) {
  .sa-bob, .sa-shadow, .sa-idle .sa-turn, .sa-launcher:hover .sa-turn, .sa-pop, .sa-fade { animation: none !important; }
  .sa-launcher .animate-ping { animation: none !important; }
}
`;
