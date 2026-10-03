"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useAdmin } from "@/components/admin/AdminShell";
import { ImageField } from "@/components/admin/editor-parts";
import { getSettings, saveSettings } from "@/lib/admin-api";
import { DESCRIPTION_MAX, DESCRIPTION_MIN, isHttpUrl, resolveSiteSettings, verificationCode } from "@/lib/seo-core";
import { Button, Card, CharCount, Field, Notice, PageHeader, Spinner, inputClass } from "@/components/admin/ui";

const TEXT_FIELDS = [
  "org_name",
  "org_email",
  "org_phone",
  "org_street_address",
  "org_locality",
  "org_region",
  "org_postal_code",
  "org_country",
  "org_logo_url",
  "default_description",
  "default_og_image_url",
  "google_site_verification",
  "bing_site_verification",
];

const DEFAULTS = resolveSiteSettings({});

function formFromSettings(settings) {
  const form = Object.fromEntries(TEXT_FIELDS.map((key) => [key, settings[key] ?? ""]));
  form.same_as = settings.same_as?.length ? [...settings.same_as] : [""];
  return form;
}

function TextField({ form, set, name, label, hint, placeholder, type = "text", disabled }) {
  return (
    <Field id={name} label={label} hint={hint}>
      <input id={name} type={type} value={form[name]} onChange={(event) => set(name, event.target.value)} placeholder={placeholder} className={inputClass} disabled={disabled} />
    </Field>
  );
}

export function SettingsForm() {
  const { isAdmin, notify, refreshPublishState } = useAdmin();
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    getSettings().then(
      (settings) => {
        if (!active) return;
        const loaded = formFromSettings(settings);
        setForm(loaded);
        setSaved(JSON.stringify(loaded));
      },
      (error) => active && setLoadError(error.message),
    );
    return () => {
      active = false;
    };
  }, []);

  const dirty = useMemo(() => form && JSON.stringify(form) !== saved, [form, saved]);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const setProfile = (index, value) => set("same_as", form.same_as.map((url, i) => (i === index ? value : url)));

  async function onSubmit(event) {
    event.preventDefault();
    const sameAs = form.same_as.map((url) => url.trim()).filter(Boolean);
    const invalid = sameAs.find((url) => !isHttpUrl(url));
    if (invalid) {
      setFormError(`“${invalid}” isn't a full link — it should start with https://`);
      return;
    }
    if (form.org_country && !/^[A-Za-z]{2}$/.test(form.org_country.trim())) {
      setFormError("Use the two-letter country code, e.g. NP or GB.");
      return;
    }
    setFormError(null);
    setSaving(true);
    try {
      const values = { ...form, same_as: sameAs, org_country: form.org_country.trim().toUpperCase() };
      // Store just the code even when the whole <meta> tag was pasted.
      values.google_site_verification = verificationCode(form.google_site_verification) ?? "";
      values.bing_site_verification = verificationCode(form.bing_site_verification) ?? "";
      const row = await saveSettings(values);
      const next = formFromSettings(row);
      setForm(next);
      setSaved(JSON.stringify(next));
      notify("Settings saved — live after the next publish.");
      refreshPublishState();
    } catch (saveError) {
      setFormError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  if (loadError) return <Notice tone="error">{loadError}</Notice>;
  if (!form) return <Spinner label="Loading settings" />;

  const disabled = !isAdmin;
  const description = form.default_description || DEFAULTS.defaultDescription;

  return (
    <form onSubmit={onSubmit} noValidate>
      <PageHeader
        title="SEO settings"
        description="Site-wide details search engines read on every page. Leave a field empty to keep the default shown in grey."
        actions={
          isAdmin && (
            <Button type="submit" variant="primary" busy={saving} disabled={!dirty}>
              Save settings
            </Button>
          )
        }
      />
      {!isAdmin && (
        <Notice tone="info" className="mb-6">
          Only admins can change site settings.
        </Notice>
      )}
      {formError && (
        <Notice tone="error" className="mb-6">
          {formError}
        </Notice>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card
          title="Business details"
          description="Published as Organization structured data, which feeds Google's knowledge panel and AI answers about the company."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <TextField form={form} set={set} name="org_name" label="Business name" placeholder={DEFAULTS.orgName} disabled={disabled} />
            </div>
            <TextField form={form} set={set} name="org_email" label="Email" type="email" placeholder={DEFAULTS.email} disabled={disabled} />
            <TextField form={form} set={set} name="org_phone" label="Phone" type="tel" placeholder={DEFAULTS.phone} disabled={disabled} />
            <div className="sm:col-span-2">
              <TextField form={form} set={set} name="org_street_address" label="Street address" disabled={disabled} />
            </div>
            <TextField form={form} set={set} name="org_locality" label="City" placeholder={DEFAULTS.locality} disabled={disabled} />
            <TextField form={form} set={set} name="org_region" label="Region" disabled={disabled} />
            <TextField form={form} set={set} name="org_postal_code" label="Postcode" disabled={disabled} />
            <TextField form={form} set={set} name="org_country" label="Country code" placeholder={DEFAULTS.country} hint="Two letters: NP, GB…" disabled={disabled} />
            <div className="sm:col-span-2">
              <TextField form={form} set={set} name="org_logo_url" label="Logo URL" placeholder={DEFAULTS.logoUrl} disabled={disabled} />
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card
            title="Social profiles"
            description="Links to the company's own profiles (Instagram, LinkedIn, Facebook, TikTok, YouTube). They tell Google these accounts and this site are the same business."
          >
            <div className="space-y-2">
              {form.same_as.map((url, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(event) => setProfile(index, event.target.value)}
                    placeholder="https://www.instagram.com/…"
                    aria-label={`Social profile ${index + 1}`}
                    className={inputClass}
                    disabled={disabled}
                  />
                  <Button
                    variant="ghost"
                    onClick={() => set("same_as", form.same_as.length > 1 ? form.same_as.filter((_, i) => i !== index) : [""])}
                    aria-label={`Remove social profile ${index + 1}`}
                    disabled={disabled}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => set("same_as", [...form.same_as, ""])} disabled={disabled}>
                <Plus size={14} aria-hidden="true" /> Add a profile
              </Button>
            </div>
          </Card>

          <Card title="Search engine verification" description="Proves to each search engine that you own the site, so you can see your search data.">
            <div className="space-y-4">
              <TextField
                form={form}
                set={set}
                name="google_site_verification"
                label="Google Search Console"
                hint="Search Console → Add property → URL prefix → HTML tag. Paste the code (or the whole tag), publish the site, then press Verify."
                disabled={disabled}
              />
              <TextField
                form={form}
                set={set}
                name="bing_site_verification"
                label="Bing Webmaster Tools"
                hint="Bing also powers DuckDuckGo, Yahoo and ChatGPT search. Its HTML meta tag option works the same way — or import the site straight from Search Console."
                disabled={disabled}
              />
            </div>
          </Card>
        </div>

        <Card title="Defaults" description="Used wherever a page or post doesn't set its own." className="lg:col-span-2">
          <div className="grid gap-6 lg:grid-cols-2">
            <Field
              id="default_description"
              label="Default meta description"
              counter={<CharCount length={description.length} min={DESCRIPTION_MIN} max={DESCRIPTION_MAX} />}
            >
              <textarea
                id="default_description"
                rows={4}
                value={form.default_description}
                onChange={(event) => set("default_description", event.target.value)}
                placeholder={DEFAULTS.defaultDescription}
                className={inputClass}
                disabled={disabled}
              />
            </Field>
            <ImageField
              label="Default social share image"
              value={form.default_og_image_url}
              onChange={(value) => set("default_og_image_url", value)}
              maxWidth={1200}
              hint="Shown when a page without its own image is shared. Leave empty to use the homepage hero. 1200×630 is ideal."
              disabled={disabled}
            />
          </div>
        </Card>
      </div>
    </form>
  );
}
