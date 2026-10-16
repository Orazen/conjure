/** Loads effect recipes from effects/ (built-in) and data/effects/ (made in the builder). */
import { readdir, readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { parseEffect, describeError, type Effect, type EffectSource } from "../shared/recipe.ts";

export * from "../shared/recipe.ts";

export interface LoadedEffect extends Effect {
  source: EffectSource;
}

export class EffectLibrary {
  constructor(
    private readonly builtinDir: string,
    private readonly customDir: string,
  ) {}

  private async readDir(dir: string, source: EffectSource): Promise<LoadedEffect[]> {
    if (!existsSync(dir)) return [];
    const files = (await readdir(dir)).filter((f) => f.endsWith(".json") && !f.startsWith("_"));
    const out: LoadedEffect[] = [];
    for (const f of files.sort()) {
      try {
        const effect = parseEffect(JSON.parse(await readFile(join(dir, f), "utf8")));
        out.push({ ...effect, source });
      } catch (err) {
        console.warn(`[effects] skipping ${f}: ${describeError(err)}`);
      }
    }
    return out;
  }

  /** `effects/_order.json` lists built-in ids in display order; anything unlisted goes last. */
  private async order(): Promise<string[]> {
    try {
      return JSON.parse(await readFile(join(this.builtinDir, "_order.json"), "utf8")) as string[];
    } catch {
      return [];
    }
  }

  async list(): Promise<LoadedEffect[]> {
    const order = await this.order();
    const rank = (id: string) => (order.includes(id) ? order.indexOf(id) : order.length);
    const builtin = (await this.readDir(this.builtinDir, "builtin")).sort((a, b) => rank(a.id) - rank(b.id));
    const ids = new Set(builtin.map((e) => e.id));
    const custom = (await this.readDir(this.customDir, "custom")).filter((e) => !ids.has(e.id));
    return [...builtin, ...custom];
  }

  async get(id: string): Promise<LoadedEffect | undefined> {
    return (await this.list()).find((e) => e.id === id);
  }

  async saveCustom(raw: unknown): Promise<LoadedEffect> {
    const effect = parseEffect(raw);
    const existing = await this.get(effect.id);
    if (existing?.source === "builtin") {
      throw new Error(`"${effect.id}" is a built-in effect; pick another id`);
    }
    await mkdir(this.customDir, { recursive: true });
    await writeFile(join(this.customDir, `${effect.id}.json`), JSON.stringify(effect, null, 2) + "\n");
    return { ...effect, source: "custom" };
  }

  async deleteCustom(id: string): Promise<boolean> {
    const existing = await this.get(id);
    if (!existing || existing.source !== "custom") return false;
    await rm(join(this.customDir, `${id}.json`));
    return true;
  }
}
