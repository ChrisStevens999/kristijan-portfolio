"use client";

import { useState, type FormEvent } from "react";

import { CONTACT_SUBJECT, WEB3FORMS_ACCESS_KEY, WEB3FORMS_ENDPOINT } from "@/content/contact";

/**
 * The Contact form: first and last name, email, message, Submit — laid out
 * by the .contact-* rules in globals.css. It posts to Web3Forms
 * (src/content/contact.ts), which forwards the message to the inbox; the
 * visitor stays on the page and is told plainly what happened: sent, failed
 * (their words are kept so they can try again), or not connected yet.
 */
type Status = { state: "idle" } | { state: "sending" } | { state: "sent" } | { state: "error"; message: string };

const FAILED = "That didn’t go through. Please try again in a moment.";

export function ContactForm() {
  const [status, setStatus] = useState<Status>({ state: "idle" });

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    // a field only a bot fills in
    if (data.get("botcheck")) return;
    if (!WEB3FORMS_ACCESS_KEY) {
      setStatus({ state: "error", message: "This form isn’t connected to an inbox yet." });
      return;
    }
    setStatus({ state: "sending" });
    const first = String(data.get("first_name") ?? "").trim();
    const last = String(data.get("last_name") ?? "").trim();
    try {
      const res = await fetch(WEB3FORMS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          access_key: WEB3FORMS_ACCESS_KEY,
          subject: CONTACT_SUBJECT,
          from_name: `${first} ${last}`.trim(),
          name: `${first} ${last}`.trim(),
          email: String(data.get("email") ?? "").trim(),
          message: String(data.get("message") ?? "").trim(),
        }),
      });
      const json = (await res.json().catch(() => null)) as { success?: boolean } | null;
      if (res.ok && json?.success) {
        form.reset();
        setStatus({ state: "sent" });
      } else setStatus({ state: "error", message: FAILED });
    } catch {
      setStatus({ state: "error", message: FAILED });
    }
  };

  if (status.state === "sent")
    return (
      <div className="contact-form contact-form--done" role="status">
        <p className="contact-thanks">Message sent.</p>
        <p className="contact-note">Thank you. I’ll get back to you soon.</p>
        <button type="button" className="contact-again" onClick={() => setStatus({ state: "idle" })}>
          Send another
        </button>
      </div>
    );

  const sending = status.state === "sending";
  return (
    <form className="contact-form" onSubmit={onSubmit} aria-label="Contact me">
      <label className="contact-field">
        <span className="contact-label">First Name</span>
        <input name="first_name" type="text" autoComplete="given-name" required maxLength={80} />
      </label>
      <label className="contact-field">
        <span className="contact-label">Last Name</span>
        <input name="last_name" type="text" autoComplete="family-name" required maxLength={80} />
      </label>
      <label className="contact-field contact-field--wide">
        <span className="contact-label">Email</span>
        <input name="email" type="email" autoComplete="email" required maxLength={200} />
      </label>
      <label className="contact-field contact-field--wide">
        <span className="contact-label">Message</span>
        <textarea name="message" required maxLength={5000} rows={3} />
      </label>
      {/* off screen and out of the tab order: people never see it, bots fill it in */}
      <input type="checkbox" name="botcheck" tabIndex={-1} autoComplete="off" aria-hidden className="contact-trap" />
      <div className="contact-actions">
        <button type="submit" className="contact-submit" disabled={sending}>
          {sending ? "Sending" : "Submit"}
        </button>
        <p className="contact-note" role="alert">
          {status.state === "error" ? status.message : ""}
        </p>
      </div>
    </form>
  );
}
