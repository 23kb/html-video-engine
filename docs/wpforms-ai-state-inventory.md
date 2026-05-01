# WPForms AI State Inventory

Status: draft inventory for the guided WPForms AI video, 2026-04-28.

Purpose: preserve the real WPForms AI UI states and DOM anchors supplied by the
user before implementation begins. This is not a generated-video source path;
it is a product-truth reference for guided staging.

Video story target:

```text
online feedback survey
```

## Required Story States

| State | Purpose | Primary selectors / anchors |
|---|---|---|
| Templates card | Entry point from the templates page | `#wpforms-template-generate`, `.wpforms-template-generate`, `.wpforms-badge-purple` |
| Addon prompt | Intentional "Before We Proceed" install-addons prompt | `.wpforms-ai-forms-install-addons-modal`, `.btn-confirm`, `.btn-cancel`, `.wpforms-ai-forms-install-addons-modal-dismiss` |
| AI form chat empty | Builder-left AI panel before prompt | `wpforms-ai-chat[mode="forms"]`, `.wpforms-ai-chat-header-title`, `.wpforms-ai-chat-send`, `.wpforms-ai-chat-message-input textarea` |
| AI form empty preview | Builder-right empty state before generation | `.wpforms-panel-empty-state h4`, `.wpforms-panel-empty-state p` |
| AI form chat answered | Prompt/answer state with `Use This Form` | `.wpforms-chat-item-question`, `.wpforms-chat-item-answer.wpforms-chat-item-forms`, `.wpforms-ai-chat-use-form` |
| AI generated form preview | Online Feedback Survey draft on the right | `.wpforms-ai-form-generator-preview-title`, `.wpforms-ai-form-generator-preview-field`, `.wpforms-ai-form-generator-preview-submit` |
| AI Choices entry | Field option button for choice generation | `#wpforms-field-option-8-ai_modal_button`, `.wpforms-ai-choices-button` |
| AI Choices modal empty | Modal before choices prompt | `.jconfirm-type-ai`, `wpforms-ai-chat[mode="choices"]`, `.wpforms-ai-chat-welcome-screen-sample-prompts` |
| AI Choices modal answered | Generated choices with Insert Choices | `.wpforms-chat-item-answer.wpforms-chat-item-choices`, `.wpforms-ai-chat-choices-item`, `.wpforms-ai-chat-choices-insert` |

## Templates Entry

Use this card on the Form Templates page to show the entry into WPForms AI.

```html
<div class="wpforms-template " id="wpforms-template-generate">
  <div class="wpforms-template-thumbnail">
    <div class="wpforms-template-thumbnail-placeholder">
      <img src="http://sulliesbakery.com/wp-content/plugins/wpforms/assets/images/integrations/ai/ai-feature-icon.svg" alt="Generate With AI" loading="lazy">
    </div>
  </div>
  <div class="wpforms-template-name-wrap">
    <h3 class="wpforms-template-name categories has-access favorite slug subcategories fields" data-categories="all,new" data-subcategories="" data-fields="" data-has-access="1" data-favorite="" data-slug="generate">
      Generate With AI
    </h3>
    <span class="wpforms-badge wpforms-badge-sm wpforms-badge-inline wpforms-badge-purple wpforms-badge-rounded">NEW!</span>
  </div>
  <p class="wpforms-template-desc">
    Write simple prompts to create complex forms catered to your specific needs.
  </p>
  <div class="wpforms-template-buttons">
    <a href="#" class="wpforms-template-generate wpforms-btn wpforms-btn-md wpforms-btn-purple-dark">
      Generate Form
    </a>
  </div>
</div>
```

## Addon Prompt

Show this if the recommended-addons prompt appears after `Generate Form`. It is
part of the desired walkthrough, not something to skip.

```html
<div class="jconfirm-box jconfirm-hilight-shake jconfirm-type-purple jconfirm-type-animated wpforms-ai-forms-install-addons-modal" role="dialog">
  <div class="jconfirm-title-c">
    <span class="jconfirm-icon-c"><i class="fa fa-info-circle"></i></span>
    <span class="jconfirm-title">Before We Proceed</span>
  </div>
  <div class="jconfirm-content">
    <div>In order to build the best forms possible, we need to install some addons. Would you like to install the recommended addons?</div>
  </div>
  <div class="jconfirm-buttons">
    <button type="button" class="btn btn-confirm">Yes, Install</button>
    <button type="button" class="btn btn-cancel">No, Thanks</button>
  </div>
  <label class="jconfirm-checkbox">
    <input type="checkbox" class="jconfirm-checkbox-input wpforms-ai-forms-install-addons-modal-dismiss">
    Don't show this again
  </label>
</div>
```

## AI Form Chat, Empty

Left builder panel after clicking `Generate Form`.

```html
<div class="wpforms-panel-sidebar">
  <div class="wpforms-panel-sidebar-header">
    <button type="button" class="wpforms-btn-back-to-templates" aria-label="Back to Templates">Back to Templates</button>
  </div>
  <wpforms-ai-chat mode="forms" class="wpforms-ai-chat-blue">
    <div class="wpforms-ai-chat">
      <div class="wpforms-ai-chat-message-list wpforms-scrollbar-compact">
        <div class="wpforms-ai-chat-message-item item-primary">
          <div class="wpforms-ai-chat-welcome-screen">
            <div class="wpforms-ai-chat-header">
              <h3 class="wpforms-ai-chat-header-title">Generate a Form</h3>
              <span class="wpforms-ai-chat-header-description">
                Describe the form you would like to create or use one of the example prompts below to get started.
                <a href="https://wpforms.com/features/wpforms-ai/" target="_blank" rel="noopener noreferrer">Learn More About WPForms AI</a>
              </span>
            </div>
            <ul class="wpforms-ai-chat-welcome-screen-sample-prompts">
              <li><i class="wpforms-ai-chat-sample-restaurant"></i><a href="#">Restaurant customer satisfaction survey</a></li>
              <li><i class="wpforms-ai-chat-sample-ticket"></i><a href="#">Online event registration</a></li>
              <li><i class="wpforms-ai-chat-sample-design"></i><a href="#">Job application for a web designer</a></li>
              <li><i class="wpforms-ai-chat-sample-stop"></i><a href="#">Cancellation survey for a subscription</a></li>
              <li><i class="wpforms-ai-chat-sample-pizza"></i><a href="#">Takeout order for a pizza store</a></li>
              <li><i class="wpforms-ai-chat-sample-market"></i><a href="#">Market vendor application</a></li>
              <li><i class="wpforms-ai-chat-sample-quiz-capitals"></i><a href="#">How well do you know world capitals?</a></li>
              <li><i class="wpforms-ai-chat-sample-quiz-learn"></i><a href="#">What is your ideal learning style?</a></li>
              <li><i class="wpforms-ai-chat-sample-quiz-business"></i><a href="#">How prepared are you to start a business?</a></li>
            </ul>
          </div>
        </div>
      </div>
      <div class="wpforms-ai-chat-message-input">
        <textarea placeholder="What would you like to create?"></textarea>
        <button type="button" class="wpforms-ai-chat-send"></button>
        <button type="button" class="wpforms-ai-chat-stop wpforms-hidden"></button>
      </div>
    </div>
  </wpforms-ai-chat>
</div>
```

Right builder panel before a form is generated.

```html
<div class="wpforms-panel-content-wrap">
  <div class="wpforms-panel-content">
    <div class="wpforms-panel-empty-state">
      <h4>Build Your Form Fast With the Help of AI</h4>
      <p>Not sure where to begin? Use our Generative AI tool to get started or take your pick from our wide variety of fields and start building out your form!</p>
    </div>
  </div>
</div>
```

## AI Form Chat, Answered

The user supplied a pizza example for this state. For the actual video, keep the
same DOM shape but replace the prompt/answer copy with the online feedback
survey story.

Required anchors:

```html
<div class="wpforms-chat-item wpforms-chat-item-question">online feedback survey form</div>
<div class="wpforms-chat-item wpforms-chat-item-answer active wpforms-chat-item-forms">
  <div class="wpforms-chat-item-content">
    <h4>Here's the Online Feedback Survey form...</h4>
    <span>How's that? Are you ready to use this form?</span>
    <div class="wpforms-ai-chat-answer-buttons">
      <button type="button" class="wpforms-ai-chat-use-form wpforms-ai-chat-answer-action wpforms-btn-sm wpforms-btn-orange">
        <span>Use This Form</span>
      </button>
      <div class="wpforms-ai-chat-answer-buttons-response">
        <button type="button" class="wpforms-ai-chat-answer-button dislike wpforms-help-tooltip" title="Bad response"></button>
        <button type="button" class="wpforms-ai-chat-answer-button refresh wpforms-help-tooltip" title="Clear chat history">
          <i class="fa fa-trash-o"></i>
        </button>
      </div>
    </div>
  </div>
</div>
```

## AI Generated Preview: Online Feedback Survey

Use these real preview fields for the generated right-side payoff.

```html
<div class="wpforms-panel-content">
  <h2 class="wpforms-ai-form-generator-preview-title">Online Feedback Survey</h2>
  <div class="wpforms-panel-empty-state wpforms-hidden-strict">
    <h4>Build Your Form Fast With the Help of AI</h4>
    <p>Not sure where to begin? Use our Generative AI tool to get started or take your pick from our wide variety of fields and start building out your form!</p>
  </div>

  <div id="wpforms-generator-field-1" class="wpforms-ai-form-generator-preview-field">
    <div class="wpforms-field wpforms-field-name fade-in tooltipstered wpforms-quiz-field-included">
      <label class="label-title"><span class="text">Name</span><span class="required">*</span></label>
      <div class="format-selected-first-last format-selected wpforms-clear">
        <div class="wpforms-first-name"><input type="text" class="primary-input" readonly=""><label class="wpforms-sub-label">First</label></div>
        <div class="wpforms-last-name"><input type="text" class="primary-input" readonly=""><label class="wpforms-sub-label">Last</label></div>
      </div>
    </div>
  </div>

  <div id="wpforms-generator-field-2" class="wpforms-ai-form-generator-preview-field">
    <div class="wpforms-field wpforms-field-email fade-in tooltipstered wpforms-quiz-field-included">
      <label class="label-title"><span class="text">Email</span><span class="required">*</span></label>
      <div class="wpforms-confirm wpforms-confirm-disabled">
        <div class="wpforms-confirm-primary"><input type="email" class="primary-input" readonly=""><label class="wpforms-sub-label">Email</label></div>
      </div>
    </div>
  </div>

  <div id="wpforms-generator-field-3" class="wpforms-ai-form-generator-preview-field">
    <div class="wpforms-field wpforms-field-rating fade-in required tooltipstered wpforms-quiz-field-included">
      <label class="label-title"><span class="text">Overall rating</span><span class="required">*</span></label>
      <div class="wpforms-rating-field">
        <div class="wpforms-rating-field-icons">
          <i class="fa fa-star medium rating-icon" style="color:#f5b301; display:inline-block; font-size:24px;"></i>
          <i class="fa fa-star medium rating-icon" style="color:#f5b301; display:inline-block; font-size:24px;"></i>
          <i class="fa fa-star medium rating-icon" style="color:#f5b301; display:inline-block; font-size:24px;"></i>
          <i class="fa fa-star medium rating-icon" style="color:#f5b301; display:inline-block; font-size:24px;"></i>
          <i class="fa fa-star medium rating-icon" style="color:#f5b301; display:inline-block; font-size:24px;"></i>
        </div>
      </div>
    </div>
  </div>

  <div id="wpforms-generator-field-4" class="wpforms-ai-form-generator-preview-field">
    <div class="wpforms-field wpforms-field-net_promoter_score fade-in required tooltipstered wpforms-quiz-field-included">
      <label class="label-title"><span class="text">How likely are you to recommend us?</span><span class="required">*</span></label>
      <table class="modern">
        <thead><tr><th colspan="11"><span class="not-likely">Not likely</span><span class="extremely-likely">Extremely likely</span></th></tr></thead>
        <tbody><tr><td><input type="radio" readonly=""><label>0</label></td><td><input type="radio" readonly=""><label>1</label></td><td><input type="radio" readonly=""><label>2</label></td><td><input type="radio" readonly=""><label>3</label></td><td><input type="radio" readonly=""><label>4</label></td><td><input type="radio" readonly=""><label>5</label></td><td><input type="radio" readonly=""><label>6</label></td><td><input type="radio" readonly=""><label>7</label></td><td><input type="radio" readonly=""><label>8</label></td><td><input type="radio" readonly=""><label>9</label></td><td><input type="radio" readonly=""><label>10</label></td></tr></tbody>
      </table>
    </div>
  </div>

  <div id="wpforms-generator-field-5" class="wpforms-ai-form-generator-preview-field">
    <div class="wpforms-field wpforms-field-textarea fade-in tooltipstered wpforms-quiz-field-included">
      <label class="label-title"><span class="text">What did you like?</span><span class="required">*</span></label>
      <textarea class="primary-input" readonly=""></textarea>
    </div>
  </div>

  <div id="wpforms-generator-field-6" class="wpforms-ai-form-generator-preview-field">
    <div class="wpforms-field wpforms-field-textarea fade-in tooltipstered wpforms-quiz-field-included">
      <label class="label-title"><span class="text">What can we improve?</span><span class="required">*</span></label>
      <textarea class="primary-input" readonly=""></textarea>
    </div>
  </div>

  <div id="wpforms-generator-field-7" class="wpforms-ai-form-generator-preview-field">
    <div class="wpforms-field wpforms-field-select fade-in tooltipstered wpforms-quiz-field-included">
      <label class="label-title"><span class="text">How did you find us?</span><span class="required">*</span></label>
      <select class="primary-input" readonly="">
        <option value="Search engine">Search engine</option>
        <option value="Social media">Social media</option>
        <option value="Friend or colleague">Friend or colleague</option>
        <option value="Advertisement">Advertisement</option>
        <option value="Other">Other</option>
      </select>
    </div>
  </div>

  <button type="button" value="Submit" class="wpforms-ai-form-generator-preview-submit">Submit</button>
</div>
```

## AI Choices Entry

The feature works with Multiple Choice, Dropdown, and Checkboxes fields.

```html
<button type="button" class="wpforms-btn-purple wpforms-ai-modal-button wpforms-ai-choices-button wpforms-btn" id="wpforms-field-option-8-ai_modal_button" data-field-id="8">Generate Choices</button>
```

## AI Choices Modal, Empty

```html
<div class="jconfirm-box jconfirm-hilight- jconfirm-type-ai jconfirm-type-animated" role="dialog" style="max-width: 650px;">
  <div class="wpforms-ai-modal-top-bar">
    <div class="wpforms-ai-modal-pin" title="Dock to the Right"></div>
    <div class="jconfirm-closeIcon" title="Close" style="display: block;">x</div>
  </div>
  <div class="jconfirm-content">
    <wpforms-ai-chat mode="choices" field-id="8">
      <div class="wpforms-ai-chat">
        <div class="wpforms-ai-chat-message-list wpforms-scrollbar-compact">
          <div class="wpforms-ai-chat-message-item item-primary">
            <div class="wpforms-ai-chat-welcome-screen">
              <div class="wpforms-ai-chat-header">
                <h3 class="wpforms-ai-chat-header-title">Generate Choices</h3>
                <span class="wpforms-ai-chat-header-description">
                  Describe the choices you would like to create or use one of the examples below to get started.
                  <a href="https://wpforms.com/features/wpforms-ai/" target="_blank" rel="noopener noreferrer">Learn More About WPForms AI</a>
                </span>
              </div>
              <ul class="wpforms-ai-chat-welcome-screen-sample-prompts">
                <li><i class="wpforms-ai-chat-flag"></i><a href="#">american public holidays with dates in brackets</a></li>
                <li><i class="wpforms-ai-chat-clover"></i><a href="#">provinces of canada ordered by population</a></li>
                <li><i class="wpforms-ai-chat-thumbs-up"></i><a href="#">top 5 social networks in europe</a></li>
                <li><i class="wpforms-ai-chat-globe"></i><a href="#">top 10 most spoken languages in the world</a></li>
                <li><i class="wpforms-ai-chat-palm"></i><a href="#">top 20 most popular tropical travel destinations</a></li>
                <li><i class="wpforms-ai-chat-shop"></i><a href="#">30 household item categories for a marketplace</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div class="wpforms-ai-chat-message-input">
          <textarea placeholder="What would you like to create?"></textarea>
          <button type="button" class="wpforms-ai-chat-send"></button>
          <button type="button" class="wpforms-ai-chat-stop wpforms-hidden"></button>
        </div>
      </div>
    </wpforms-ai-chat>
  </div>
</div>
```

## AI Choices Modal, Answered

```html
<div class="jconfirm-box jconfirm-hilight- jconfirm-type-ai jconfirm-type-animated" role="dialog" style="max-width: 650px;">
  <div class="wpforms-ai-modal-top-bar scrolled">
    <div class="wpforms-ai-modal-pin" title="Dock to the Right"></div>
    <div class="jconfirm-closeIcon" title="Close" style="display: block;">x</div>
  </div>
  <wpforms-ai-chat mode="choices" field-id="8">
    <div class="wpforms-ai-chat" data-session-id="019dd527-d7f3-7bb2-a8e1-109b9e8524b9">
      <div class="wpforms-ai-chat-message-list wpforms-scrollbar-compact">
        <div class="wpforms-ai-chat-divider"></div>
        <div class="wpforms-chat-item wpforms-chat-item-question">top 5 social networks in europe</div>
        <div class="wpforms-chat-item wpforms-chat-item-answer active wpforms-chat-item-choices">
          <div class="wpforms-chat-item-content">
            <h4>Top 5 Social Networks in Europe</h4>
            <ol>
              <li class="wpforms-ai-chat-choices-item">Facebook</li>
              <li class="wpforms-ai-chat-choices-item">Instagram</li>
              <li class="wpforms-ai-chat-choices-item">TikTok</li>
              <li class="wpforms-ai-chat-choices-item">LinkedIn</li>
              <li class="wpforms-ai-chat-choices-item">Twitter</li>
            </ol>
            <span><strong>What do you think of these choices?</strong> If you're happy with them, you can insert these choices, or make changes by entering additional prompts.</span>
            <div class="wpforms-ai-chat-answer-buttons">
              <button type="button" class="wpforms-ai-chat-choices-insert wpforms-ai-chat-answer-action wpforms-btn-sm wpforms-btn-orange">
                <span>Insert Choices</span>
              </button>
              <div class="wpforms-ai-chat-answer-buttons-response">
                <button type="button" class="wpforms-ai-chat-answer-button dislike wpforms-help-tooltip" title="Bad response"></button>
                <button type="button" class="wpforms-ai-chat-answer-button refresh wpforms-help-tooltip" title="Clear chat history"><i class="fa fa-trash-o"></i></button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="wpforms-ai-chat-message-input">
        <textarea placeholder="What would you like to create?"></textarea>
        <button type="button" class="wpforms-ai-chat-send"></button>
        <button type="button" class="wpforms-ai-chat-stop wpforms-hidden"></button>
      </div>
    </div>
  </wpforms-ai-chat>
</div>
```

## Implementation Notes

- Keep the video story consistent with `online feedback survey`; ignore the
  earlier pizza generated-form content except as proof of DOM shape.
- The supplied full generated survey markup contains extra accessibility helper
  spans (`.hidden_text`, `.empty_text`) and quiz-addon classes. Preserve or
  strip them deliberately depending on how clean the staged shot needs to be.
- The NPS field is visually dense. In the postIntro payoff, show only enough of
  the form draft to communicate: Name, Email, Overall rating, feedback text
  areas, and source dropdown.
- AI Choices examples can use the supplied "top 5 social networks in europe"
  state unless the storyboard changes the choice-field story.
