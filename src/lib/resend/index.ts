import { Resend } from "resend";
import * as React from "react";
import {
  WelcomeEmail,
  ParticipantInviteEmail,
  JuryInviteEmail,
  SpaceMemberInviteEmail,
  MilestoneReminderEmail,
  MilestoneOverdueEmail,
  ResultsEmail,
} from "./templates";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "ORKESTR <noreply@orkestr.me>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://orkestr.me";

type EmailResult = { success: boolean; error?: string };

async function sendEmail(to: string, subject: string, react: React.ReactElement): Promise<EmailResult> {
  try {
    const { error } = await resend.emails.send({ from: FROM, to, subject, react });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function sendWelcomeEmail(
  email: string,
  firstName: string | null | undefined,
  locale: "fr" | "en" = "fr"
): Promise<EmailResult> {
  const subject = locale === "fr" ? "Bienvenue sur ORKESTR !" : "Welcome to ORKESTR!";
  return sendEmail(email, subject, React.createElement(WelcomeEmail, { firstName: firstName ?? undefined, locale }));
}

export async function sendParticipantInviteEmail(params: {
  email: string;
  firstName?: string | null;
  eventName: string;
  organizerName: string;
  inviteToken: string;
  locale?: "fr" | "en";
}): Promise<EmailResult> {
  const { email, firstName, eventName, organizerName, inviteToken, locale = "fr" } = params;
  const inviteUrl = `${APP_URL}/${locale}/invite/${inviteToken}`;
  const subject =
    locale === "fr"
      ? `Invitation à participer à ${eventName}`
      : `Invitation to participate in ${eventName}`;
  return sendEmail(
    email,
    subject,
    React.createElement(ParticipantInviteEmail, {
      firstName: firstName ?? undefined,
      eventName,
      organizerName,
      inviteUrl,
      locale,
    })
  );
}

export async function sendJuryInviteEmail(params: {
  email: string;
  firstName?: string | null;
  eventName: string;
  organizerName: string;
  inviteToken: string;
  locale?: "fr" | "en";
}): Promise<EmailResult> {
  const { email, firstName, eventName, organizerName, inviteToken, locale = "fr" } = params;
  const inviteUrl = `${APP_URL}/${locale}/invite/${inviteToken}?role=jury`;
  const subject =
    locale === "fr"
      ? `Invitation jury — ${eventName}`
      : `Jury invitation — ${eventName}`;
  return sendEmail(
    email,
    subject,
    React.createElement(JuryInviteEmail, {
      firstName: firstName ?? undefined,
      eventName,
      organizerName,
      inviteUrl,
      locale,
    })
  );
}

export async function sendSpaceMemberInviteEmail(params: {
  email: string;
  firstName?: string | null;
  spaceName: string;
  role: string;
  inviteToken: string;
  locale?: "fr" | "en";
}): Promise<EmailResult> {
  const { email, firstName, spaceName, role, inviteToken, locale = "fr" } = params;
  const inviteUrl = `${APP_URL}/${locale}/invite/${inviteToken}?type=space`;
  const subject =
    locale === "fr"
      ? `Invitation à rejoindre ${spaceName}`
      : `Invitation to join ${spaceName}`;
  return sendEmail(
    email,
    subject,
    React.createElement(SpaceMemberInviteEmail, {
      firstName: firstName ?? undefined,
      spaceName,
      role,
      inviteUrl,
      locale,
    })
  );
}

export async function sendMilestoneReminderEmail(params: {
  email: string;
  firstName?: string | null;
  milestoneName: string;
  eventName: string;
  closeAt: string;
  eventId: string;
  locale?: "fr" | "en";
}): Promise<EmailResult> {
  const { email, firstName, milestoneName, eventName, closeAt, eventId, locale = "fr" } = params;
  const dashboardUrl = `${APP_URL}/${locale}/my-events/${eventId}`;
  const subject =
    locale === "fr"
      ? `Rappel : ${milestoneName} — délai dans 48h`
      : `Reminder: ${milestoneName} — deadline in 48h`;
  return sendEmail(
    email,
    subject,
    React.createElement(MilestoneReminderEmail, {
      firstName: firstName ?? undefined,
      milestoneName,
      eventName,
      closeAt,
      dashboardUrl,
      locale,
    })
  );
}

export async function sendMilestoneOverdueEmail(params: {
  email: string;
  firstName?: string | null;
  milestoneName: string;
  eventName: string;
  eventId: string;
  locale?: "fr" | "en";
}): Promise<EmailResult> {
  const { email, firstName, milestoneName, eventName, eventId, locale = "fr" } = params;
  const dashboardUrl = `${APP_URL}/${locale}/my-events/${eventId}`;
  const subject =
    locale === "fr"
      ? `Soumission manquante : ${milestoneName}`
      : `Missing submission: ${milestoneName}`;
  return sendEmail(
    email,
    subject,
    React.createElement(MilestoneOverdueEmail, {
      firstName: firstName ?? undefined,
      milestoneName,
      eventName,
      dashboardUrl,
      locale,
    })
  );
}

export async function sendResultsEmail(params: {
  email: string;
  firstName?: string | null;
  eventName: string;
  eventId: string;
  teamName?: string;
  rank?: number;
  score?: number;
  locale?: "fr" | "en";
}): Promise<EmailResult> {
  const { email, firstName, eventName, eventId, teamName, rank, score, locale = "fr" } = params;
  const dashboardUrl = `${APP_URL}/${locale}/my-events/${eventId}`;
  const subject =
    locale === "fr"
      ? `Résultats de ${eventName} disponibles !`
      : `${eventName} results are available!`;
  return sendEmail(
    email,
    subject,
    React.createElement(ResultsEmail, {
      firstName: firstName ?? undefined,
      eventName,
      teamName,
      rank,
      score,
      dashboardUrl,
      locale,
    })
  );
}
