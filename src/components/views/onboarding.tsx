"use client";

import { ArrowLeft, ArrowRight, Check, HardDrive, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { workspaceNameSchema } from "@/lib/schemas";
import { ECOSYSTEM_TEMPLATE, buildWorkspace } from "@/lib/seed";
import { initStore, replaceWorkspace, useStore } from "@/lib/store";
import { cn, pluralize } from "@/lib/utils";
import { CenteredBrand } from "../shell/app-shell";
import { Button } from "../ui/button";
import { Field, Input } from "../ui/input";

const STEPS = ["Name", "Template", "Branches", "Create"];

export function Onboarding() {
  const router = useRouter();
  const load = useStore((s) => s.load);
  const mode = useStore((s) => s.adapter?.mode);
  const existing = useStore((s) => s.data?.workspace.name);
  const [step, setStep] = useState(0);
  const [name, setName] = useState("Synx Ecosystem");
  const [useTemplate, setUseTemplate] = useState(true);
  const [examples, setExamples] = useState(true);
  const [slugs, setSlugs] = useState<string[]>(ECOSYSTEM_TEMPLATE.map((p) => p.slug));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void initStore();
  }, []);


  const nameCheck = workspaceNameSchema.safeParse(name);
  const steps = useTemplate ? STEPS : STEPS.filter((s) => s !== "Branches");
  const current = steps[step];

  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const create = async () => {
    if (!nameCheck.success) return;
    setBusy(true);
    setError(null);
    const data = buildWorkspace({
      workspaceName: nameCheck.data,
      includeTemplate: useTemplate,
      includeExamples: useTemplate && examples,
      productSlugs: slugs,
    });
    await replaceWorkspace(data);
    const s = useStore.getState();
    if (s.saveState === "error") {
      setBusy(false);
      setError(s.saveError ?? "Saving failed");
      return;
    }
    router.push(useTemplate ? "/map" : "/overview");
  };

  if (load === "idle" || load === "loading") {
    return (
      <CenteredBrand>
        <LoaderCircle className="mt-10 size-5 animate-spin text-ink-4" />
      </CenteredBrand>
    );
  }

  return (
    <CenteredBrand>
      <div className="w-full max-w-lg">
        <ol className="mb-6 flex items-center gap-2" aria-label="Progress">
          {steps.map((s, i) => (
            <li key={s} className="flex items-center gap-2 text-xs">
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full border text-2xs",
                  i < step ? "border-ink bg-ink text-white" : i === step ? "border-ink text-ink" : "border-line-strong text-ink-4",
                )}
              >
                {i < step ? <Check className="size-3" /> : i + 1}
              </span>
              <span className={cn(i === step ? "font-medium text-ink" : "text-ink-4")}>{s}</span>
              {i < steps.length - 1 ? <span className="h-px w-6 bg-line-strong" /> : null}
            </li>
          ))}
        </ol>

        <div className="rounded-xl border border-line bg-canvas p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          {current === "Name" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (nameCheck.success) next();
              }}
            >
              <h1 className="text-lg font-semibold tracking-tight">Set up your workspace</h1>
              <p className="mt-1 text-[13px] text-ink-3">
                Mindmap is the planning workspace for products, content, research, PR and the Skalle universe.
              </p>
              {existing ? (
                <p className="mt-4 rounded-md border border-dashed border-line-strong px-3 py-2 text-xs text-ink-2">
                  You already have a workspace, “{existing}”. Creating a new one replaces it
                  {mode === "local" ? " in this browser" : ""}. Export it from Settings first if you want to keep a copy.
                </p>
              ) : null}
              <Field label="Workspace name" className="mt-5" error={name && !nameCheck.success ? nameCheck.error.issues[0]?.message : null}>
                {(id) => <Input id={id} autoFocus value={name} onChange={(e) => setName(e.target.value)} />}
              </Field>
              {mode === "local" ? (
                <div className="mt-5 flex gap-2.5 rounded-md bg-muted px-3 py-2.5 text-xs leading-relaxed text-ink-2">
                  <HardDrive className="mt-0.5 size-3.5 shrink-0" />
                  <p>
                    <strong className="font-medium">Development mode.</strong> Supabase is not configured, so data is stored only in this
                    browser. It is not shared with teammates or protected by sign-in. Joining an existing shared workspace requires
                    Supabase — see the README.
                  </p>
                </div>
              ) : null}
              <div className="mt-6 flex justify-end">
                <Button variant="primary" type="submit" disabled={!nameCheck.success}>
                  Continue <ArrowRight />
                </Button>
              </div>
            </form>
          ) : null}


          {current === "Template" ? (
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Choose a starting point</h1>
              <div className="mt-5 flex flex-col gap-2" role="radiogroup" aria-label="Template">
                {[
                  {
                    value: true,
                    title: "Synx ecosystem template",
                    body: "Real Time Web, Synx Tools, Skalle AI, Morph Space, Cross-Ecosystem Strategy and Future Research, with their content categories and map branches.",
                  },
                  { value: false, title: "Blank workspace", body: "Just a root node. Add your own products and branches." },
                ].map((o) => (
                  <button
                    key={String(o.value)}
                    type="button"
                    role="radio"
                    aria-checked={useTemplate === o.value}
                    onClick={() => setUseTemplate(o.value)}
                    className={cn(
                      "flex gap-3 rounded-lg border p-3.5 text-left transition-colors",
                      useTemplate === o.value ? "border-ink" : "border-line hover:border-line-strong",
                    )}
                  >
                    <span className={cn("mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border", useTemplate === o.value ? "border-ink" : "border-line-strong")}>
                      {useTemplate === o.value ? <span className="size-2 rounded-full bg-ink" /> : null}
                    </span>
                    <span>
                      <span className="block text-[13px] font-medium">{o.title}</span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-ink-3">{o.body}</span>
                    </span>
                  </button>
                ))}
              </div>
              {useTemplate ? (
                <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-[13px]">
                  <input type="checkbox" checked={examples} onChange={(e) => setExamples(e.target.checked)} className="mt-0.5 accent-black" />
                  <span>
                    Include example ideas
                    <span className="block text-xs text-ink-3">
                      Around 20 sample content ideas, campaigns, research questions, tasks and placeholder universe entries — each labelled
                      “Example”. They describe planning work only, not shipped capabilities.
                    </span>
                  </span>
                </label>
              ) : null}
              <div className="mt-6 flex justify-between">
                <Button variant="ghost" onClick={back}>
                  <ArrowLeft /> Back
                </Button>
                <Button variant="primary" onClick={next}>
                  Continue <ArrowRight />
                </Button>
              </div>
            </div>
          ) : null}

          {current === "Branches" ? (
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Review the initial branches</h1>
              <p className="mt-1 text-[13px] text-ink-3">Each becomes a first-level branch of the master mind map and a product workspace.</p>
              <ul className="mt-5 divide-y divide-line rounded-lg border border-line">
                {ECOSYSTEM_TEMPLATE.map((p) => {
                  const on = slugs.includes(p.slug);
                  return (
                    <li key={p.slug}>
                      <label className="flex cursor-pointer items-start gap-3 px-3.5 py-3">
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => setSlugs((s) => (on ? s.filter((x) => x !== p.slug) : [...s, p.slug]))}
                          className="mt-0.5 accent-black"
                        />
                        <span className="min-w-0">
                          <span className="flex items-center gap-2 text-[13px] font-medium">
                            {p.name}
                            <span className="text-2xs font-normal text-ink-4">{p.kind === "initiative" ? "Initiative" : p.url.replace("https://", "")}</span>
                          </span>
                          <span className="mt-0.5 block text-xs text-ink-3">{p.tagline}</span>
                          <span className="mt-1 block text-2xs text-ink-4">{p.categories.length} content categories</span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-6 flex justify-between">
                <Button variant="ghost" onClick={back}>
                  <ArrowLeft /> Back
                </Button>
                <Button variant="primary" onClick={next} disabled={!slugs.length}>
                  Continue <ArrowRight />
                </Button>
              </div>
            </div>
          ) : null}

          {current === "Create" ? (
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Ready to create “{nameCheck.success ? nameCheck.data : name}”</h1>
              <ul className="mt-4 flex flex-col gap-2 text-[13px] text-ink-2">
                <li className="flex gap-2">
                  <Check className="mt-0.5 size-3.5 shrink-0" />
                  {useTemplate ? `${pluralize(slugs.length, "branch", "branches")} with content categories` : "A blank map with a single root node"}
                </li>
                {useTemplate ? (
                  <li className="flex gap-2">
                    <Check className="mt-0.5 size-3.5 shrink-0" />
                    {examples ? "Example ideas, labelled as examples" : "No example records"}
                  </li>
                ) : null}
                <li className="flex gap-2">
                  <Check className="mt-0.5 size-3.5 shrink-0" />
                  {mode === "local" ? "Saved in this browser (development mode)" : "Saved to your Supabase project"}
                </li>
              </ul>
              <p className="mt-4 text-xs text-ink-3">Next: explore the map, then press N anywhere to capture an idea.</p>
              {error ? <p className="mt-3 text-xs text-danger">Could not save the workspace: {error}</p> : null}
              <div className="mt-6 flex justify-between">
                <Button variant="ghost" onClick={back} disabled={busy}>
                  <ArrowLeft /> Back
                </Button>
                <Button variant="primary" onClick={() => void create()} disabled={busy}>
                  {busy ? <LoaderCircle className="animate-spin" /> : null}
                  Create workspace
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </CenteredBrand>
  );
}
