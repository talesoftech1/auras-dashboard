import { requireBot } from "@/lib/bot";
import { SubmitButton } from "@/components/submit-button";
import { formatDistanceToNow } from "@/lib/format";
import {
  updateBusinessDetails,
  updateSystemPrompt,
  rebuildFromKnowledge,
  refreshWebsiteKnowledge,
} from "./actions";

export default async function SettingsPage() {
  const { bot } = await requireBot();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Settings</h1>
        <p className="text-muted-foreground">
          Business details and the system prompt that powers your bot.
        </p>
      </div>

      <form action={updateBusinessDetails} className="rounded-xl border bg-card shadow">
        <input type="hidden" name="bot_id" value={bot.id} />
        <div className="flex flex-col space-y-1.5 p-6">
          <div className="font-semibold tracking-tight">Business</div>
          <div className="text-sm text-muted-foreground">
            Updating these rebuilds the bot&apos;s system prompt automatically.
          </div>
        </div>
        <div className="space-y-4 p-6 pt-0 text-sm">
          <Field
            id="company_name"
            label="Business name"
            defaultValue={bot.company_name ?? ""}
          />
          <Field
            id="contact_email"
            label="Contact email"
            type="email"
            defaultValue={bot.contact_email ?? ""}
          />
          <Field
            id="contact_phone"
            label="Contact phone"
            defaultValue={bot.contact_phone ?? ""}
          />
          <div className="flex items-baseline justify-between border-t pt-4 text-xs text-muted-foreground">
            <span>Trigger keyword: <span className="font-mono">{bot.trigger_keyword}</span></span>
            <span>Status: <span className="font-medium capitalize">{bot.status}</span></span>
          </div>
          <SubmitButton
            pendingText="Saving..."
            className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Save business details
          </SubmitButton>
        </div>
      </form>

      <section className="rounded-xl border bg-card shadow">
        <div className="flex flex-col space-y-1.5 p-6">
          <div className="font-semibold tracking-tight">Website knowledge</div>
          <div className="text-sm text-muted-foreground">
            We re-scrape your site and rebuild the bot&apos;s knowledge base.
            Your FAQs and uploaded documents are kept as-is.
          </div>
        </div>
        <div className="space-y-3 p-6 pt-0 text-sm">
          <form action={refreshWebsiteKnowledge} className="space-y-3">
            <input type="hidden" name="bot_id" value={bot.id} />
            <Field
              id="website_url"
              label="Website URL"
              type="url"
              defaultValue={bot.website_url ?? ""}
            />
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                {bot.raw_scrape_updated_at
                  ? `Last refreshed ${formatDistanceToNow(bot.raw_scrape_updated_at)}`
                  : bot.raw_scrape
                    ? "Refreshed (timestamp unavailable)"
                    : "Not yet scraped"}
              </p>
              <SubmitButton
                pendingText="Starting..."
                className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Refresh website knowledge
              </SubmitButton>
            </div>
            <p className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
              Scraping and recomposing usually takes 60-90 seconds. Refresh this
              page after a minute to see the updated prompt.
            </p>
          </form>
        </div>
      </section>

      <section className="rounded-xl border bg-card shadow">
        <div className="flex flex-col space-y-1.5 p-6">
          <div className="font-semibold tracking-tight">System prompt</div>
          <div className="text-sm text-muted-foreground">
            The instructions your bot uses to answer customers. Editing this
            locks it — documents and FAQs you add later won&apos;t rebuild it
            automatically until you click &ldquo;Rebuild from knowledge&rdquo;.
          </div>
          {bot.system_prompt_source === "manual" && (
            <div className="mt-1 inline-flex w-fit items-center rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">
              Manually edited
            </div>
          )}
        </div>
        <div className="space-y-3 p-6 pt-0">
          <form action={updateSystemPrompt} className="space-y-3">
            <input type="hidden" name="bot_id" value={bot.id} />
            <textarea
              name="system_prompt"
              rows={16}
              defaultValue={bot.system_prompt ?? ""}
              className="w-full rounded-md border bg-muted p-4 font-mono text-xs shadow-sm"
            />
            <div className="flex items-center gap-2">
              <SubmitButton
                pendingText="Saving..."
                className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Save prompt
              </SubmitButton>
            </div>
          </form>
          <form action={rebuildFromKnowledge}>
            <input type="hidden" name="bot_id" value={bot.id} />
            <SubmitButton
              pendingText="Rebuilding..."
              className="h-9 rounded-md border px-4 text-sm hover:bg-muted"
            >
              Rebuild from knowledge
            </SubmitButton>
          </form>
        </div>
      </section>
    </div>
  );
}

function Field({
  id,
  label,
  defaultValue,
  type = "text",
}: {
  id: string;
  label: string;
  defaultValue: string;
  type?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        defaultValue={defaultValue}
        className="w-full rounded-md border bg-transparent px-3 py-2 shadow-sm"
      />
    </div>
  );
}
