/** ffmpeg helpers: mock renders and the shareable before→after reel. ffmpeg is optional. */
import { spawn, spawnSync } from "node:child_process";

let ffmpegChecked: boolean | undefined;
export function hasFfmpeg(): boolean {
  if (ffmpegChecked === undefined) {
    try {
      ffmpegChecked = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" }).status === 0;
    } catch {
      ffmpegChecked = false;
    }
  }
  return ffmpegChecked;
}

function run(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    p.stderr.on("data", (d) => (err += d));
    p.on("error", reject);
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg failed (${code}): ${err.slice(-600)}`))));
  });
}

const kenBurns = (w: number, h: number, frames: number) =>
  `scale=${w * 2}:${h * 2},zoompan=z='min(zoom+0.0012,1.18)':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${w}x${h}:fps=24,format=yuv420p`;

/** Mock "render": a slow push-in on the photo (motion) or a dissolve into the fake end frame (transform). */
export async function mockVideo(opts: {
  input: string;
  endFrame?: string;
  out: string;
  width: number;
  height: number;
  seconds: number;
}): Promise<void> {
  const frames = Math.round(opts.seconds * 24);
  const audio = ["-f", "lavfi", "-t", String(opts.seconds), "-i", "sine=frequency=220:sample_rate=48000"];
  if (!opts.endFrame) {
    await run([
      "-loop", "1", "-i", opts.input, ...audio,
      "-filter_complex", `[0:v]${kenBurns(opts.width, opts.height, frames)}[v];[1:a]volume=0.05[a]`,
      "-map", "[v]", "-map", "[a]", "-t", String(opts.seconds),
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-c:a", "aac", "-movflags", "+faststart", opts.out,
    ]);
    return;
  }
  const half = opts.seconds / 2;
  await run([
    "-loop", "1", "-t", String(opts.seconds), "-i", opts.input,
    "-loop", "1", "-t", String(opts.seconds), "-i", opts.endFrame, ...audio,
    "-filter_complex",
    `[0:v]${kenBurns(opts.width, opts.height, frames)}[a];[1:v]${kenBurns(opts.width, opts.height, frames)}[b];` +
      `[a][b]xfade=transition=dissolve:duration=${half.toFixed(2)}:offset=${(half / 2).toFixed(2)}[v];[2:a]volume=0.05[au]`,
    "-map", "[v]", "-map", "[au]", "-t", String(opts.seconds),
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-c:a", "aac", "-movflags", "+faststart", opts.out,
  ]);
}

/** Vertical-friendly share reel: 1.2 s of the original photo, then the effect. */
export async function makeReel(opts: { photo: string; video: string; out: string; width: number; height: number }) {
  const { width: w, height: h } = opts;
  const v = `scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},setsar=1,fps=24,format=yuv420p`;
  const a = "aformat=sample_rates=48000:channel_layouts=stereo";
  try {
    await run([
      "-loop", "1", "-t", "1.2", "-i", opts.photo, "-i", opts.video,
      "-f", "lavfi", "-t", "1.2", "-i", "anullsrc=r=48000:cl=stereo",
      "-filter_complex", `[0:v]${v}[v0];[1:v]${v}[v1];[2:a]${a}[a0];[1:a]${a}[a1];[v0][a0][v1][a1]concat=n=2:v=1:a=1[v][a]`,
      "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-c:a", "aac",
      "-movflags", "+faststart", opts.out,
    ]);
  } catch {
    // The effect video has no audio track: concatenate video only.
    await run([
      "-loop", "1", "-t", "1.2", "-i", opts.photo, "-i", opts.video,
      "-filter_complex", `[0:v]${v}[v0];[1:v]${v}[v1];[v0][v1]concat=n=2:v=1:a=0[v]`,
      "-map", "[v]", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-movflags", "+faststart", opts.out,
    ]);
  }
}
