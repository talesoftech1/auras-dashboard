import Link from "next/link";
import { requireBot } from "@/lib/bot";
import { createClient } from "@/lib/supabase/server";
import type { Conversation, Message } from "@/lib/types";
import { formatDistanceToNow } from "@/lib/format";

export default async function ConversationsPage({
  searchParams,
}: {
  searchParams: { id?: string };
}) {
  const { bot } = await requireBot();
  const supabase = await createClient();

  const { data: convoRows } = await supabase
    .from("conversations")
    .select("*")
    .eq("bot_id", bot.id)
    .order("last_message_at", { ascending: false })
    .limit(100);
  const conversations = (convoRows ?? []) as Conversation[];

  const selectedId = searchParams.id ?? conversations[0]?.id;
  const selected =
    conversations.find((c) => c.id === selectedId) ?? null;

  let messages: Message[] = [];
  if (selected) {
    const { data: msgRows } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", selected.id)
      .order("created_at", { ascending: true })
      .limit(200);
    messages = (msgRows ?? []) as Message[];
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Conversations</h1>
        <p className="text-muted-foreground">
          Every WhatsApp conversation your bot has handled.
        </p>
      </div>

      {conversations.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 md:grid-cols-[1fr_2fr]">
          <div className="rounded-xl border bg-card shadow">
            <div className="border-b p-4 text-sm font-medium">Recent</div>
            <ul className="divide-y text-sm">
              {conversations.map((c) => {
                const active = c.id === selectedId;
                return (
                  <li key={c.id}>
                    <Link
                      href={`/dashboard/conversations?id=${c.id}`}
                      className={`block p-4 ${active ? "bg-muted/40" : "hover:bg-muted/40"}`}
                    >
                      <div className="flex justify-between">
                        <span className="font-medium">
                          {c.user_name ?? c.user_phone}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(c.last_message_at)}
                        </span>
                      </div>
                      <div className="truncate text-muted-foreground">
                        {c.last_preview ?? "(no preview)"}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="rounded-xl border bg-card shadow">
            {selected ? (
              <Thread conversation={selected} messages={messages} />
            ) : (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Select a conversation on the left.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Thread({
  conversation,
  messages,
}: {
  conversation: Conversation;
  messages: Message[];
}) {
  return (
    <>
      <div className="flex items-center justify-between border-b p-4">
        <div>
          <div className="font-medium">
            {conversation.user_name ?? conversation.user_phone}
          </div>
          <div className="text-xs text-muted-foreground">
            Started {formatDistanceToNow(conversation.started_at)} ·{" "}
            {conversation.message_count} messages
          </div>
        </div>
      </div>
      <div className="space-y-3 p-4 text-sm">
        {messages.map((m) => (
          <Bubble key={m.id} message={m} />
        ))}
      </div>
    </>
  );
}

function Bubble({ message }: { message: Message }) {
  if (message.direction === "system") {
    return (
      <div className="text-center text-xs italic text-muted-foreground">
        {message.body}
      </div>
    );
  }
  const fromUser = message.direction === "user";
  return (
    <div className={`flex ${fromUser ? "justify-end" : ""}`}>
      <div
        className={`max-w-xs whitespace-pre-wrap rounded-lg px-3 py-2 ${
          fromUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
        }`}
      >
        {message.body}
        {message.direction === "bot" && message.fully_answered === false && (
          <div className="mt-1 text-xs italic opacity-70">
            flagged as unanswered
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border bg-card p-12 text-center">
      <h2 className="text-lg font-medium">No conversations yet</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Once a customer sends your bot a WhatsApp message with your trigger
        keyword, the conversation will show up here.
      </p>
    </div>
  );
}
