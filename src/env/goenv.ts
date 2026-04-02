import * as vscode from "vscode";
import { logger } from "../logger/logger";

export interface GoEnvConfig {
  GOARCH?: string;
  GOOS?: string;
  GOARM?: string;
  GOAMD64?: string;
  GOMIPS?: string;
  GOFLAGS?: string;
  GOEXPERIMENT?: string;
  disableOptimizations?: boolean;
}

const STATE_KEY = "goenv";

interface EnvOption {
  label: string;
  description: string;
}

const GOARCH_VALUES: EnvOption[] = [
  { label: "amd64", description: "x86-64 (64-bit)" },
  { label: "386", description: "x86 (32-bit)" },
  { label: "arm", description: "ARM (32-bit)" },
  { label: "arm64", description: "ARM64 / AArch64 (64-bit)" },
  { label: "wasm", description: "WebAssembly" },
  { label: "mips", description: "MIPS (big-endian, 32-bit)" },
  { label: "mipsle", description: "MIPS (little-endian, 32-bit)" },
  { label: "mips64", description: "MIPS (big-endian, 64-bit)" },
  { label: "mips64le", description: "MIPS (little-endian, 64-bit)" },
  { label: "ppc64", description: "IBM POWER (big-endian, 64-bit)" },
  { label: "ppc64le", description: "IBM POWER (little-endian, 64-bit)" },
  { label: "riscv64", description: "RISC-V (64-bit)" },
  { label: "s390x", description: "IBM Z" },
  { label: "loong64", description: "LoongArch (64-bit)" },
];

const GOOS_VALUES: EnvOption[] = [
  { label: "linux", description: "Linux" },
  { label: "darwin", description: "macOS" },
  { label: "windows", description: "Windows" },
  { label: "freebsd", description: "FreeBSD" },
  { label: "openbsd", description: "OpenBSD" },
  { label: "netbsd", description: "NetBSD" },
  { label: "dragonfly", description: "DragonFly BSD" },
  { label: "solaris", description: "Solaris / illumos" },
  { label: "android", description: "Android" },
  { label: "ios", description: "iOS" },
  { label: "plan9", description: "Plan 9" },
  { label: "aix", description: "AIX" },
  { label: "js", description: "JavaScript (WebAssembly)" },
  { label: "wasip1", description: "WASI Preview 1" },
];

const GOARM_VALUES: EnvOption[] = [
  { label: "5", description: "ARMv5 — no hardware floating point" },
  { label: "6", description: "ARMv6 — default" },
  { label: "7", description: "ARMv7 — with hardware floating point" },
];

const GOAMD64_VALUES: EnvOption[] = [
  { label: "v1", description: "Baseline — all x86-64 CPUs (default)" },
  { label: "v2", description: "SSE3 / SSE4 — Nehalem+ (2008+)" },
  { label: "v3", description: "AVX / AVX2 — Haswell+ (2013+)" },
  { label: "v4", description: "AVX-512 — Skylake-X+ (2017+)" },
];

const GOMIPS_VALUES: EnvOption[] = [
  { label: "hardfloat", description: "Hardware floating point (default)" },
  { label: "softfloat", description: "Software floating point" },
];

/** Build a QuickPickItem list from an array of EnvOptions, marking the current value. */
function makeItems(
  values: EnvOption[],
  current: string | undefined
): vscode.QuickPickItem[] {
  return [
    {
      label: "default",
      description: "Use system default",
      picked: current === undefined,
    },
    ...values.map((v) => ({
      label: v.label,
      description: v.description,
      picked: v.label === current,
    })),
  ];
}

export class GoEnvManager implements vscode.Disposable {
  private readonly state: vscode.Memento;
  private readonly goArchItem: vscode.StatusBarItem;
  private readonly goOSItem: vscode.StatusBarItem;
  private readonly goOptimizationsItem: vscode.StatusBarItem;

  constructor(context: vscode.ExtensionContext) {
    this.state = context.workspaceState;

    this.goArchItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      10
    );
    this.goArchItem.command = "daanv2-go-asm.select-goarch";
    this.goArchItem.tooltip = "Select Go target architecture (GOARCH)";

    this.goOSItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      9
    );
    this.goOSItem.command = "daanv2-go-asm.select-goos";
    this.goOSItem.tooltip = "Select Go target operating system (GOOS)";

    this.goOptimizationsItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      8
    );
    this.goOptimizationsItem.command = "daanv2-go-asm.toggle-optimizations";
    this.goOptimizationsItem.tooltip =
      "Toggle Go compiler optimizations (affects -gcflags)";

    this.updateStatusBar();
    this.goArchItem.show();
    this.goOSItem.show();
    this.goOptimizationsItem.show();
  }

  private getConfig(): GoEnvConfig {
    return this.state.get<GoEnvConfig>(STATE_KEY, {});
  }

  private async setConfig(config: GoEnvConfig): Promise<void> {
    await this.state.update(STATE_KEY, config);
    this.updateStatusBar();
  }

  private updateStatusBar(): void {
    const config = this.getConfig();
    this.goArchItem.text = `$(chip) ${config.GOARCH ?? "default"}`;
    this.goOSItem.text = `$(server-process) ${config.GOOS ?? "default"}`;
    if (config.disableOptimizations) {
      this.goOptimizationsItem.text = `$(debug-step-over) No Optimizations`;
    } else {
      this.goOptimizationsItem.text = `$(zap) Optimized`;
    }
  }

  /** Shared helper: shows a QuickPick for a string-valued Go env variable and saves the selection. */
  private async selectEnvVar(
    key: "GOARCH" | "GOOS" | "GOARM" | "GOAMD64" | "GOMIPS",
    values: EnvOption[],
    options: { title: string; placeHolder: string }
  ): Promise<void> {
    const config = this.getConfig();
    const result = await vscode.window.showQuickPick(
      makeItems(values, config[key]),
      options
    );
    if (result === undefined) {
      return;
    }
    const newConfig = { ...config };
    if (result.label === "default") {
      delete newConfig[key];
    } else {
      newConfig[key] = result.label;
    }
    await this.setConfig(newConfig);
    logger.info(`${key} set`, { [key]: newConfig[key] });
  }

  async selectGoArch(): Promise<void> {
    return this.selectEnvVar("GOARCH", GOARCH_VALUES, {
      title: "Select GOARCH",
      placeHolder: "Choose target architecture",
    });
  }

  async selectGoOS(): Promise<void> {
    return this.selectEnvVar("GOOS", GOOS_VALUES, {
      title: "Select GOOS",
      placeHolder: "Choose target operating system",
    });
  }

  async selectGoArm(): Promise<void> {
    return this.selectEnvVar("GOARM", GOARM_VALUES, {
      title: "Select GOARM",
      placeHolder: "Choose ARM architecture version (used when GOARCH=arm)",
    });
  }

  async selectGoAmd64(): Promise<void> {
    return this.selectEnvVar("GOAMD64", GOAMD64_VALUES, {
      title: "Select GOAMD64",
      placeHolder: "Choose AMD64 microarchitecture level (used when GOARCH=amd64)",
    });
  }

  async selectGoMips(): Promise<void> {
    return this.selectEnvVar("GOMIPS", GOMIPS_VALUES, {
      title: "Select GOMIPS",
      placeHolder: "Choose MIPS floating point mode (used when GOARCH=mips/mipsle)",
    });
  }

  async selectGoFlags(): Promise<void> {
    const config = this.getConfig();
    const result = await vscode.window.showInputBox({
      title: "Set GOFLAGS",
      prompt: "Enter default flags for go commands (leave empty to clear)",
      value: config.GOFLAGS ?? "",
      placeHolder: "e.g., -tags=integration",
    });
    if (result === undefined) {
      return;
    }
    const newConfig = { ...config };
    if (result === "") {
      delete newConfig.GOFLAGS;
    } else {
      newConfig.GOFLAGS = result;
    }
    await this.setConfig(newConfig);
    logger.info("GOFLAGS set", { GOFLAGS: newConfig.GOFLAGS });
  }

  async selectGoExperiment(): Promise<void> {
    const config = this.getConfig();
    const result = await vscode.window.showInputBox({
      title: "Set GOEXPERIMENT",
      prompt:
        "Enter comma-separated experiment names to enable (leave empty to clear)",
      value: config.GOEXPERIMENT ?? "",
      placeHolder: "e.g., loopvar,rangefunc",
    });
    if (result === undefined) {
      return;
    }
    const newConfig = { ...config };
    if (result === "") {
      delete newConfig.GOEXPERIMENT;
    } else {
      newConfig.GOEXPERIMENT = result;
    }
    await this.setConfig(newConfig);
    logger.info("GOEXPERIMENT set", { GOEXPERIMENT: newConfig.GOEXPERIMENT });
  }

  async toggleOptimizations(): Promise<void> {
    const config = this.getConfig();
    const newConfig = {
      ...config,
      disableOptimizations: !config.disableOptimizations,
    };
    await this.setConfig(newConfig);
    const state = newConfig.disableOptimizations
      ? "disabled (showing unoptimized assembly)"
      : "enabled (showing optimized assembly)";
    logger.info("optimizations toggled", {
      disableOptimizations: newConfig.disableOptimizations,
    });
    vscode.window.showInformationMessage(`Go compiler optimizations ${state}`);
  }

  /** Returns the -gcflags argument for go build based on the current optimizations setting. */
  getGcFlags(): string {
    const config = this.getConfig();
    const flags = ["-S"];
    if (config.disableOptimizations) {
      flags.push("-N", "-l");
    }
    return `-gcflags=all=${flags.join(" ")}`;
  }

  /** Opens a two-step menu: first pick the variable, then pick its value. */
  async selectGoEnv(): Promise<void> {
    const config = this.getConfig();
    const items: vscode.QuickPickItem[] = [
      {
        label: "GOARCH",
        description: config.GOARCH ?? "default",
        detail: "Target CPU architecture",
      },
      {
        label: "GOOS",
        description: config.GOOS ?? "default",
        detail: "Target operating system",
      },
      {
        label: "GOARM",
        description: config.GOARM ?? "default",
        detail: "ARM architecture version (used when GOARCH=arm)",
      },
      {
        label: "GOAMD64",
        description: config.GOAMD64 ?? "default",
        detail: "AMD64 microarchitecture level (used when GOARCH=amd64)",
      },
      {
        label: "GOMIPS",
        description: config.GOMIPS ?? "default",
        detail: "MIPS floating point mode (used when GOARCH=mips/mipsle)",
      },
      {
        label: "GOFLAGS",
        description: config.GOFLAGS ?? "(none)",
        detail: "Default flags for go commands",
      },
      {
        label: "GOEXPERIMENT",
        description: config.GOEXPERIMENT ?? "(none)",
        detail: "Comma-separated list of compiler experiments to enable",
      },
      {
        label: "Optimizations",
        description: config.disableOptimizations ? "disabled" : "enabled",
        detail:
          "Toggle compiler optimizations (-gcflags=-S vs -gcflags=-S -N -l)",
      },
    ];

    const selected = await vscode.window.showQuickPick(items, {
      title: "Configure Go Environment",
      placeHolder: "Choose a Go environment variable to configure",
    });
    if (!selected) {
      return;
    }

    const envSelectors: Record<string, () => Promise<void>> = {
      GOARCH: () => this.selectGoArch(),
      GOOS: () => this.selectGoOS(),
      GOARM: () => this.selectGoArm(),
      GOAMD64: () => this.selectGoAmd64(),
      GOMIPS: () => this.selectGoMips(),
      GOFLAGS: () => this.selectGoFlags(),
      GOEXPERIMENT: () => this.selectGoExperiment(),
      Optimizations: () => this.toggleOptimizations(),
    };
    await envSelectors[selected.label]?.();
  }

  /** Returns the currently selected env vars to inject into child processes. */
  getEnvVars(): NodeJS.ProcessEnv {
    const config = this.getConfig();
    const env: NodeJS.ProcessEnv = {};
    const envKeys: (keyof GoEnvConfig)[] = [
      "GOARCH",
      "GOOS",
      "GOARM",
      "GOAMD64",
      "GOMIPS",
      "GOFLAGS",
      "GOEXPERIMENT",
    ];
    for (const key of envKeys) {
      const value = config[key];
      if (typeof value === "string" && value) {
        env[key] = value;
      }
    }
    return env;
  }

  dispose(): void {
    this.goArchItem.dispose();
    this.goOSItem.dispose();
    this.goOptimizationsItem.dispose();
  }
}
