import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Square, RefreshCw, } from 'lucide-react';

interface AutoRollModalProps {
    isOpen: boolean;
    onClose: () => void;
    onStart: (config: AutoRollConfig) => void;
    onStop: () => void;
    isRunning: boolean;
    currentAttempt: number;
    logs: string[];
    traitValue: number; // Current value of the target trait
}

export interface AutoRollConfig {
    targetTrait: 'cap' | 'stem' | 'spores';
    stopAtValue: number; // e.g., stop when Cap reaches +3
    maxAttempts: number;
}

export const AutoRollModal: React.FC<AutoRollModalProps> = ({
    isOpen,
    onClose,
    onStart,
    onStop,
    isRunning,
    currentAttempt,
    logs,
    traitValue
}) => {
    // Config State
    const [targetTrait, setTargetTrait] = useState<'cap' | 'stem' | 'spores'>('cap');
    const [stopAtValue, setStopAtValue] = useState(3);
    const [maxAttempts, setMaxAttempts] = useState(10);

    const logsEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll logs
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-[#1a1a1a] border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative">

                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <RefreshCw className={isRunning ? "animate-spin text-primary" : "text-white/50"} size={20} />
                        Auto-Mutator
                    </h3>
                    {!isRunning && (
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                            <X size={20} className="text-white/50" />
                        </button>
                    )}
                </div>

                <div className="p-6 space-y-6">

                    {/* Configuration Section (Disabled while running) */}
                    <div className={`space-y-4 ${isRunning ? 'opacity-50 pointer-events-none' : ''}`}>

                        {/* Trait Selection */}
                        <div>
                            <label className="text-xs uppercase tracking-wider text-textSecondary font-bold mb-2 block">Target Mutation</label>
                            <div className="grid grid-cols-3 gap-2">
                                {(['cap', 'stem', 'spores'] as const).map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => setTargetTrait(t)}
                                        className={`p-3 rounded-xl border font-bold capitalize transition-all
                      ${targetTrait === t
                                                ? 'bg-primary/20 border-primary text-primary'
                                                : 'bg-white/5 border-transparent text-textSecondary hover:bg-white/10'}`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Stop Condition */}
                            <div>
                                <label className="text-xs uppercase tracking-wider text-textSecondary font-bold mb-2 block">Stop Value</label>
                                <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3 border border-white/5">
                                    <span className="text-textSecondary text-sm">Reach:</span>
                                    <select
                                        value={stopAtValue}
                                        onChange={(e) => setStopAtValue(Number(e.target.value))}
                                        className="bg-transparent text-white font-mono font-bold focus:outline-none w-full text-right"
                                    >
                                        {[1, 2, 3].map(v => <option key={v} value={v} className="bg-gray-900">+{v}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Max Attempts */}
                            <div>
                                <label className="text-xs uppercase tracking-wider text-textSecondary font-bold mb-2 block">Max Attempts</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={100}
                                    value={maxAttempts}
                                    onChange={(e) => setMaxAttempts(Math.max(1, Math.min(100, Number(e.target.value))))}
                                    className="w-full bg-white/5 border border-white/5 rounded-xl p-3 text-white font-mono font-bold focus:outline-none focus:border-primary text-center"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Progress / Logs Section */}
                    <div className="bg-black/40 rounded-xl border border-white/5 p-4 h-48 flex flex-col">
                        <div className="flex items-center justify-between mb-2 text-xs text-textSecondary uppercase tracking-wider">
                            <span>Sequence Log</span>
                            <span>Attempt: <span className="text-white">{currentAttempt}</span> / {maxAttempts}</span>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-2 font-mono text-xs pr-2 custom-scrollbar">
                            {logs.length === 0 && <span className="text-white/20 italic">Ready to initiate sequence...</span>}
                            {logs.map((log, i) => (
                                <div key={i} className="flex gap-2">
                                    <span className="text-white/30">[{i + 1}]</span>
                                    <span className={
                                        log.includes('Success') || log.includes('Reached') ? 'text-green-400' :
                                            log.includes('Failed') ? 'text-red-400' :
                                                log.includes('Stopped') ? 'text-yellow-400' :
                                                    'text-white/70'
                                    }>{log}</span>
                                </div>
                            ))}
                            <div ref={logsEndRef} />
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4">
                        {!isRunning ? (
                            <button
                                onClick={() => onStart({ targetTrait, stopAtValue, maxAttempts })}
                                className="flex-1 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/80 hover:to-purple-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                <Play size={20} fill="currentColor" />
                                Start Auto-Roll
                            </button>
                        ) : (
                            <button
                                onClick={onStop}
                                className="flex-1 bg-red-500/10 border border-red-500/50 hover:bg-red-500/20 text-red-400 font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all"
                            >
                                <Square size={20} fill="currentColor" />
                                Stop Sequence
                            </button>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};