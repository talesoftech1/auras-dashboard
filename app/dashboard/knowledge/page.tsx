import { requireBot } from "@/lib/bot";
import { createClient } from "@/lib/supabase/server";
import type { DocumentRow, Faq } from "@/lib/types";
import { formatDistanceToNow } from "@/lib/format";
import { deleteDocument, saveFaq, deleteFaq } from "./actions";
import { UploadButton } from "./upload-button";

export default async function KnowledgePage() {
  const { bot } = await requireBot();
  const supabase = await createClient();

  const [docsRes, faqsRes] = await Promise.all([
    supabase
      .from("documents")
      .select("*")
      .eq("bot_id", bot.id)
      .order("uploaded_at", { ascending: false }),
    supabase
      .from("faqs")
      .select("*")
      .eq("bot_id", bot.id)
      .order("created_at", { ascending: false }),
  ]);
  const docs = (docsRes.data ?? []) as DocumentRow[];
  const faqs = (faqsRes.data ?? []) as Faq[];

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">Knowledge</h1>
        <p className="text-muted-foreground">
          Upload menus, price lists, FAQs. Auras re-trains your bot on every
          change.
        </p>
      </div>

      <section className="rounded-xl border bg-card shadow">
        <div className="flex items-center justify-between p-6">
          <div>
            <div className="font-semibold">Documents</div>
            <div className="text-sm text-muted-foreground">
              PDFs, Word docs, plain text, images.
            </div>
          </div>
          <UploadButton botId={bot.id} />
        </div>
        {docs.length > 0 && (
          <ul className="divide-y border-t text-sm">
            {docs.map((d) => (
              <li key={d.id} className="flex items-center justify-between p-4">
                <div>
                  <div className="font-medium">{d.file_name}</div>
                  <div className="text-xs text-muted-foreground">
                    Uploaded {formatDistanceToNow(d.uploaded_at)}
                    {d.extracted_text
                      ? ` · ${d.extracted_text.length.toLocaleString()} chars extracted`
                      : " · extracting..."}
                  </div>
                </div>
                <form action={deleteDocument}>
                  <input type="hidden" name="bot_id" value={bot.id} />
                  <input type="hidden" name="doc_id" value={d.id} />
                  <input
                    type="hidden"
                    name="storage_path"
                    value={d.storage_path}
                  />
                  <button
                    type="submit"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border bg-card shadow">
        <div className="p-6">
          <div className="font-semibold">FAQs</div>
          <div className="text-sm text-muted-foreground">
            Quick answers the bot can use directly.
          </div>
        </div>

        <form action={saveFaq} className="space-y-3 border-t p-6">
          <input type="hidden" name="bot_id" value={bot.id} />
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Question
            </label>
            <input
              name="question"
              placeholder="What areas do you service?"
              className="w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Answer
            </label>
            <textarea
              name="answer"
              rows={2}
              placeholder="KZN, including Umhlanga, Ballito, Durban North..."
              className="w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm"
              required
            />
          </div>
          <button
            type="submit"
            className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Add FAQ
          </button>
        </form>

        {faqs.length > 0 && (
          <ul className="divide-y border-t text-sm">
            {faqs.map((f) => (
              <li key={f.id} className="flex items-start justify-between gap-4 p-4">
                <div>
                  <div className="font-medium">{f.question}</div>
                  <div className="text-muted-foreground">{f.answer}</div>
                </div>
                <form action={deleteFaq}>
                  <input type="hidden" name="bot_id" value={bot.id} />
                  <input type="hidden" name="faq_id" value={f.id} />
                  <button
                    type="submit"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
