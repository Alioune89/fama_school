import { expect, test } from "@playwright/test";
import { adminClient, DEMO, loginWithPhone } from "./helpers";

test.describe("Notifications", () => {
  test("le parent est prévenu d'un signalement par la cloche, puis choisit ses canaux", async ({ page }) => {
    test.setTimeout(90_000);
    const admin = adminClient();
    // Un signalement pour Mariama Sow (le parcours de l'enseignante est couvert par reports.spec.ts).
    const { data: student } = await admin
      .from("students")
      .select("id, school_id, enrollments(class_id)")
      .eq("first_name", "Mariama")
      .eq("last_name", "Sow")
      .single();
    // Point de départ connu : tout est lu chez Fatou Sow, puis deux signalements arrivent.
    const { data: parent } = await admin.from("profiles").select("id").eq("phone", "+221770000001").maybeSingle();
    if (parent) await admin.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", parent.id);
    const reportIds = [crypto.randomUUID(), crypto.randomUUID()];
    const message = `Oubli de cahier (test ${Date.now().toString(36)})`;
    for (const [index, id] of reportIds.entries()) {
      await admin.from("student_reports").insert({
        id,
        school_id: student!.school_id,
        student_id: student!.id,
        class_id: student!.enrollments[0]!.class_id,
        category: index === 0 ? "behavior" : "equipment",
        message: index === 0 ? `Bavardages (test ${Date.now().toString(36)})` : message,
        occurred_at: new Date(Date.now() + index * 1000).toISOString(),
        author_name: "Awa Diop",
      });
    }

    try {
      await loginWithPhone(page, DEMO.parentPhone);
      await expect(page).toHaveURL(/\/parent$/);

      // La cloche annonce la notification ; l'ouvrir mène à la fiche de Mariama et la marque comme lue.
      const bell = page.getByRole("button", { name: /^Notifications : \d+ non lues?$/ });
      await expect(bell).toBeVisible();
      await bell.click();
      const item = page.getByRole("menuitem", { name: /Signalement pour Mariama : Matériel oublié/ }).first();
      await expect(item).toContainText("Par Awa Diop");
      await item.click();
      await expect(page).toHaveURL(/\/parent\/enfants\/[0-9a-f-]{36}$/);
      await expect(page.getByText(message)).toBeVisible();

      // Il reste une notification : « Tout marquer comme lu » fait disparaître la pastille.
      // Il en reste au moins une (le second signalement) : « Tout marquer comme lu » vide la pastille.
      await page.getByRole("button", { name: /^Notifications : \d+ non lues?$/ }).click();
      await page.getByRole("menuitem", { name: "Tout marquer comme lu" }).click();
      await expect(page.getByRole("button", { name: "Notifications", exact: true })).toBeVisible();

      // En temps réel : un signalement arrive pendant que la page est ouverte, la cloche s'allume sans recharger.
      const liveId = crypto.randomUUID();
      reportIds.push(liveId);
      await admin.from("student_reports").insert({
        id: liveId,
        school_id: student!.school_id,
        student_id: student!.id,
        class_id: student!.enrollments[0]!.class_id,
        category: "health",
        message: `Fièvre (test ${Date.now().toString(36)})`,
        occurred_at: new Date().toISOString(),
        author_name: "Awa Diop",
      });
      await expect(page.getByText("Nouvelle notification")).toBeVisible({ timeout: 15_000 });
      await expect(page.getByRole("button", { name: "Notifications : 1 non lue" })).toBeVisible();

      // Profil : canaux de notification.
      await page.goto("/parent/profil");
      const whatsapp = page.getByRole("switch", { name: "WhatsApp" });
      await expect(async () => {
        await whatsapp.click();
        await expect(whatsapp).toBeChecked({ timeout: 1500 });
      }).toPass();
      await page.getByRole("button", { name: "Enregistrer mes notifications" }).click();
      await expect(page.getByText("Vos choix de notification sont enregistrés.")).toBeVisible();
      await page.reload();
      await expect(whatsapp).toBeChecked();
      await whatsapp.click();
      await page.getByRole("button", { name: "Enregistrer mes notifications" }).click();
      await expect(page.getByText("Vos choix de notification sont enregistrés.")).toBeVisible();
    } finally {
      for (const id of reportIds) {
        await admin.from("notifications").delete().eq("dedupe_key", `report:${id}`);
        await admin.from("student_reports").delete().eq("id", id);
      }
    }
  });
});

test.describe("Notifications par SMS et WhatsApp", () => {
  test("un parent qui a choisi SMS et WhatsApp reçoit le signalement par ces deux canaux", async ({ page }) => {
    test.setTimeout(90_000);
    const admin = adminClient();
    const { data: student } = await admin
      .from("students")
      .select("id, school_id, enrollments(class_id)")
      .eq("first_name", "Mariama")
      .eq("last_name", "Sow")
      .single();
    await loginWithPhone(page, DEMO.parentPhone);
    await expect(page).toHaveURL(/\/parent$/);
    const { data: parent } = await admin.from("profiles").select("id").eq("phone", "+221770000001").single();
    await admin.from("notification_settings").upsert({ user_id: parent!.id, push: true, sms: true, whatsapp: true });
    const reportId = crypto.randomUUID();
    try {
      await admin.from("student_reports").insert({
        id: reportId,
        school_id: student!.school_id,
        student_id: student!.id,
        class_id: student!.enrollments[0]!.class_id,
        category: "homework",
        message: `Devoir non fait (test ${Date.now().toString(36)})`,
        occurred_at: new Date().toISOString(),
        author_name: "Awa Diop",
      });
      // Les envois partent après l'affichage d'une page (fournisseur de démonstration en local et en CI).
      const { data: notification } = await admin
        .from("notifications")
        .select("id")
        .eq("dedupe_key", `report:${reportId}`)
        .single();
      await expect(async () => {
        await page.reload();
        const { data } = await admin
          .from("notification_deliveries")
          .select("channel, status, provider_id")
          .eq("notification_id", notification!.id)
          .order("channel");
        expect(data?.map((row) => `${row.channel}:${row.status}`)).toEqual(["sms:sent", "whatsapp:sent"]);
        expect(data?.every((row) => row.provider_id?.startsWith("LOG-"))).toBe(true);
      }).toPass({ timeout: 45_000, intervals: [3_000] });
    } finally {
      await admin.from("notification_settings").upsert({ user_id: parent!.id, push: true, sms: false, whatsapp: false });
      await admin.from("notifications").delete().eq("dedupe_key", `report:${reportId}`);
      await admin.from("student_reports").delete().eq("id", reportId);
    }
  });
});
