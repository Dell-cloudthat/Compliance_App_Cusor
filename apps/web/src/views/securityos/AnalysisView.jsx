import { useState, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';

const STEPS = [
  { label: 'Building your security profile…',  duration: 900 },
  { label: 'Checking 25 security controls…',  duration: 1100 },
  { label: 'Mapping to your industry…',        duration: 800 },
  { label: 'Calculating your score…',          duration: 700 },
];

export default function AnalysisView({ profile, onComplete }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let step = 0;
    let totalElapsed = 0;
    const totalDuration = STEPS.reduce((s, st) => s + st.duration, 0);

    function runStep() {
      if (step >= STEPS.length) {
        setProgress(100);
        setTimeout(onComplete, 400);
        return;
      }
      setStepIndex(step);
      const stepDuration = STEPS[step].duration;
      const startTime = Date.now();

      const tick = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const stepProgress = Math.min(elapsed / stepDuration, 1);
        const overallProgress = ((totalElapsed + stepDuration * stepProgress) / totalDuration) * 100;
        setProgress(Math.min(Math.round(overallProgress), 99));

        if (elapsed >= stepDuration) {
          clearInterval(tick);
          totalElapsed += stepDuration;
          step++;
          runStep();
        }
      }, 30);
    }

    runStep();
  }, [onComplete]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-16">
        <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
          <ShieldCheck size={18} className="text-white" />
        </div>
        <span className="font-bold text-xl text-white">SecurityOS</span>
      </div>

      {/* Animated shield */}
      <div className="relative mb-12">
        <div className="w-24 h-24 rounded-full bg-indigo-600/10 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-indigo-600/20 flex items-center justify-center">
            <ShieldCheck size={32} className="text-indigo-400 animate-pulse" />
          </div>
        </div>
        {/* Orbit dots */}
        <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s' }}>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-indigo-500" />
        </div>
        <div className="absolute inset-0 animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }}>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-indigo-400" />
        </div>
      </div>

      {/* Business name */}
      {profile.businessName && (
        <p className="text-slate-400 text-sm mb-6">
          Analyzing <span className="text-white font-medium">{profile.businessName}</span>
        </p>
      )}

      {/* Progress bar */}
      <div className="w-full max-w-xs mb-4">
        <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Current step */}
      <p className="text-sm text-slate-400 text-center min-h-[1.5rem]">
        {STEPS[stepIndex]?.label}
      </p>
    </div>
  );
}
