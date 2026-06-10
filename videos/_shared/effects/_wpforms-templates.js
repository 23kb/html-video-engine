// videos/_shared/effects/_wpforms-templates.js
//
// Real WPForms template metadata + thumbnail-card markup extracted from
// snapshots/admin-templates/index.html (capture from sulliesbakery.com on
// 2026-04-29 — 2169 templates in source; this is a curated 12-item subset
// representing the most recognizable WPForms templates).
//
// Used by: cards-spread-fan, cards-fly-in-stack, constellation-phyllotaxis-bloom.
//
// To pull a different subset or rebuild: see the README's "Real template
// extraction" section.

import { escapeHtml } from './_utils.js';

export const REAL_TEMPLATES = [
  { slug: 'simple-contact-form-template',      name: 'Simple Contact Form',     desc: 'Collect the names, emails, and messages from site visitors that need to talk to you.', thumb: 'bc4b02caed16.jpg' },
  { slug: 'request-a-quote-form-template',     name: 'Request a Quote Form',    desc: 'Let people safely and easily request a quote from your business through this form template.', thumb: '7c66869ae3ab.jpg' },
  { slug: 'newsletter-signup-form-template',   name: 'Newsletter Signup Form',  desc: 'Collect the email addresses of your website visitors and add them to your newsletter.', thumb: '31499ef2ef2c.jpg' },
  { slug: 'donation-form-template',            name: 'Donation Form',           desc: 'Use the donation form template to collect one-time or recurring donations via PayPal.', thumb: '458fd6ec3d4b.jpg' },
  { slug: 'survey-form-template',              name: 'Survey Form',             desc: 'Gather customer feedback and make educated decisions for your business.', thumb: '5572dea2c9ba.jpg' },
  { slug: 'billing-order-form-template',       name: 'Billing / Order Form',    desc: 'Receive payments online directly through your forms using this billing form template.', thumb: 'f7bb3bf5af69.jpg' },
  { slug: 'suggestion-form-template',          name: 'Suggestion Form',         desc: 'Gather site visitor suggestions into one convenient location and use them to grow your business.', thumb: 'e99f18009ef9.jpg' },
  { slug: 'job-application-upload-form-template', name: 'Job Application Upload Form', desc: 'Find the perfect candidate for your job using this job application upload form.', thumb: '17b560a7b39d.jpg' },
  { slug: 'party-invitation-rsvp-form-template', name: 'Party Invitation RSVP Form', desc: 'Easily share party information and give them to chance to RSVP.', thumb: 'f00c31d951f1.jpg' },
  { slug: 'maintenance-request-form-template', name: 'Maintenance Request Form', desc: 'Collect repair requests and place urgent matters to the front of the line.', thumb: 'fb84d8b5dc96.jpg' },
  { slug: 'address-book-form-template',        name: 'Address Book Form',       desc: 'Collect contact information such as names, addresses, emails, and phone numbers.', thumb: 'a1e472159170.jpg' },
  { slug: 'auction-item-registration-form-template', name: 'Auction Item Registration Form', desc: 'Register items that will be up for bidding in your auction.', thumb: '5b3bfb98e990.jpg' },
];

export const DEFAULT_THUMB_BASE = '/snapshots/_shared/assets/';

/**
 * Build the inner HTML for a WPForms admin template card. The caller wraps
 * this in a `.wpforms-template` element via the effect's own DOM logic.
 *
 * @param {{slug:string,name:string,desc:string,thumb:string}} t — template data
 * @param {Object} [opts]
 * @param {string} [opts.thumbBase=DEFAULT_THUMB_BASE]
 * @param {boolean} [opts.showDemoButton=true]
 * @param {boolean} [opts.showDescription=true]
 * @returns {string} innerHTML for a `.wpforms-template` container
 */
export function templateCardInnerHTML(t, opts = {}) {
  const {
    thumbBase = DEFAULT_THUMB_BASE,
    showDemoButton = true,
    showDescription = true,
  } = opts;
  return `
    <div class="wpforms-template-thumbnail">
      <img src="${escapeHtml(thumbBase + t.thumb)}" alt="${escapeHtml(t.name + ' Template')}" loading="lazy">
    </div>
    <h3 class="wpforms-template-name">${escapeHtml(t.name)}</h3>
    <span class="wpforms-template-favorite" aria-hidden="true"><span class="wpforms-fx-heart">&#9825;</span></span>
    ${showDescription ? `<p class="wpforms-template-desc">${escapeHtml(t.desc)}</p>` : ''}
    <div class="wpforms-template-buttons">
      <a class="wpforms-template-select wpforms-btn wpforms-btn-md wpforms-btn-orange">Create Form</a>
      ${showDemoButton ? '<a class="wpforms-template-demo wpforms-btn wpforms-btn-md wpforms-btn-light-grey">View Demo</a>' : ''}
    </div>
  `;
}

/**
 * Scoped CSS for the real WPForms template card markup, extracted from
 * snapshots/_shared/assets/e194c0a1d123.css (admin-templates capture). Returns
 * the INNER rules (thumbnail, h3, p, favorite, buttons) prefixed by `${scope}`.
 *
 * @param {string} scope — CSS scope selector (e.g. `#fx-cards-spread-fan-1`)
 * @returns {string} CSS text
 */
export function templateCardInnerCSS(scope) {
  return `
    ${scope} .wpforms-template-thumbnail {
      background-color: #F5F9FD;
      border-bottom: 1px solid #EBEEF1;
      overflow: hidden;
      padding: 20px 54px 0;
    }
    ${scope} .wpforms-template-thumbnail > img {
      border-radius: 2px 2px 0 0;
      box-shadow: 0px 1px 4px rgba(0,0,0,0.1);
      display: block;
      margin: 0 auto;
      max-width: 100%;
    }
    ${scope} .wpforms-template-name {
      font-size: 16px;
      font-weight: 600;
      line-height: 18px;
      padding: 20px 20px 2px;
      margin: 0;
      overflow: hidden;
      position: relative;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: #3c434a;
    }
    ${scope} .wpforms-template-favorite {
      display: block;
      position: absolute;
      inset-inline-end: 14px;
      top: 14px;
      font-size: 18px;
      line-height: 18px;
      color: #c3c4c7;
    }
    ${scope} .wpforms-template-desc {
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 3;
      overflow: hidden;
      color: #50575e;
      font-size: 14px;
      line-height: 18px;
      margin: 10px 0 0;
      max-height: 55px;
      min-height: 45px;
      padding: 0 20px;
    }
    ${scope} .wpforms-template-buttons {
      position: relative;
      bottom: 0;
      margin: 10px 0 0 0;
      padding: 0 20px;
      display: flex;
      gap: 8px;
    }
    ${scope} .wpforms-btn {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-weight: 600;
      font-size: 13px;
      line-height: 16px;
      padding: 11px 10px;
      border-width: 1px;
      border-style: solid;
      border-radius: 4px;
      cursor: pointer;
      display: inline-block;
      text-decoration: none;
      text-align: center;
      vertical-align: middle;
      box-sizing: border-box;
    }
    ${scope} .wpforms-btn-md {
      font-size: 14px;
      font-weight: 600;
      line-height: 17px;
      padding: 10px 15px;
    }
    ${scope} .wpforms-btn-orange {
      background-color: #e27730;
      border-color: #e27730;
      color: #ffffff;
    }
    ${scope} .wpforms-btn-light-grey {
      background-color: #f6f7f7;
      border-color: #c3c4c7;
      color: #6a6f76;
    }
  `;
}

export const TEMPLATE_BASE_STYLES = `
  border-radius: 6px;
  overflow: hidden;
  padding: 0 0 15px;
  position: relative;
  background: #ffffff;
  box-shadow: 0 0 0 1px #c3c4c7, 0 8px 24px rgba(20, 22, 28, 0.08);
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
`;
