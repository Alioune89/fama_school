import { Constants } from "@/lib/supabase/database.types";

/** Moyens de paiement du guichet (le paiement en ligne passe par le fournisseur, Lot 4.4). */
export const COUNTER_METHODS = Constants.public.Enums.payment_method.filter((method) => method !== "online");
