import { sortEvents } from "@comm-ops/core";
import { motion } from "framer-motion";
import { Pause, Play, SkipForward } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useOps } from "../store/OpsContext";

export function Timeline() {
  const {
    dataset,
    replayTimeMs,
    setReplayTimeMs,
    replayBounds,
    setSelection,
  } = useOps();
  const sorted = useMemo(() => sortEvents(dataset.events), [dataset.events]);
  const [playing, setPlaying] = useState(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!playing || replayTimeMs == null) return;
    const start = performance.now();
    const from = replayTimeMs;
    const span = 120_000;
    const deltaTarget = replayBounds.max - from;

    const tick = (now: number) => {
      const t = (now - start) / span;
      const next = from + t * deltaTarget;
      if (next >= replayBounds.max) {
        setReplayTimeMs(replayBounds.max);
        setPlaying(false);
        return;
      }
      setReplayTimeMs(next);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, replayTimeMs, replayBounds.max, replayBounds.min, setReplayTimeMs]);

  const scrubValue = replayTimeMs ?? replayBounds.max;
  const progress =
    replayBounds.max === replayBounds.min
      ? 1
      : (scrubValue - replayBounds.min) / (replayBounds.max - replayBounds.min);

  return (
    <div className="panel" style={{ display: "flex", flexDirection: "column", gap: 10, padding: 12 }}>
      <div className="panel-header" style={{ border: "none", padding: "0 0 4px" }}>
        Timeline
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          type="button"
          className="btn"
          aria-label={playing ? "Pause" : "Play"}
          onClick={() => {
            if (!playing && replayTimeMs == null) {
              setReplayTimeMs(replayBounds.min);
            }
            setPlaying((p) => !p);
          }}
        >
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button
          type="button"
          className="btn"
          aria-label="Live now"
          onClick={() => {
            setPlaying(false);
            setReplayTimeMs(null);
          }}
        >
          <SkipForward size={16} />
        </button>
        <span className="chip" style={{ marginLeft: "auto" }}>
          {replayTimeMs == null ? "LIVE" : new Date(scrubValue).toLocaleString()}
        </span>
      </div>
      <input
        type="range"
        className="range"
        min={0}
        max={1000}
        step={1}
        value={Math.round(progress * 1000)}
        onChange={(e) => {
          setPlaying(false);
          const p = Number(e.target.value) / 1000;
          const ms = replayBounds.min + p * (replayBounds.max - replayBounds.min);
          setReplayTimeMs(ms);
        }}
      />
      <div className="scroll-y" style={{ maxHeight: 200 }}>
        {sorted
          .slice()
          .reverse()
          .map((ev) => {
            const active = replayTimeMs == null || new Date(ev.at).getTime() <= scrubValue;
            return (
              <motion.button
                type="button"
                key={ev.id}
                onClick={() => {
                  setPlaying(false);
                  setReplayTimeMs(new Date(ev.at).getTime());
                  if (ev.entityType === "person" && ev.entityId) { setSelection({ kind: "person", id: ev.entityId }); }
                  else if (ev.entityType === "equipment" && ev.entityId) setSelection({ kind: "equipment", id: ev.entityId });
                }}
                initial={false}
                animate={{ opacity: active ? 1 : 0.45 }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 10px",
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--border)",
                  background: active ? "rgba(94,234,255,0.07)" : "transparent",
                  marginBottom: 6,
                }}
              >
                <div style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: "0.08em" }}>
                  {new Date(ev.at).toLocaleString()} · {ev.kind}
                </div>
                <div style={{ fontSize: 12, marginTop: 4 }}>{ev.summary}</div>
              </motion.button>
            );
          })}
      </div>
    </div>
  );
}
