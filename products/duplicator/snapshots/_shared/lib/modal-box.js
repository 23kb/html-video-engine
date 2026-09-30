/*!
 * Vendored for Duplicator snapshots (Phase 7, PLAN T12). Loaded on demand by the product
 * transitions file through SnapRuntime.lib(); never edit it here.
 * Source: Duplicator Pro 5.0.4, duplicator-pro/assets/js/modal-box.js
 * Library: DuplicatorModalBox, the plugin's iframe / HTML modal (printed inline on every page by
 * duplicator-pro/assets/js/javascript.php:271-275). Used by the Help button and the activity-log detail.
 * Copied byte for byte below this comment. md5 of the original: 1738526cbb0ab26f56889b5fdba0ec0e
 */
/*! Duplicator iframe modal box */

class DuplicatorModalBox {
    #url;
    #modal;
    #iframe;
    #htmlContent;
    #canClose;
    #closeButton;
    #openCallack;
    #closeInContent;
    #fullscreen;
    #defaultOptions;
    #closeColor = '#fff';

    constructor(options = {}) {
        this.#defaultOptions = {
            url: null,
            htmlContent: '',
            openCallback: null,
            closeColor: '#fff',
            closeInContent: false,
            fullscreen: false
        };

        this.setOptions(options);

        this.#modal = null;
        this.#iframe = null;
        this.#canClose = true;
        this.#closeButton = null;
    }

    setOptions(options = {}) {
        if (options.url) {
            this.#url = options.url;
            this.#htmlContent = '';
        } else if (!options.url && !options.htmlContent) {
            this.#url = null;
            this.#htmlContent = '';
        } else {
            this.#url = null;
            this.#htmlContent = options.htmlContent;
        }

        if (options.openCallback && typeof options.openCallback === 'function') {
            this.#openCallack = options.openCallback;
        } else {
            this.#openCallack = this.#defaultOptions.openCallback;
        }

        if (options.closeColor) {
            this.#closeColor = options.closeColor;
        }

        if (options.closeInContent) {
            this.#closeInContent = options.closeInContent;
        } else {
            this.#closeInContent = this.#defaultOptions.closeInContent;
        }

        if (options.fullscreen) {
            this.#fullscreen = options.fullscreen;
        } else {
            this.#fullscreen = this.#defaultOptions.fullscreen;
        }

        if (this.#modal !== null) {
            this.#updateContent();
        }
    }

    open() {
        // If modal is already open, do nothing
        if (this.#modal !== null) {
            return;
        }

        // Create modal element
        this.#modal = document.createElement('div');
        this.#modal.classList.add('dup-modal-wrapper');
        this.#modal.classList.add('dup-styles');

        // Add modal styles
        this.#addModalStyles();

        // Create close button
        this.#closeButton = document.createElement('div');
        this.#closeButton.classList.add('dup-modal-close-button');
        this.#closeButton.innerHTML = '<i class="fa-regular fa-circle-xmark"></i>';
        this.#closeButton.style.color = this.#closeColor;

        // Add event listener to close button
        this.#closeButton.addEventListener('click', () => {
            this.close();
        });

        // Update content
        this.#updateContent();

        // Add close button to modal
        if (this.#closeInContent) {
            this.#modal.querySelector('.dup-modal-content').appendChild(this.#closeButton);
        } else {
            this.#modal.appendChild(this.#closeButton);
        }

        // Set overflow property of body to hidden
        document.body.style.overflow = 'hidden';

        // Add opacity animation
        this.#modal.animate([
            { opacity: '0' },
            { opacity: '1' }
        ], {
            duration: 500,
            iterations: 1,
        });

        // Add modal to document
        document.body.appendChild(this.#modal);
    }

    close() {
        if (!this.#canClose || !this.#modal) {
            return;
        }

        // Remove modal from document
        document.body.removeChild(this.#modal);
        // Set overflow property of body to hidden
        document.body.style.overflow = 'auto';

        // Reset modal and iframe variables
        this.#modal = null;
        this.#iframe = null;
    }

    enableClose() {
        this.#canClose = true;
        this.#closeButton.removeAttribute('disabled');
    }

    disableClose() {
        this.#canClose = false;
        this.#closeButton.setAttribute('disabled', 'disabled');
    }

    #insertContentAsHtml() {
        let content = document.createElement('div');
        content.classList.add('dup-modal-content');
        if (this.#fullscreen) {
            content.classList.add('fullscreen');
        }
        content.innerHTML = this.#htmlContent;

        // Add content to modal
        this.#modal.appendChild(content);

        if (typeof this.#openCallack == 'function') {
            this.#openCallack(content, this);
        }
    }

    #insertContentAsIframe() {
        // Create iframe element
        this.#iframe = document.createElement('iframe');
        this.#iframe.classList.add('dup-modal-iframe');

        // Add open callback function
        if (typeof this.#openCallack == 'function') {
            let openCallack = this.#openCallack;
            let iframe = this.#iframe;
            let modalObj = this;
            this.#iframe.onload = function () {
                openCallack(iframe, modalObj);
            };
        }

        this.#iframe.src = this.#url;
        this.#iframe.setAttribute('frameborder', '0');
        this.#iframe.setAttribute('allowfullscreen', '');

        // Add iframe to modal
        this.#modal.appendChild(this.#iframe);
    }

    #updateContent() {
        if (!this.#modal) {
            return;
        }

        // Remove existing content
        if (this.#iframe) {
            this.#modal.removeChild(this.#iframe);
            this.#iframe = null;
        } else {
            const existingContent = this.#modal.querySelector('.dup-modal-content');
            if (existingContent) {
                this.#modal.removeChild(existingContent);
            }
        }

        // Update content
        if (this.#url) {
            this.#insertContentAsIframe();
        } else {
            this.#insertContentAsHtml();
        }
    }

    #addModalStyles() {
        const style = document.createElement('style');
        style.innerHTML = `
            .dup-modal-wrapper {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background-color: rgba(0, 0, 0, 0.7);
                z-index: 1000005;
                display: flex;
                justify-content: center;
                align-items: center;
            }

            .dup-styles.dup-modal-wrapper .dup-modal-iframe {
                width: 100%;
                height: 100%;
            }

            .dup-styles.dup-modal-wrapper .dup-modal-close-button {
                position: absolute;
                top: 0;
                right: 0;
                font-size: 23px;
                color: #fff;
                cursor: pointer;
                line-height: 0;
                text-align: center;
                z-index: 2;
                padding: 20px;
            }

            .dup-styles.dup-modal-wrapper .dup-modal-close-button i {
                font-size: 23px;
                line-height: normal;
            }

            .dup-styles.dup-modal-wrapper .dup-modal-close-button[disabled] {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .dup-styles.dup-modal-wrapper .dup-modal-content {
                position: relative;
                max-height: calc(100vh - 40px);
                max-width: calc(100vw - 40px);
                overflow: auto;
            }

            .dup-styles.dup-modal-wrapper .dup-modal-content.fullscreen {
                width: 100vw!important;
                height: 100vh!important;
                max-width: none;
                max-height: none;
            }

            .dup-styles.dup-modal-wrapper .dup-modal-content .dup-modal-close-button {
                padding: 9px;
            }
        `;
        document.head.appendChild(style);
    }
}
