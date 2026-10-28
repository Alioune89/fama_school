"use client";

import { useEffect, useRef, useState } from "react";
import { SendHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { FormAlert } from "@/components/forms/form-alert";
import { useActionForm } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "@/i18n/navigation";
import { formatDate, formatTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { markConversationRead, sendMessage } from "../actions";
import type { ThreadMessage } from "../queries";

/**
 * Fil d'une conversation : bulles (les siennes à droite), réponse, nouveaux messages en temps réel.
 * La conversation est marquée lue à l'ouverture et à chaque message reçu.
 */
export function ThreadView({ conversationId, messages }: { conversationId: string; messages: ThreadMessage[] }) {
  const t = useTranslations("messages");
  const router = useRouter();
  const [body, setBody] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const form = useActionForm(sendMessage, { onSuccess: () => setBody("") });

  useEffect(() => {
    void markConversationRead(conversationId).then(() => router.refresh());
    const supabase = createClient();
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        () => {
          router.refresh();
          void markConversationRead(conversationId);
        },
      )
      .subscribe();
    return () => void supabase.removeChannel(channel);
  }, [conversationId, router]);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  return (
    <div className="flex flex-col gap-4">
      <ol className="space-y-3" aria-label={t("threadLabel")}>
        {messages.map((message, index) => {
          const day = message.createdAt.slice(0, 10);
          const newDay = index === 0 || messages[index - 1]!.createdAt.slice(0, 10) !== day;
          return (
            <li key={message.id}>
              {newDay && (
                <p className="my-2 text-center text-xs font-medium text-muted-foreground">
                  {formatDate(message.createdAt, { weekday: "long", day: "numeric", month: "long" })}
                </p>
              )}
              <div className={cn("flex", message.mine ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm sm:max-w-[70%]",
                    message.mine ? "rounded-br-md bg-azure-600 text-white" : "rounded-bl-md bg-white text-ink ring-1 ring-line",
                  )}
                >
                  {!message.mine && <p className="mb-0.5 text-xs font-semibold text-azure-700">{message.senderName}</p>}
                  <p className="whitespace-pre-line">{message.body}</p>
                  <p className={cn("mt-1 text-right text-[11px]", message.mine ? "text-white/80" : "text-muted-foreground")}>
                    {formatTime(message.createdAt)}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      <div ref={end} />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          form.run({ conversationId, body });
        }}
        className="sticky bottom-24 flex items-end gap-2 rounded-2xl bg-white p-2 shadow-lg ring-1 ring-line lg:bottom-4"
      >
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) event.currentTarget.form?.requestSubmit();
          }}
          rows={2}
          maxLength={2000}
          aria-label={t("reply")}
          placeholder={t("replyPlaceholder")}
          className="min-h-11 flex-1 resize-none border-0 shadow-none focus-visible:ring-0"
        />
        <Button type="submit" size="icon" disabled={form.pending || body.trim() === ""} aria-label={t("send")}>
          <SendHorizontal aria-hidden />
        </Button>
      </form>
      <FormAlert message={form.formError} />
    </div>
  );
}
