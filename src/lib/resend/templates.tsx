import * as React from "react";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://orkestr.me";
const PRIMARY = "#0F2D4A";
const ACCENT = "#F97316";

// ============================================================
// BASE TEMPLATE
// ============================================================

function BaseTemplate({
  children,
  locale = "fr",
}: {
  children: React.ReactNode;
  locale?: "fr" | "en";
}) {
  return (
    <html lang={locale}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>ORKESTR</title>
      </head>
      <body
        style={{
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          backgroundColor: "#F8FAFC",
          margin: 0,
          padding: "40px 0",
        }}
      >
        <table width="100%" cellPadding="0" cellSpacing="0">
          <tbody>
            <tr>
              <td align="center">
                <table
                  width="600"
                  cellPadding="0"
                  cellSpacing="0"
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: "12px",
                    overflow: "hidden",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  }}
                >
                  {/* Header */}
                  <tbody>
                    <tr>
                      <td
                        style={{
                          backgroundColor: PRIMARY,
                          padding: "24px 40px",
                          textAlign: "center",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "Sora, Inter, sans-serif",
                            fontSize: "28px",
                            fontWeight: "700",
                            color: "#FFFFFF",
                            letterSpacing: "2px",
                          }}
                        >
                          ORKEST
                          <span style={{ color: ACCENT }}>R</span>
                        </span>
                      </td>
                    </tr>
                    {/* Content */}
                    <tr>
                      <td style={{ padding: "40px" }}>{children}</td>
                    </tr>
                    {/* Footer */}
                    <tr>
                      <td
                        style={{
                          backgroundColor: "#F8FAFC",
                          padding: "20px 40px",
                          textAlign: "center",
                          borderTop: "1px solid #E2E8F0",
                        }}
                      >
                        <p
                          style={{
                            margin: 0,
                            fontSize: "12px",
                            color: "#94A3B8",
                          }}
                        >
                          {locale === "fr"
                            ? "© 2025 ORKESTR — Tous droits réservés"
                            : "© 2025 ORKESTR — All rights reserved"}
                          <br />
                          <a
                            href={APP_URL}
                            style={{ color: "#94A3B8", textDecoration: "underline" }}
                          >
                            orkestr.me
                          </a>
                        </p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}

function Button({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      style={{
        display: "inline-block",
        backgroundColor: ACCENT,
        color: "#FFFFFF",
        padding: "14px 32px",
        borderRadius: "8px",
        textDecoration: "none",
        fontWeight: "600",
        fontSize: "16px",
        marginTop: "24px",
      }}
    >
      {children}
    </a>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h1
      style={{
        fontFamily: "Sora, Inter, sans-serif",
        fontSize: "24px",
        fontWeight: "700",
        color: PRIMARY,
        margin: "0 0 16px 0",
      }}
    >
      {children}
    </h1>
  );
}

function Text({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: "16px",
        color: "#475569",
        lineHeight: "1.6",
        margin: "0 0 12px 0",
      }}
    >
      {children}
    </p>
  );
}

// ============================================================
// TEMPLATES EMAILS
// ============================================================

export function WelcomeEmail({
  firstName,
  locale = "fr",
}: {
  firstName?: string;
  locale?: "fr" | "en";
}) {
  const name = firstName || (locale === "fr" ? "vous" : "you");
  return (
    <BaseTemplate locale={locale}>
      <Heading>{locale === "fr" ? `Bienvenue sur ORKESTR, ${name} !` : `Welcome to ORKESTR, ${name}!`}</Heading>
      <Text>
        {locale === "fr"
          ? "Votre compte a été créé avec succès. ORKESTR vous permet de gérer vos hackathons, bootcamps et programmes d'accompagnement de bout en bout."
          : "Your account has been successfully created. ORKESTR lets you manage your hackathons, bootcamps, and support programs end to end."}
      </Text>
      <Text>
        {locale === "fr"
          ? "Commencez par créer votre premier espace de travail."
          : "Start by creating your first workspace."}
      </Text>
      <div style={{ textAlign: "center" }}>
        <Button href={`${APP_URL}/${locale}/spaces`}>
          {locale === "fr" ? "Accéder à la plateforme" : "Go to the platform"}
        </Button>
      </div>
    </BaseTemplate>
  );
}

export function ParticipantInviteEmail({
  firstName,
  eventName,
  organizerName,
  inviteUrl,
  locale = "fr",
}: {
  firstName?: string;
  eventName: string;
  organizerName: string;
  inviteUrl: string;
  locale?: "fr" | "en";
}) {
  const name = firstName || (locale === "fr" ? "vous" : "you");
  return (
    <BaseTemplate locale={locale}>
      <Heading>
        {locale === "fr" ? `Vous êtes invité(e) à rejoindre ${eventName}` : `You're invited to join ${eventName}`}
      </Heading>
      <Text>
        {locale === "fr"
          ? `Bonjour ${name}, ${organizerName} vous invite à participer à ${eventName} sur ORKESTR.`
          : `Hello ${name}, ${organizerName} is inviting you to participate in ${eventName} on ORKESTR.`}
      </Text>
      <Text>
        {locale === "fr"
          ? "Cliquez sur le bouton ci-dessous pour accepter l'invitation et accéder à votre espace participant."
          : "Click the button below to accept the invitation and access your participant space."}
      </Text>
      <div style={{ textAlign: "center" }}>
        <Button href={inviteUrl}>
          {locale === "fr" ? "Accepter l'invitation" : "Accept the invitation"}
        </Button>
      </div>
      <Text style={{ fontSize: "12px", color: "#94A3B8", marginTop: "24px" } as React.CSSProperties}>
        {locale === "fr"
          ? "Ce lien expire dans 7 jours. Si vous n'êtes pas concerné(e), ignorez cet email."
          : "This link expires in 7 days. If this doesn't concern you, please ignore this email."}
      </Text>
    </BaseTemplate>
  );
}

export function JuryInviteEmail({
  firstName,
  eventName,
  organizerName,
  inviteUrl,
  locale = "fr",
}: {
  firstName?: string;
  eventName: string;
  organizerName: string;
  inviteUrl: string;
  locale?: "fr" | "en";
}) {
  const name = firstName || (locale === "fr" ? "vous" : "you");
  return (
    <BaseTemplate locale={locale}>
      <Heading>
        {locale === "fr"
          ? `Invitation en tant que juré — ${eventName}`
          : `Jury invitation — ${eventName}`}
      </Heading>
      <Text>
        {locale === "fr"
          ? `Bonjour ${name}, ${organizerName} vous invite à faire partie du jury de ${eventName}.`
          : `Hello ${name}, ${organizerName} is inviting you to be a jury member for ${eventName}.`}
      </Text>
      <Text>
        {locale === "fr"
          ? "En tant que juré, vous aurez accès à la grille de notation et pourrez évaluer les équipes participantes."
          : "As a jury member, you'll have access to the scoring grid and will be able to evaluate participating teams."}
      </Text>
      <div style={{ textAlign: "center" }}>
        <Button href={inviteUrl}>
          {locale === "fr" ? "Accepter et accéder à la notation" : "Accept and access scoring"}
        </Button>
      </div>
    </BaseTemplate>
  );
}

export function SpaceMemberInviteEmail({
  firstName,
  spaceName,
  role,
  inviteUrl,
  locale = "fr",
}: {
  firstName?: string;
  spaceName: string;
  role: string;
  inviteUrl: string;
  locale?: "fr" | "en";
}) {
  const name = firstName || (locale === "fr" ? "vous" : "you");
  const roleLabel =
    role === "space_manager"
      ? locale === "fr"
        ? "gestionnaire"
        : "manager"
      : locale === "fr"
        ? "collaborateur"
        : "collaborator";
  return (
    <BaseTemplate locale={locale}>
      <Heading>
        {locale === "fr"
          ? `Invitation à rejoindre l'espace ${spaceName}`
          : `Invitation to join the ${spaceName} space`}
      </Heading>
      <Text>
        {locale === "fr"
          ? `Bonjour ${name}, vous avez été invité(e) comme ${roleLabel} dans l'espace ${spaceName} sur ORKESTR.`
          : `Hello ${name}, you have been invited as ${roleLabel} in the ${spaceName} space on ORKESTR.`}
      </Text>
      <div style={{ textAlign: "center" }}>
        <Button href={inviteUrl}>
          {locale === "fr" ? "Rejoindre l'espace" : "Join the space"}
        </Button>
      </div>
    </BaseTemplate>
  );
}

export function MilestoneReminderEmail({
  firstName,
  milestoneName,
  eventName,
  closeAt,
  dashboardUrl,
  locale = "fr",
}: {
  firstName?: string;
  milestoneName: string;
  eventName: string;
  closeAt: string;
  dashboardUrl: string;
  locale?: "fr" | "en";
}) {
  const name = firstName || (locale === "fr" ? "vous" : "you");
  return (
    <BaseTemplate locale={locale}>
      <Heading>
        {locale === "fr"
          ? `Rappel : Jalon "${milestoneName}" — 48h restantes`
          : `Reminder: Milestone "${milestoneName}" — 48h left`}
      </Heading>
      <Text>
        {locale === "fr"
          ? `Bonjour ${name}, le jalon "${milestoneName}" de ${eventName} se ferme dans 48 heures.`
          : `Hello ${name}, the milestone "${milestoneName}" for ${eventName} closes in 48 hours.`}
      </Text>
      <div
        style={{
          backgroundColor: "#FFF4EC",
          border: `1px solid ${ACCENT}`,
          borderRadius: "8px",
          padding: "16px",
          margin: "16px 0",
        }}
      >
        <strong style={{ color: ACCENT }}>
          {locale === "fr" ? "Date limite : " : "Deadline: "}
        </strong>
        <span style={{ color: "#475569" }}>{closeAt}</span>
      </div>
      <Text>
        {locale === "fr"
          ? "Si vous n'avez pas encore soumis votre travail, ne tardez pas !"
          : "If you haven't submitted your work yet, don't wait!"}
      </Text>
      <div style={{ textAlign: "center" }}>
        <Button href={dashboardUrl}>
          {locale === "fr" ? "Soumettre maintenant" : "Submit now"}
        </Button>
      </div>
    </BaseTemplate>
  );
}

export function MilestoneOverdueEmail({
  firstName,
  milestoneName,
  eventName,
  dashboardUrl,
  locale = "fr",
}: {
  firstName?: string;
  milestoneName: string;
  eventName: string;
  dashboardUrl: string;
  locale?: "fr" | "en";
}) {
  const name = firstName || (locale === "fr" ? "vous" : "you");
  return (
    <BaseTemplate locale={locale}>
      <Heading>
        {locale === "fr"
          ? `Soumission manquante — "${milestoneName}"`
          : `Missing submission — "${milestoneName}"`}
      </Heading>
      <Text>
        {locale === "fr"
          ? `Bonjour ${name}, nous n'avons pas reçu votre soumission pour le jalon "${milestoneName}" de ${eventName}.`
          : `Hello ${name}, we haven't received your submission for the "${milestoneName}" milestone of ${eventName}.`}
      </Text>
      <Text>
        {locale === "fr"
          ? "Contactez votre organisateur si vous pensez qu'il s'agit d'une erreur."
          : "Contact your organizer if you believe this is an error."}
      </Text>
      <div style={{ textAlign: "center" }}>
        <Button href={dashboardUrl}>
          {locale === "fr" ? "Accéder à mon espace" : "Access my space"}
        </Button>
      </div>
    </BaseTemplate>
  );
}

export function ResultsEmail({
  firstName,
  eventName,
  teamName,
  rank,
  score,
  dashboardUrl,
  locale = "fr",
}: {
  firstName?: string;
  eventName: string;
  teamName?: string;
  rank?: number;
  score?: number;
  dashboardUrl: string;
  locale?: "fr" | "en";
}) {
  const name = firstName || (locale === "fr" ? "vous" : "you");
  return (
    <BaseTemplate locale={locale}>
      <Heading>
        {locale === "fr"
          ? `Résultats disponibles — ${eventName}`
          : `Results available — ${eventName}`}
      </Heading>
      <Text>
        {locale === "fr"
          ? `Bonjour ${name}, les résultats de ${eventName} sont maintenant disponibles !`
          : `Hello ${name}, the results of ${eventName} are now available!`}
      </Text>
      {teamName && rank && score && (
        <div
          style={{
            backgroundColor: "#F0FDF4",
            border: "1px solid #10B981",
            borderRadius: "8px",
            padding: "20px",
            margin: "16px 0",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "14px", color: "#475569" }}>
            {locale === "fr" ? "Équipe" : "Team"}
          </div>
          <div style={{ fontSize: "20px", fontWeight: "700", color: PRIMARY }}>{teamName}</div>
          <div style={{ display: "flex", justifyContent: "space-around", marginTop: "12px" }}>
            <div>
              <div style={{ fontSize: "12px", color: "#94A3B8" }}>
                {locale === "fr" ? "Classement" : "Ranking"}
              </div>
              <div style={{ fontSize: "32px", fontWeight: "700", color: ACCENT }}>#{rank}</div>
            </div>
            <div>
              <div style={{ fontSize: "12px", color: "#94A3B8" }}>Score</div>
              <div style={{ fontSize: "32px", fontWeight: "700", color: PRIMARY }}>
                {score.toFixed(1)}
              </div>
            </div>
          </div>
        </div>
      )}
      <div style={{ textAlign: "center" }}>
        <Button href={dashboardUrl}>
          {locale === "fr" ? "Voir le classement complet" : "View full ranking"}
        </Button>
      </div>
    </BaseTemplate>
  );
}
