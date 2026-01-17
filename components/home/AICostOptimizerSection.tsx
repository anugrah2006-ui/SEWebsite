'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';

// Pricing map: per-1K token input/output USD. (Illustrative only.)
// These should eventually be pulled from a live pricing source.
const PROVIDERS: Array<{
  key: string;
  provider: string;
  model: string;
  input: number;
  output: number;
  description: string;
  url?: string;
}> = [
  {
    key: 'llama-3.1-70b',
    provider: 'Meta Llama',
    model: 'Llama 3.1 70B',
    input: 2.8,
    output: 2.8,
    description: 'Keeps costs in check for private deployments.',
    url: 'https://ai.meta.com/llama/',
  },
  {
    key: 'mistral-large',
    provider: 'Mistral',
    model: 'Mistral Large 2',
    input: 2,
    output: 6,
    description: 'Reliable for multilingual or global programmes.',
    url: 'https://mistral.ai',
  },
  {
    key: 'claude-3.5-haiku',
    provider: 'Anthropic',
    model: 'Claude 3.5 Haiku',
    input: 3,
    output: 15,
    description: 'Fast summaries and triage at a low price point.',
    url: 'https://www.anthropic.com',
  },
  {
    key: 'gemini-2.5-ultra',
    provider: 'Google Gemini',
    model: 'Gemini 2.5 Ultra',
    input: 3.5,
    output: 10.5,
    description: 'Use when accuracy and tooling matter more than cost.',
    url: 'https://ai.google.dev',
  },
  {
    key: 'gpt-5',
    provider: 'OpenAI',
    model: 'GPT-5',
    input: 5,
    output: 15,
    description: 'Best for polished executive updates and launch moments.',
    url: 'https://openai.com',
  },
  {
    key: 'gpt-4o-mini',
    provider: 'OpenAI',
    model: 'GPT-4o Mini',
    input: 0.15,
    output: 0.6,
    description: 'Low-cost baseline for internal workflows.',
    url: 'https://openai.com',
  },
];

function formatPerMessage(n: number) {
  // Show very small numbers precisely.
  if (n < 0.0001) return `$${n.toFixed(6)} per message`;
  if (n < 0.01) return `$${n.toFixed(4)} per message`;
  return `$${n.toFixed(3)} per message`;
}

function estimateTokens(text: string) {
  // Naive: ~4 chars per token. Replace with a proper tokenizer later.
  return Math.ceil(text.length / 4);
}

export default function AICostOptimizerSection() {
  const [prompt, setPrompt] = useState('');
  const [expectedOutputTokens, setExpectedOutputTokens] = useState(150);
  const [outputTokenPreset, setOutputTokenPreset] = useState('short');

  // Presets for convenience.
  const presetMap: Record<string, number> = {
    short: 80,
    medium: 150,
    long: 300,
  };

  const inputTokens = useMemo(() => estimateTokens(prompt), [prompt]);
  const outputTokens = useMemo(() => {
    return presetMap[outputTokenPreset] ?? expectedOutputTokens;
  }, [outputTokenPreset, expectedOutputTokens]);

  const ranked = useMemo(() => {
    return PROVIDERS.map((p) => {
      const cost =
        (inputTokens / 1000) * p.input + (outputTokens / 1000) * p.output;
      return { ...p, cost };
    }).sort((a, b) => a.cost - b.cost);
  }, [inputTokens, outputTokens]);

  const best = ranked[0];
  const others = ranked.slice(1);

  return (
    <div className="space-y-10">
      {/* Prompt input section */}
      <div className="rounded-xl border border-border/50 bg-primary/5 p-6 sm:p-8">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Write or paste your real prompt here..."
          rows={6}
          className="mt-6 w-full rounded-xl border border-border bg-background/80 px-4 py-3 text-sm leading-relaxed shadow-sm focus:outline-none"
        />
        <div className="mt-3 text-center text-[11px] text-muted-foreground">
          Recommendations update instantly as you type.
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Reply length:
            </span>
            {Object.keys(presetMap).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setOutputTokenPreset(k)}
                className={`rounded-full border px-3 py-1 text-xs ${outputTokenPreset === k ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground'}`}
              >
                {k.charAt(0).toUpperCase() + k.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <label
              htmlFor="customOutput"
              className="text-xs font-medium text-muted-foreground"
            >
              Custom tokens
            </label>
            <input
              id="customOutput"
              type="number"
              min={0}
              placeholder={String(outputTokens)}
              value={outputTokenPreset === 'custom' ? expectedOutputTokens : ''}
              onChange={(e) => {
                setOutputTokenPreset('custom');
                setExpectedOutputTokens(parseInt(e.target.value || '0', 10));
              }}
              className="w-24 rounded-md border border-border bg-background px-2 py-1 text-xs"
            />
          </div>
          <div className="ml-auto text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Input:</span>{' '}
            {inputTokens} tokens ·{' '}
            <span className="font-medium text-foreground">Output:</span>{' '}
            {outputTokens} tokens
          </div>
        </div>
      </div>

      {/* Recommendation section */}
      <div className="rounded-xl border border-border/50 bg-background p-6 sm:p-8">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground text-center">
          Our recommended LLM(s)
        </h3>

        {best && (
          <div className="mt-8 rounded-2xl border border-border/60 bg-primary/5 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Best fit for you
            </p>
            <div className="mt-3 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">
                      {best.provider}
                    </h4>
                    <p className="mt-1 text-xs font-semibold text-red-600">
                      {formatPerMessage(best.cost)}
                    </p>
                  </div>
                  {best.url && (
                    <Link
                      href={best.url}
                      target="_blank"
                      rel="noopener"
                      className="rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-muted"
                    >
                      View provider
                    </Link>
                  )}
                </div>
                <div className="rounded-xl border border-border/40 bg-background/70 p-3 text-xs">
                  <p className="font-medium text-foreground">{best.model}</p>
                  <p className="mt-1 text-muted-foreground">
                    {best.description}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <h3 className="mt-8 text-sm font-semibold uppercase tracking-wide text-muted-foreground text-center">
          Also worth a look
        </h3>

        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {others.map((p) => (
            <div
              key={p.key}
              className="rounded-2xl border border-border/40 bg-primary/5 p-5"
            >
              <div className="mt-2 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">
                    {p.provider}
                  </h4>
                  <p className="mt-1 text-xs font-semibold text-red-600">
                    {formatPerMessage(p.cost)}
                  </p>
                </div>
                {p.url && (
                  <Link
                    href={p.url}
                    target="_blank"
                    rel="noopener"
                    className="rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-muted"
                  >
                    View provider
                  </Link>
                )}
              </div>
              <div className="mt-3 rounded-xl border border-border/40 bg-background/70 p-3 text-xs">
                <p className="font-medium text-foreground">{p.model}</p>
                <p className="mt-1 text-muted-foreground">{p.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-[11px] text-muted-foreground">
          Costs are illustrative estimates based on tokens × provider rates.
          Replace with actual monthly blended token counts for production
          planning.
        </div>
      </div>
    </div>
  );
}
