/* Shared, deterministic markup: Next.js, manager preview and edge SEO use this same component. */
import Edit from "@mui/icons-material/Edit";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from "react";
import type { IntroductionContent, Registration } from "./models";
import { resolveContent, mediaPath } from "./models";
export interface LandingProps {
  content: IntroductionContent;
  assetsBase?: string;
  apiBase?: string;
  previewMedia?: Record<string, string>;
  privatePreview?: boolean;
  onEditText?: (key: string) => void;
  onEditMedia?: (key: string) => void;
  onRegister?: (data: Omit<Registration, "requestKey">) => void;
  registrationState?: "idle" | "saving" | "success";
  registrationError?: string;
}
export function IntroductionView({
  content: raw,
  assetsBase = "",
  apiBase = "/api/v1",
  previewMedia = {},
  privatePreview = false,
  onEditText,
  onEditMedia,
  onRegister,
  registrationState = "idle",
  registrationError,
}: LandingProps) {
  const { texts: t, media, grades } = resolveContent(raw),
    [menu, setMenu] = useState(false);
  const successDialog = useRef<HTMLDialogElement>(null),
    privacyDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = successDialog.current;
    if (registrationState === "success" && !dialog?.open) dialog?.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, [registrationState]);
  const edit = (key: string) =>
    onEditText
      ? {
          "data-edit-text": key,
          tabIndex: 0,
          onClick: (e: MouseEvent) => {
            e.preventDefault();
            onEditText(key);
          },
          onKeyDown: (e: React.KeyboardEvent) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onEditText(key);
            }
          },
        }
      : {};
  const photo = (slot: string, alt: string) => (
    <span
      className={`intro-photo ${onEditMedia ? "intro-editable-photo" : ""}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={
          previewMedia[slot] ||
          (media[slot]
            ? privatePreview
              ? undefined
              : mediaPath(media[slot].materialId, apiBase)
            : `${assetsBase}/introduction/${slot === "logo" ? "plane.svg" : "classroom.jpeg"}`)
        }
        alt={alt}
        loading={slot === "heroImage" || slot === "logo" ? "eager" : "lazy"}
      />
      {onEditMedia && (
        <button
          type="button"
          className="intro-media-edit"
          onClick={() => onEditMedia(slot)}
          aria-label={`Đổi ${alt}`}
        >
          <Edit fontSize="small" />
        </button>
      )}
    </span>
  );
  const brand = (
    <span className="intro-brand">
      {photo("logo", t.brand)}
      <strong {...edit("brand")}>{t.brand}</strong>
    </span>
  );
  const link = (key: string, to: string, primary = false) => (
    <a
      className={`intro-button ${primary ? "intro-primary" : ""}`}
      href={to}
      {...edit(key)}
    >
      {t[key]}
    </a>
  );
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (onEditText || registrationState === "saving") return;
    const d = new FormData(e.currentTarget);
    onRegister?.({
      parentName: String(d.get("parentName") ?? ""),
      phone: String(d.get("phone") ?? ""),
      studentName: String(d.get("studentName") ?? ""),
      grade: String(d.get("grade") ?? ""),
      consent: d.get("consent") === "on",
      website: String(d.get("website") ?? ""),
    });
  }
  return (
    <div className="ees-introduction">
      <dialog
        ref={successDialog}
        className="intro-success-dialog"
        aria-labelledby="intro-success-title"
      >
        <h3 id="intro-success-title">{t.successTitle}</h3>
        <p className="intro-muted">{t.successMessage}</p>
        <button
          type="button"
          className="intro-button"
          onClick={() => successDialog.current?.close()}
        >
          {t.successClose}
        </button>
      </dialog>
      <dialog
        ref={privacyDialog}
        className="intro-success-dialog"
        aria-labelledby="intro-privacy-title"
      >
        <h3 id="intro-privacy-title">{t.privacyTitle}</h3>
        <p className="intro-muted">{t.privacyDescription}</p>
        <button
          type="button"
          className="intro-button"
          onClick={() => privacyDialog.current?.close()}
        >
          {t.privacyClose}
        </button>
      </dialog>
      <header className="intro-header">
        <div className="intro-container intro-header-inner">
          {brand}
          <nav
            aria-label="Điều hướng trang giới thiệu"
            className={menu ? "intro-nav is-open" : "intro-nav"}
          >
            {[
              ["navAbout", "about"],
              ["navClasses", "classes"],
              ["navApp", "app"],
            ].map(([k, id]) => (
              <a href={`#${id}`} key={k} onClick={() => setMenu(false)}>
                <span {...edit(k)}>{t[k]}</span>
              </a>
            ))}
            <a className="intro-mobile-login" href={`${assetsBase}/login/`}>
              {t.login}
            </a>
          </nav>
          <div className="intro-actions">
            <span className="intro-desktop-login">
              {link("login", `${assetsBase}/login/`)}
            </span>
            {link("register", "#registration", true)}
            <button
              type="button"
              aria-label={menu ? "Đóng menu" : "Mở menu"}
              aria-expanded={menu}
              className="intro-menu"
              onClick={() => setMenu(!menu)}
            >
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                aria-hidden="true"
              >
                <path
                  d={menu ? "M6 6L18 18M6 18L18 6" : "M4 6H20M4 12H20M4 18H20"}
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>
      <main>
        <section className="intro-hero">
          <div className="intro-container intro-hero-grid">
            <div className="intro-hero-copy">
              <p className="intro-eyebrow" {...edit("heroLabel")}>
                {t.heroLabel}
              </p>
              <h1 {...edit("heroTitle")}>{t.heroTitle}</h1>
              <p className="intro-muted" {...edit("heroDescription")}>
                {t.heroDescription}
              </p>
              <div className="intro-actions">
                {link("register", "#registration", true)}
                {link("explore", "#about")}
              </div>
              <p className="intro-small intro-muted" {...edit("heroFootnote")}>
                {t.heroFootnote}
              </p>
            </div>
            <figure>
              {photo("heroImage", t.heroCaption)}
              <figcaption
                className="intro-small intro-muted"
                {...edit("heroCaption")}
              >
                {t.heroCaption}
              </figcaption>
            </figure>
          </div>
        </section>
        <section id="about" className="intro-section intro-surface">
          <div className="intro-container intro-section-stack">
            <p className="intro-eyebrow" {...edit("aboutLabel")}>
              {t.aboutLabel}
            </p>
            <h2 {...edit("aboutTitle")}>{t.aboutTitle}</h2>
            <p className="intro-muted" {...edit("aboutDescription")}>
              {t.aboutDescription}
            </p>
            <div className="intro-benefits">
              {[1, 2, 3].map((i) => (
                <article key={i} className="intro-benefit">
                  <p className="intro-number" {...edit(`benefit${i}Number`)}>
                    {t[`benefit${i}Number`]}
                  </p>
                  <h3 {...edit(`benefit${i}Title`)}>{t[`benefit${i}Title`]}</h3>
                  <p
                    className="intro-muted"
                    {...edit(`benefit${i}Description`)}
                  >
                    {t[`benefit${i}Description`]}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section id="classes" className="intro-section">
          <div className="intro-container intro-section-stack">
            <p className="intro-eyebrow" {...edit("galleryLabel")}>
              {t.galleryLabel}
            </p>
            <h2 {...edit("galleryTitle")}>{t.galleryTitle}</h2>
            <p className="intro-muted" {...edit("galleryDescription")}>
              {t.galleryDescription}
            </p>
            <div className="intro-gallery">
              {["One", "Two"].map((i) => (
                <figure key={i}>
                  {photo(`gallery${i}`, t[`gallery${i}Caption`])}
                  <figcaption
                    className="intro-card-title"
                    {...edit(`gallery${i}Caption`)}
                  >
                    {t[`gallery${i}Caption`]}
                  </figcaption>
                </figure>
              ))}
            </div>
            <p className="intro-small intro-muted" {...edit("galleryFootnote")}>
              {t.galleryFootnote}
            </p>
          </div>
        </section>
        <section id="app" className="intro-section intro-cream">
          <div className="intro-container intro-app-grid">
            <div className="intro-app-copy">
              <p className="intro-eyebrow" {...edit("appLabel")}>
                {t.appLabel}
              </p>
              <h2 {...edit("appTitle")}>{t.appTitle}</h2>
              {[1, 2, 3, 4].map((i) => (
                <p key={i} {...edit(`appBenefit${i}`)}>
                  {t[`appBenefit${i}`]}
                </p>
              ))}
              <div>{link("register", "#registration", true)}</div>
            </div>
            <div className="intro-app-preview">
              <p className="intro-preview-brand" {...edit("previewBrand")}>
                {t.previewBrand}
              </p>
              <h3 {...edit("previewTitle")}>{t.previewTitle}</h3>
              <p className="intro-small intro-muted" {...edit("previewUnit")}>
                {t.previewUnit}
              </p>
              <div className="intro-progress">
                <h3 {...edit("previewProgress")}>{t.previewProgress}</h3>
                <p
                  className="intro-small intro-muted"
                  {...edit("previewProgressNote")}
                >
                  {t.previewProgressNote}
                </p>
                <div className="intro-progress-track">
                  <span />
                </div>
              </div>
              {[1, 2, 3].map((i) => (
                <p
                  className="intro-preview-link"
                  key={i}
                  {...edit(`previewLink${i}`)}
                >
                  {t[`previewLink${i}`]}
                </p>
              ))}
              <p
                className="intro-small intro-muted"
                {...edit("previewFootnote")}
              >
                {t.previewFootnote}
              </p>
            </div>
          </div>
        </section>
        <section className="intro-section intro-surface">
          <div className="intro-container intro-section-stack">
            <p className="intro-eyebrow" {...edit("faqLabel")}>
              {t.faqLabel}
            </p>
            <h2 {...edit("faqTitle")}>{t.faqTitle}</h2>
            {[1, 2, 3].map((i) => (
              <article className="intro-faq" key={i}>
                <h3 {...edit(`faq${i}Question`)}>{t[`faq${i}Question`]}</h3>
                <p className="intro-muted" {...edit(`faq${i}Answer`)}>
                  {t[`faq${i}Answer`]}
                </p>
              </article>
            ))}
          </div>
        </section>
        <section id="registration" className="intro-registration">
          <form className="intro-form" onSubmit={submit}>
            <div className="intro-form-heading">
              <p className="intro-eyebrow" {...edit("formLabel")}>
                {t.formLabel}
              </p>
              <h2 {...edit("formTitle")}>{t.formTitle}</h2>
              <p className="intro-muted" {...edit("formDescription")}>
                {t.formDescription}
              </p>
            </div>
            {registrationState === "success" ? (
              <div role="status" className="intro-success">
                <strong {...edit("successTitle")}>{t.successTitle}</strong>
                <p {...edit("successMessage")}>{t.successMessage}</p>
              </div>
            ) : (
              <>
                <div className="intro-fields">
                  {[
                    ["parentName", "parent", "text"],
                    ["phone", "phone", "tel"],
                    ["studentName", "student", "text"],
                  ].map(([name, key, type]) => (
                    <label key={name}>
                      <span {...edit(`${key}Label`)}>{t[`${key}Label`]}</span>
                      <input
                        name={name}
                        type={type}
                        required
                        maxLength={type === "tel" ? 20 : 120}
                        placeholder={t[`${key}Placeholder`]}
                        autoComplete={
                          type === "tel"
                            ? "tel"
                            : name === "parentName"
                              ? "name"
                              : "off"
                        }
                        disabled={
                          !!onEditText || registrationState === "saving"
                        }
                      />
                      {onEditText && (
                        <button
                          type="button"
                          className="intro-placeholder-edit"
                          onClick={() => onEditText(`${key}Placeholder`)}
                          aria-label={`Sửa gợi ý ${t[`${key}Label`]}`}
                        >
                          <Edit fontSize="small" />
                        </button>
                      )}
                    </label>
                  ))}
                  <label>
                    <span {...edit("gradeLabel")}>{t.gradeLabel}</span>
                    <select
                      name="grade"
                      disabled={!!onEditText || registrationState === "saving"}
                    >
                      <option value="">{t.gradePlaceholder}</option>
                      {grades.map((g) => (
                        <option key={g}>{g}</option>
                      ))}
                    </select>
                    {onEditText && (
                      <button
                        type="button"
                        className="intro-placeholder-edit"
                        onClick={() => onEditText("gradePlaceholder")}
                        aria-label="Sửa gợi ý lớp"
                      >
                        <Edit fontSize="small" />
                      </button>
                    )}
                  </label>
                </div>
                <label className="intro-consent">
                  <input
                    type="checkbox"
                    name="consent"
                    required
                    disabled={!!onEditText || registrationState === "saving"}
                  />
                  <span {...edit("consent")}>{t.consent}</span>
                </label>
                <label className="intro-honeypot" aria-hidden="true">
                  Website
                  <input name="website" tabIndex={-1} autoComplete="off" />
                </label>
                {registrationError && (
                  <p role="alert" className="intro-error">
                    {registrationError}
                  </p>
                )}
                <button
                  className="intro-button intro-primary"
                  type={onEditText ? "button" : "submit"}
                  disabled={registrationState === "saving"}
                  {...edit("formSubmit")}
                >
                  {registrationState === "saving" ? "Đang gửi…" : t.formSubmit}
                </button>
              </>
            )}
            <button
              type="button"
              className="intro-privacy intro-small intro-muted"
              onClick={() =>
                onEditText
                  ? onEditText("privacy")
                  : privacyDialog.current?.showModal()
              }
            >
              {t.privacy}
            </button>
          </form>
        </section>
      </main>
      <footer className="intro-footer intro-surface">
        <div className="intro-container intro-section-stack">
          {brand}
          <p className="intro-muted" {...edit("footerTagline")}>
            {t.footerTagline}
          </p>
          {(media.brochure || onEditMedia) && (
            <a
              href={
                media.brochure
                  ? privatePreview
                    ? previewMedia.brochure
                    : mediaPath(media.brochure.materialId, apiBase)
                  : "#"
              }
              onClick={
                onEditMedia
                  ? (e) => {
                      e.preventDefault();
                      onEditMedia("brochure");
                    }
                  : undefined
              }
            >
              <span {...edit("brochureLabel")}>{t.brochureLabel}</span>
            </a>
          )}
          <p className="intro-small intro-muted" {...edit("footerCopyright")}>
            {t.footerCopyright}
          </p>
        </div>
      </footer>
    </div>
  );
}
