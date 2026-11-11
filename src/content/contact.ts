/**
 * The Contact page (src/app/contact).
 *
 * Messages are delivered by Web3Forms (https://web3forms.com): the form
 * posts to their API with this access key and they forward it to the inbox
 * the key was created for. The key is public by design (it only allows
 * sending TO that inbox), so it lives here rather than in a secret.
 *
 * To connect the form: create a key at web3forms.com with the address that
 * should receive the messages, and paste it below. While it is empty the
 * form says it is not connected instead of pretending to send.
 */
export const WEB3FORMS_ACCESS_KEY = "";
export const WEB3FORMS_ENDPOINT = "https://api.web3forms.com/submit";

/** the subject line the messages arrive with */
export const CONTACT_SUBJECT = "New message from the portfolio";

/** the page's top menu, as in the mockup */
export const CONTACT_NAV = [
  { label: "About me", href: "/about" },
  { label: "Work", href: "/#selected-works" },
  { label: "Contact", href: "/contact" },
] as const;
