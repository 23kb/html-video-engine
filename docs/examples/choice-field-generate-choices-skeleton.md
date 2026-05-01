# Choice Field Generate Choices Skeleton

Choice-field videos (`Dropdown`, `Multiple Choice`, `Checkboxes`) should show
the AI 'Generate Choices' button by default when the source UI exists or can be
grounded in real product-derived markup. Cover the button, modal, generated
options, and insertion/apply result.

Default implementation path: legacy/effect-mode. This keeps the modal, prompt,
generated rows, and apply result choreographed without weakening the flow into
a few descriptor highlights.

```js
import sel from './_selectors.js';

export const snapshot = 'builder-field-options-select';
export const validator = { snapshot: 'builder-field-options-select' };
export const mode = 'audio-cued';
export const narration = 'generate-choices';
export const breakStyle = 'soft-dolly';
export const swapStyle = 'cover';

// Paste only real captured/product-derived modal HTML approved in storyboard.
const CHOICES_MODAL_HTML = `<div class="real-product-derived-modal">...</div>`;
const GENERATED_CHOICES = ['Sourdough', 'Croissant', 'Cupcake'];

function installModalStyles(doc) {
  if (doc.getElementById('choice-ai-polish')) return;
  const style = doc.createElement('style');
  style.id = 'choice-ai-polish';
  style.textContent = `
    .choice-ai-modal {
      position: fixed;
      inset: 0;
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(114,119,124,.72);
      opacity: 0;
      transition: opacity .28s ease;
    }
    .choice-ai-modal.is-visible { opacity: 1; }
  `;
  doc.head.appendChild(style);
}

function mountGenerateChoicesModal(doc) {
  const modal = doc.createElement('div');
  modal.className = 'choice-ai-modal';
  modal.innerHTML = CHOICES_MODAL_HTML;
  doc.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('is-visible'));
  return modal;
}

function applyGeneratedChoices(doc) {
  const list = doc.querySelector(sel.choicesList);
  const preview = doc.querySelector(sel.previewSelect);
  if (list) {
    // Replace using real row structure when available; this simplified block is
    // a placeholder until the storyboard names the product-derived row source.
  }
  if (preview) {
    preview.innerHTML = '';
    GENERATED_CHOICES.forEach((label) => {
      const option = doc.createElement('option');
      option.value = label;
      option.textContent = label;
      preview.appendChild(option);
    });
  }
}

export default [
  {
    id: 'generate-choices-flow',
    chapter: 'generate-choices',
    camera: { focus: sel.generateChoicesButton, level: 1.18, pad: 16 },
    effect: async ({ doc, cursor, type, waitAt, sleep, highlight, clearHighlights }) => {
      installModalStyles(doc);

      await waitAt(0.7);
      await highlight([sel.generateChoicesButton], { label: 'Generate Choices', pad: 10 });
      await cursor.moveTo(sel.generateChoicesButton);

      await waitAt(2.0);
      const modal = mountGenerateChoicesModal(doc);
      await clearHighlights();

      await waitAt(3.4);
      await type(sel.generateChoicesPrompt, 'popular bakery items for a customer feedback form', {
        clear: true,
      });

      await waitAt(6.2);
      // Stage generated options inside the real/product-derived modal body.

      await waitAt(8.2);
      applyGeneratedChoices(doc);
      modal.classList.remove('is-visible');
      await sleep(300);
      modal.remove();
    },
    duration: 0.2,
  },
];
```

Production-truth checks:

- The modal HTML must be real captured DOM, a real product snippet, or
  user-supplied product-derived markup approved in the storyboard.
- Replace placeholder selectors with catalog-grounded selectors from a real
  snapshot.
- Do not fabricate WPForms-looking modal HTML.
- If a clean modal snapshot exists, using it is preferred over pasted snippets.
