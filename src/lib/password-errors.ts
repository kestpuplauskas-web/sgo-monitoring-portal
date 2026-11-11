export type PasswordFailure = "weak" | "same" | "expired" | "rate-limit" | "unknown";

type PasswordAuthError = { code?: string | undefined; message?: string | undefined; status?: number | undefined };

export function classifyPasswordError(error: PasswordAuthError): PasswordFailure {
  const message = error.message?.toLowerCase() ?? "";
  if (error.code === "weak_password" || message.includes("weak and easy to guess")) return "weak";
  if (error.code === "same_password") return "same";
  if (["session_not_found", "session_expired", "refresh_token_not_found", "refresh_token_already_used", "bad_jwt", "otp_expired"].includes(error.code ?? "") || error.status === 401 || error.status === 403) return "expired";
  if (error.status === 429 || error.code === "over_request_rate_limit") return "rate-limit";
  return "unknown";
}

export function passwordErrorMessage(error: PasswordAuthError): string {
  const messages: Record<PasswordFailure, string> = {
    weak: "Šis slaptažodis yra per silpnas arba žinomas kaip nesaugus. Pasirinkite kitą, ilgesnį ir unikalų slaptažodį. Naujos kvietimo nuorodos nereikia.",
    same: "Naujas slaptažodis turi skirtis nuo dabartinio. Įveskite kitą slaptažodį.",
    expired: "Jūsų sesija arba kvietimo nuoroda nebegalioja. Paprašykite naujos slaptažodžio nustatymo nuorodos.",
    "rate-limit": "Per daug bandymų. Palaukite minutę ir bandykite dar kartą.",
    unknown: "Nepavyko išsaugoti slaptažodžio. Patikrinkite interneto ryšį ir bandykite dar kartą.",
  };
  return messages[classifyPasswordError(error)];
}