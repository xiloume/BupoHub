import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { env, features } from "@/lib/env";

type MailInput = { to: string; subject: string; text: string; html?: string };

let transporter: Transporter | null = null;

function getTransporter() {
  if (!features.mail) return null;
  transporter ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
  });
  return transporter;
}

/**
 * Envoie un email. Si SMTP n'est pas configuré, le contenu est loggé en console
 * (pratique en développement : le lien de réinitialisation apparaît dans le terminal).
 */
export async function sendMail(input: MailInput): Promise<{ delivered: boolean }> {
  const t = getTransporter();
  if (!t) {
    console.info(
      `\n[mail:console] → ${input.to}\nSujet : ${input.subject}\n${input.text}\n`,
    );
    return { delivered: false };
  }
  await t.sendMail({ from: env.MAIL_FROM, ...input });
  return { delivered: true };
}

function layout(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#0b0b10;font-family:Inter,Arial,sans-serif;color:#e7e7ea">
<div style="max-width:520px;margin:0 auto;padding:40px 24px">
  <div style="font-size:20px;font-weight:700;margin-bottom:24px"><span style="color:#f59e0b">Bupo</span>Hub</div>
  <div style="background:#15151d;border:1px solid #24242f;border-radius:16px;padding:28px">
    <h1 style="font-size:20px;margin:0 0 16px">${title}</h1>
    ${body}
  </div>
  <p style="color:#777;font-size:12px;margin-top:24px">Vous recevez cet email car une action a été demandée sur votre compte ${env.APP_NAME}.</p>
</div></body></html>`;
}

function button(href: string, label: string) {
  return `<p style="margin:24px 0"><a href="${href}" style="display:inline-block;background:#f59e0b;color:#111;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:10px">${label}</a></p>
<p style="font-size:12px;color:#999;word-break:break-all">${href}</p>`;
}

export const mailTemplates = {
  passwordReset(to: string, link: string) {
    return sendMail({
      to,
      subject: `${env.APP_NAME} — Réinitialisation de votre mot de passe`,
      text: `Pour réinitialiser votre mot de passe, ouvrez ce lien (valable 1 heure) :\n${link}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet email.`,
      html: layout(
        "Réinitialiser votre mot de passe",
        `<p>Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe. Ce lien est valable 1 heure.</p>${button(link, "Réinitialiser mon mot de passe")}<p style="color:#999;font-size:13px">Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email.</p>`,
      ),
    });
  },
  invitation(to: string, link: string, inviter: string) {
    return sendMail({
      to,
      subject: `${env.APP_NAME} — Vous êtes invité·e`,
      text: `${inviter} vous invite à rejoindre ${env.APP_NAME}. Créez votre compte ici :\n${link}`,
      html: layout(
        `Bienvenue sur ${env.APP_NAME}`,
        `<p><strong>${inviter}</strong> vous invite à rejoindre l'écosystème Bupo.</p>${button(link, "Créer mon compte")}`,
      ),
    });
  },
  welcome(to: string, username: string) {
    return sendMail({
      to,
      subject: `Bienvenue sur ${env.APP_NAME}, ${username} !`,
      text: `Votre compte ${env.APP_NAME} est prêt. Connectez-vous : ${env.APP_URL}/connexion`,
      html: layout(
        `Bienvenue, ${username} !`,
        `<p>Votre compte est prêt. Retrouvez tous les services Bupo au même endroit.</p>${button(`${env.APP_URL}/dashboard`, "Accéder à mon espace")}`,
      ),
    });
  },
};
