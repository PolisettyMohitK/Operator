export const clerkAppearance = {
  variables: {
    colorPrimary: "#183b4e",
    colorText: "#12202a",
    colorBackground: "#fbf8f2",
    colorInputBackground: "#ffffff",
    colorInputText: "#12202a",
    colorDanger: "#8c2f2f",
    borderRadius: "18px",
    fontFamily: "var(--font-body-sans)",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "w-full shadow-none",
    card:
      "w-full border-none bg-transparent p-0 shadow-none ring-0 sm:p-0 sm:shadow-none",
    headerTitle: "hidden",
    headerSubtitle: "hidden",
    socialButtonsBlockButton:
      "rounded-[18px] border border-[color:var(--border)] bg-white text-[color:var(--foreground)] shadow-none hover:bg-[color:var(--surface-muted)]",
    socialButtonsBlockButtonText: "font-medium",
    dividerLine: "bg-[color:var(--border)]",
    dividerText: "text-xs uppercase tracking-[0.22em] text-[color:var(--muted-foreground)]",
    formFieldLabel:
      "text-sm font-medium text-[color:var(--foreground)]",
    formFieldInput:
      "h-12 rounded-[18px] border border-[color:var(--border)] bg-white text-[color:var(--foreground)] shadow-none focus:border-[color:var(--accent)] focus:ring-0",
    formButtonPrimary:
      "h-12 rounded-full bg-[color:var(--accent)] text-[color:var(--accent-foreground)] shadow-none hover:bg-[#204b63]",
    footerActionText: "text-[color:var(--muted-foreground)]",
    footerActionLink: "font-semibold text-[color:var(--accent)] hover:text-[#204b63]",
    identityPreviewText: "text-[color:var(--muted-foreground)]",
    formFieldSuccessText: "text-[color:var(--accent)]",
    formFieldWarningText: "text-[#8c2f2f]",
    alertText: "text-sm",
    otpCodeFieldInput:
      "rounded-[18px] border border-[color:var(--border)] bg-white text-[color:var(--foreground)] shadow-none",
  },
} as const;
