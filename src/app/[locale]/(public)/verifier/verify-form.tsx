import { Search } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Saisie d'un code de bulletin : formulaire classique, qui fonctionne même sans JavaScript. */
export async function VerifyForm({ defaultValue = "" }: { defaultValue?: string }) {
  const t = await getTranslations("verify");
  return (
    <form action="/verifier" method="get" className="flex flex-col gap-2 sm:flex-row">
      <label htmlFor="verify-code" className="sr-only">
        {t("codeLabel")}
      </label>
      <Input
        id="verify-code"
        name="code"
        required
        defaultValue={defaultValue}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        placeholder={t("codePlaceholder")}
        className="h-11 font-mono tracking-widest uppercase"
      />
      <button type="submit" className={cn(buttonVariants(), "h-11")}>
        <Search aria-hidden />
        {t("submit")}
      </button>
    </form>
  );
}
