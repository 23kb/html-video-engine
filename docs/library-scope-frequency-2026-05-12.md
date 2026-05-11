# Library Scope Frequency Audit — 2026-05-12

Review-only audit. No edits were made to `videos/_shared/wpforms-interactions.js` or any library code.

Method: I crawled 20 live WPForms.com documentation pages from `https://wpforms.com/docs/` and category pages, with a custom audit user agent and a 1.6-1.7 second pause between requests. Entries below list only interactions explicitly described in the docs. Counts are doc-frequency counts, not total mentions.

## 1. Doc Entries

### Doc 1: Creating Your First Form
URL: https://wpforms.com/docs/creating-first-form/
Feature surface: Form Builder

Interactions described:
1. Go to WordPress admin.
2. Click WPForms in the admin sidebar to open the Forms Overview page.
3. Click Add New to launch the form builder.
4. Enter a form name in Name Your Form.
5. Browse templates in Select a Template.
6. Hover a template and click Use Template.
7. Click Generate With AI to create a form from text instructions.
8. Click or drag a field from the left panel into the form preview.
9. Hover a field and click the trash icon to delete it.
10. Click a field in the preview to open Field Options.
11. Edit field label/description options.
12. Click Save.
13. Click Settings in the builder sidebar.
14. Open General, Spam Protection and Security, Notifications, and Confirmations settings.
15. Update Send To Email Address.
16. Click Embed.

### Doc 2: Using Form Templates
URL: https://wpforms.com/docs/how-to-use-form-templates-in-wpforms/
Feature surface: Form Builder

Interactions described:
1. Go to WPForms -> Form Templates.
2. Click New Templates to view recent templates.
3. Search template keywords in the search field.
4. Click View Demo to preview a template.
5. Click Create Form from the template library.
6. Click Use Template from WPForms -> Add New.
7. Click the heart icon to favorite a template.
8. Click Favorite Templates to view saved favorites.
9. Click the heart icon again to remove a favorite.

### Doc 3: Creating Multi-Page Forms
URL: https://wpforms.com/docs/how-to-create-multi-page-forms-in-wpforms/
Feature surface: Form Builder

Interactions described:
1. Create a new form or edit an existing form.
2. Add fields to the form.
3. Drag a Page Break field into the preview area.
4. Click and drag a Page Break field to move it.
5. Click a Page Break field to open Field Options.
6. Edit the Page Title field.
7. Edit the Next Label field.
8. Toggle Display Previous.
9. Click the divider below the last field to edit last-page previous-button settings.
10. Click First Page / Progress Indicator.
11. Select None, Progress Bar, Circles, or Connector from the Progress Indicator dropdown.
12. Use the color picker or enter a HEX code.
13. Enter a first-page title.
14. Select Circles or Connector and toggle Allow Page Navigation.
15. Click the Advanced tab.
16. Select Page Navigation Alignment.
17. Toggle Disable Scroll Animation.
18. Hover a Page Break and click the trash icon to delete it.

### Doc 4: Using the Layout Field
URL: https://wpforms.com/docs/how-to-use-the-layout-field-in-wpforms/
Feature surface: Form Builder

Interactions described:
1. Create a new form or edit an existing form.
2. Click or drag the Layout field into the preview area.
3. Click the Layout field to open Field Options.
4. Choose a column layout.
5. Click the Display dropdown and select a display order.
6. Select a different layout from Field Options.
7. Add a label in the Label field.
8. Click and drag fields from the sidebar into Layout columns.
9. Click the Layout field, open Field Options, and navigate to Smart Logic.
10. Toggle Enable Conditional Logic.
11. Hover a Layout field and click the trash icon.
12. Click OK in the delete-confirmation overlay.
13. Click Save.
14. Click Preview.
15. Click a field, open Advanced, and remove CSS classes from CSS Classes.

### Doc 5: Setting Up Form Confirmations
URL: https://wpforms.com/docs/setup-form-confirmation-wpforms/
Feature surface: Settings

Interactions described:
1. Create a new form or edit an existing form.
2. Open Settings -> Confirmations.
3. Choose a confirmation type.
4. Edit the confirmation message.
5. Click Show Smart Tags under the message editor.
6. Insert Smart Tags into the message.
7. Select a page from the confirmation page dropdown.
8. Save the form.

### Doc 6: Creating Conditional Form Confirmations
URL: https://wpforms.com/docs/how-to-create-conditional-form-confirmations/
Feature surface: Settings

Interactions described:
1. Create or open a form with at least two confirmations.
2. Open Settings -> Confirmations.
3. Click Add New Confirmation.
4. Enter the conditional confirmation message.
5. Toggle Enable Conditional Logic.
6. Configure the conditional rule.
7. Repeat Add New Confirmation and conditional-rule setup for additional confirmations.

### Doc 7: Preventing Spam in WPForms
URL: https://wpforms.com/docs/how-to-prevent-spam-in-wpforms/
Feature surface: Settings

Interactions described:
1. Create a new form or edit an existing form.
2. Open Settings -> Spam Protection and Security.
3. Toggle or configure anti-spam options.
4. Enter a value in Minimum time to submit.
5. Save the form.

### Doc 8: Using Form Themes
URL: https://wpforms.com/docs/using-form-themes/
Feature surface: Settings

Interactions described:
1. Create a new form or edit an existing form.
2. Customize field options and settings.
3. Save changes.
4. Embed the form in a page or post.
5. Use block editor theme controls to select a form theme.
6. Customize theme styling options.
7. Update a theme, creating a copied theme.

### Doc 9: Setting Up Form Notification Emails
URL: https://wpforms.com/docs/setup-form-notification-wpforms/
Feature surface: Notifications

Interactions described:
1. Open the form builder.
2. Go to Settings -> Notifications.
3. Enable notifications if needed.
4. Click Add New Notification.
5. Enter a notification name in the overlay.
6. Click OK.
7. Fill Send To Email Address.
8. Fill Email Subject Line.
9. Fill From Name / From Email / Reply-To.
10. Edit the Email Message field.
11. Use Smart Tags in notification fields.
12. Save notification settings.
13. Test the form.

### Doc 10: Adding Multiple Form Notifications
URL: https://wpforms.com/docs/adding-multiple-form-notifications/
Feature surface: Notifications

Interactions described:
1. Navigate to Settings -> Notifications.
2. Click Add New Notification.
3. Enter a notification name in the prompt.
4. Click OK.
5. Configure the new notification fields.
6. Click the ACTIVE status badge to deactivate a notification.
7. Click the status badge again to reactivate it.
8. Click the caret to collapse notification settings.

### Doc 11: Creating Conditional Form Notification Emails
URL: https://wpforms.com/docs/how-to-create-conditional-form-notifications-in-wpforms/
Feature surface: Notifications

Interactions described:
1. Add at least one supported conditional-logic field.
2. Configure that field's options.
3. Go to Settings -> Notifications.
4. Toggle Enable Notifications if needed.
5. Customize the default notification.
6. Click Add New Notification.
7. Configure the conditional notification fields.
8. Toggle Enable Conditional Logic.
9. Set the conditional notification rule.
10. Repeat Add New Notification for other conditional emails.
11. Add a Hidden Field.
12. Set the Hidden Field default value to a Smart Tag.

### Doc 12: Using Smart Tags
URL: https://wpforms.com/docs/how-to-use-smart-tags-in-wpforms/
Feature surface: Notifications

Interactions described:
1. Open the form builder.
2. Go to Settings -> Notifications.
3. Click the Smart Tags icon beside a notification field.
4. Click a Smart Tag in the list to insert it.
5. Click a field to open Field Options.
6. Click the Advanced tab.
7. Find Default Value.
8. Click the Smart Tags icon.
9. Click a Smart Tag to insert it into Default Value.

### Doc 13: Mailchimp Addon
URL: https://wpforms.com/docs/install-use-mailchimp-addon-wpforms/
Feature surface: Marketing

Interactions described:
1. Install and activate the Mailchimp addon.
2. Open WPForms settings integrations for Mailchimp.
3. Click Add New Account.
4. Log in to Mailchimp.
5. Open Account & billing.
6. Create an API key.
7. Name the API key.
8. Copy and paste the API key into WPForms.
9. Enter an Account Nickname.
10. Click Connect to Mailchimp.
11. Create or edit a form.
12. Go to Marketing -> Mailchimp.
13. Select an account from Select Account.
14. Select an audience.
15. Select an action from Action to Perform.
16. Map Mailchimp custom fields to WPForms fields using dropdowns.
17. Toggle Enable Conditional Logic.
18. Create the conditional logic rule.
19. Save the form.

### Doc 14: Constant Contact Integration
URL: https://wpforms.com/docs/how-to-connect-constant-contact-with-wpforms/
Feature surface: Marketing

Interactions described:
1. Open Constant Contact integration settings.
2. Click Add New Account.
3. Authorize/sign in to Constant Contact.
4. Create or edit a form.
5. Go to Marketing -> Constant Contact.
6. Select an account.
7. Select Subscribe or Unsubscribe as the action.
8. Select a mailing list.
9. Map required fields.
10. Toggle Enable Conditional Logic.
11. Create the conditional logic rule.
12. Click Save.
13. Click the migration link for legacy integration migration.

### Doc 15: Creating a Payment Form
URL: https://wpforms.com/docs/how-to-create-a-payment-form-in-wpforms/
Feature surface: Payments

Interactions described:
1. Install and activate the required payment addon.
2. Create a new form or edit an existing form.
3. Click or drag a payment field into the preview area.
4. Add the related credit card field for the chosen gateway.
5. Navigate to Payments.
6. Select the payment integration.
7. Enable payments for the form.
8. Customize connection settings.
9. Save the form.
10. Test the payment form.

### Doc 16: Setting Up Conditional Logic for Stripe Payments
URL: https://wpforms.com/docs/setting-up-conditional-logic-for-stripe-payments/
Feature surface: Payments

Interactions described:
1. Create a donation form.
2. Add a Dropdown or Multiple Choice field.
3. Open Payments -> Stripe.
4. Configure one-time payment settings.
5. Configure recurring payment settings.
6. Toggle Enable Conditional Logic under Recurring Payments.
7. Create the conditional logic rule.
8. Open Settings -> Notifications.
9. Check Enable for Stripe completed payments.

### Doc 17: A Complete Guide to Form Entries
URL: https://wpforms.com/docs/complete-guide-to-form-entries/
Feature surface: Entries

Interactions described:
1. Go to WPForms -> Entries.
2. Click a graph icon to view a single form's entry counts.
3. Click the red X to return to total entry counts.
4. Go to WPForms -> All Forms.
5. Click Entries under a form title.
6. Go to WPForms -> Entries and click a form title.
7. Click View next to an entry.
8. Click Print.
9. Click Export CSV or Export XLSX.
10. Click Resend Notifications.
11. Click Mark Unread.
12. Click Star/Unstar.
13. Use dropdowns and fields above the entries list to search/filter entries.
14. Click Export All.
15. Open an entry and click Edit.
16. Open Settings -> General -> Advanced.
17. Toggle Purge Entries Automatically and enter retention days.

### Doc 18: Exporting Form Entries
URL: https://wpforms.com/docs/how-to-export-form-entries-to-csv-in-wpforms/
Feature surface: Entries

Interactions described:
1. Go to WPForms -> Tools.
2. Click the Export tab.
3. Use the form dropdown to choose entries to export.
4. Uncheck field boxes to exclude fields.
5. Select payment fields to include.
6. Select additional information checkboxes.
7. Check Microsoft Excel .xlsx format if desired.
8. Check Separate dynamic choices into individual columns if desired.
9. Set a Custom Date Range.
10. Select entry Status filters.
11. Use Search fields to restrict entries.
12. Click Download Export File.
13. Go to WPForms -> Entries.
14. Select a form name.
15. Click View for a specific entry.
16. Click Export CSV or Export XLSX in the entry Actions section.

### Doc 19: Searching and Filtering Form Entries
URL: https://wpforms.com/docs/how-to-search-and-filter-form-entries/
Feature surface: Entries

Interactions described:
1. Go to WPForms -> Entries.
2. Click a form name.
3. Locate the search bar.
4. Select a form field or advanced search option.
5. Enter a keyword.
6. Click/select the date range field.
7. Select two dates in the datepicker.
8. Click Filter.
9. Click the X icon to clear results.
10. Click All Entries to clear results.

### Doc 20: A Complete Guide to Form Management
URL: https://wpforms.com/docs/a-complete-guide-to-form-management/
Feature surface: Admin

Interactions described:
1. Go to WPForms -> All Forms.
2. Hover an individual form name.
3. Click Edit.
4. Click Entries.
5. Click Preview.
6. Click Duplicate.
7. Click Trash.
8. Restore a form from Trash.
9. Click the gear icon on the Forms Overview page.
10. Select column checkboxes.
11. Click Save Changes.
12. Click Screen Options.
13. Enter rows per page.
14. Click Apply.
15. Click Name, Author, or Date to sort forms.
16. Enter keywords in the form search bar.
17. Click Search Forms.
18. Click X to clear search.
19. Enter a form ID and click Search Forms.
20. Open the form builder and click the revisions icon.

## 2. Frequency Table

| Interaction | Doc count | Earns library? |
|---|---:|---|
| Create or edit a form / open form builder | 14/20 | Yes, but mostly setup context rather than a single reusable interaction |
| Navigate WP admin -> WPForms -> Add New | 8/20 | Yes. Covered by `navAddNewForm` in `videos/_shared/wpforms-interactions.js:761` |
| Select/use a form template | 3/20 | Yes. Covered by `selectTemplate` in `videos/_shared/wpforms-interactions.js:786` |
| Search/browse/favorite templates | 1/20 | No. Inline admin DOM is fine |
| Click or drag a field into the form canvas | 6/20 | Yes. Drag path covered by `dragFieldToForm` in `videos/_shared/wpforms-interactions.js:1031` |
| Reorder or place fields by dragging within canvas/layout/page break | 3/20 | Yes candidate. Current library covers add-field drag, not arbitrary field reorder |
| Click a field to open Field Options | 5/20 | Yes. Covered by `openFieldOptions` in `videos/_shared/wpforms-interactions.js:1290` |
| Edit field label / page title / button label / field option text | 5/20 | Yes as a pattern, but only specific label coverage exists through `setFieldLabel` in `videos/_shared/wpforms-interactions.js:1346` |
| Open builder sidebar section: Settings / Marketing / Payments | 13/20 | Yes. Covered by `navBuilderSidebar` in `videos/_shared/wpforms-interactions.js:2083` |
| Open Settings sub-tab: General / Notifications / Confirmations / Spam | 9/20 | Yes. Covered by `openSettingsTab` in `videos/_shared/wpforms-interactions.js:2114` |
| Select from a native WPForms dropdown via faux visual menu | 8/20 | Yes. Covered generically by `selectFromDropdown` in `videos/_shared/wpforms-interactions.js:1813` |
| Toggle a WPForms setting control | 8/20 | Yes by frequency, but risky as too generic unless it preserves real toggle DOM. Covered by `toggleSettingControl` in `videos/_shared/wpforms-interactions.js:1853` |
| Insert Smart Tag from picker | 5/20 | Yes. Covered by `openSmartTagPicker`, `closeSmartTagPicker`, and `insertSmartTag` in `videos/_shared/wpforms-interactions.js:1715`, `videos/_shared/wpforms-interactions.js:1746`, and `videos/_shared/wpforms-interactions.js:1770` |
| Add Conditional Logic rule | 6/20 | Yes. Covered for notification logic by `addConditionalLogicRule` in `videos/_shared/wpforms-interactions.js:2014`; broader field/provider/payment CL may need future variants |
| Add notification via Add New Notification + modal prompt | 3/20 | Yes. Covered by `addNotification` in `videos/_shared/wpforms-interactions.js:1563` |
| Fill notification Send To / Subject / Message fields | 3/20 | Borderline yes for notification-focused videos. Covered by `setNotificationSendTo`, `setNotificationSubject`, and `setNotificationMessage` in `videos/_shared/wpforms-interactions.js:1644`, `videos/_shared/wpforms-interactions.js:1667`, and `videos/_shared/wpforms-interactions.js:1691` |
| Edit notification internal name after creation | 1/20 | No. Covered today by `editNotificationName` in `videos/_shared/wpforms-interactions.js:1609`, but the frequency data says inline |
| Toggle notification Active/Inactive status badge | 1/20 | No. Covered today by `setNotificationActive` in `videos/_shared/wpforms-interactions.js:1920`, but frequency data says inline |
| Collapse notification block | 1/20 | No. Covered today by `collapseNotificationBlock` in `videos/_shared/wpforms-interactions.js:1954`, but frequency data says inline |
| Duplicate notification block | 0/20 | No. Covered today by `duplicateNotificationBlock` in `videos/_shared/wpforms-interactions.js:1888`, but docs did not surface it |
| Expand a generic advanced/settings section | 2/20 | No by threshold. Covered today by `expandSettingsSection` in `videos/_shared/wpforms-interactions.js:1982`, but frequency data says inline |
| Install/activate addon and connect external account | 4/20 | Yes candidate, but likely per-addon inline because OAuth/API-key flows differ |
| Map integration fields through account/list/action/form-field dropdowns | 3/20 | Yes candidate, mostly subsumed by `selectFromDropdown` in `videos/_shared/wpforms-interactions.js:1813` |
| Entry list navigation: WPForms -> Entries -> form -> View | 4/20 | Yes candidate for Entries videos; no current library helper found in `videos/_shared/wpforms-interactions.js` |
| Export entries via Tools -> Export / entry Actions | 2/20 | No. Inline admin DOM is fine |
| Search/filter entries or forms | 3/20 | Yes candidate only if an Entries/Admin video arc repeats; no current library helper found in `videos/_shared/wpforms-interactions.js` |
| Forms Overview row actions: hover, edit, entries, preview, duplicate, trash | 1/20 | No. Inline admin DOM is fine |

## 3. Honest Verdict on Wave 2 Batch A

| Batch A method | Existing source | Frequency verdict |
|---|---|---|
| `addNotification` | `videos/_shared/wpforms-interactions.js:1563` | Keep. 3/20 docs explicitly add notifications or conditional notification variants |
| `editNotificationName` | `videos/_shared/wpforms-interactions.js:1609` | Over-promotion. 1/20 docs describe naming in the add prompt; post-hoc edit is not recurring |
| `setNotificationSendTo` | `videos/_shared/wpforms-interactions.js:1644` | Keep/borderline. Notification address setup appears in 3/20 docs and often combines with Smart Tags |
| `setNotificationSubject` | `videos/_shared/wpforms-interactions.js:1667` | Borderline. Notification field fill appears in 3/20 docs, but this exact simple input wrapper is not hard-won |
| `setNotificationMessage` | `videos/_shared/wpforms-interactions.js:1691` | Borderline. Same as subject: useful in notification videos, but simple type-into wrappers should not proliferate |
| `openSmartTagPicker` | `videos/_shared/wpforms-interactions.js:1715` | Keep. Smart Tag picker appears in 5/20 docs and is visually hard-won |
| `closeSmartTagPicker` | `videos/_shared/wpforms-interactions.js:1746` | Keep as support method for picker lifecycle, not as a standalone product interaction |
| `insertSmartTag` | `videos/_shared/wpforms-interactions.js:1770` | Keep. 5/20 docs explicitly insert Smart Tags |
| `selectFromDropdown` | `videos/_shared/wpforms-interactions.js:1813` | Keep. 8/20 docs use dropdown selection and native select visuals are a known hard-won pattern |
| `toggleSettingControl` | `videos/_shared/wpforms-interactions.js:1853` | Keep with caution. 8/20 docs toggle settings, but this should remain one generic toggle helper, not spawn per-setting wrappers |
| `duplicateNotificationBlock` | `videos/_shared/wpforms-interactions.js:1888` | Over-promotion. 0/20 docs describe duplicating notifications |
| `setNotificationActive` | `videos/_shared/wpforms-interactions.js:1920` | Over-promotion. 1/20 docs mention the Active status badge |
| `collapseNotificationBlock` | `videos/_shared/wpforms-interactions.js:1954` | Over-promotion. 1/20 docs mention collapsing notification settings |
| `expandSettingsSection` | `videos/_shared/wpforms-interactions.js:1982` | Over-promotion by strict threshold. 2/20 docs expand/navigate advanced sections |
| `addConditionalLogicRule` | `videos/_shared/wpforms-interactions.js:2014` | Keep. 6/20 docs configure conditional logic rules |

Net: 8 keep, 3 borderline, 4 clear over-promotions by the >=3-doc threshold. If the stricter philosophy is "simple input wrappers stay inline even when frequent," then `setNotificationSubject` and `setNotificationMessage` also belong in the over-promotion bucket, making the retrospective closer to 6 keep / 9 overreach.

## 4. Promotion Candidates

Only interactions appearing in at least 3 docs and not already covered by an existing Wave 1 or Batch A method are listed here.

| Candidate | Doc count | Why it earns future Wave 3 consideration |
|---|---:|---|
| Entry navigation helper: WPForms -> Entries -> choose form -> View entry | 4/20 | Entries/Admin is a heavily tutorialized surface, and no equivalent helper exists in `videos/_shared/wpforms-interactions.js` |
| Search/filter entries or forms | 3/20 | Recurs across Entries and Admin docs; promote only if a future video needs a polished admin-list search beat |
| Arbitrary field reorder / drag into Layout column / move Page Break | 3/20 | Current `dragFieldToForm` covers adding a new field at `videos/_shared/wpforms-interactions.js:1031`; docs also teach repositioning existing builder elements |
| Integration field mapping via repeated dropdown pairs | 3/20 | Mailchimp and Constant Contact both use account/list/action/form-field mapping; likely compose from `selectFromDropdown` at `videos/_shared/wpforms-interactions.js:1813` before adding a new helper |

## 5. Inline-Instead Candidates

| Tempting interaction | Doc count | Recommendation |
|---|---:|---|
| Favorite/unfavorite template card | 1/20 | Inline |
| Template search field | 1/20 | Inline |
| Delete field / delete Layout field confirmation | 2/20 | Inline unless a deletion-heavy video repeats it |
| Theme selection/custom theme copy | 1/20 | Inline |
| Export entries with many checkbox options | 2/20 | Inline; too specific to export UI |
| Forms Overview row actions: duplicate/trash/restore/sort columns | 1/20 | Inline |
| Notification Active/Inactive badge | 1/20 | Inline despite current helper |
| Collapse notification block | 1/20 | Inline despite current helper |
| Duplicate notification block | 0/20 | Inline or remove from future promotion rationale |
| Expand generic advanced/settings section | 2/20 | Inline unless paired with a hard-won animation reason |

## Bottom Line

The empirical line is not "notifications deserve a library" or "settings deserve a library." The line is narrower: Smart Tags, faux dropdowns, conditional logic, notification add/modal, builder navigation, field drag/open-options, and settings-tab navigation earn library status. Simple one-field typewriters, one-click badges, collapse toggles, and one-off admin row actions do not.

The surprising gap is Entries/Admin. WPForms has a lot of tutorial surface around entries, exports, search/filter, and form management, but `wpforms-interactions.js` is builder/notification-heavy today. I would not rush to add all of Entries/Admin; I would promote only the first repeated polished flow when a real Entries video needs it.
