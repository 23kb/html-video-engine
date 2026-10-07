/**
 * Botiga Wishlist
 * 
 * jQuery dependent: true
 * 
 */

'use strict';

var botiga = botiga || {};
botiga.wishList = {
  init: function init() {
    this.build();
    this.events();
  },
  build: function build() {
    var button = document.querySelectorAll('.botiga-wishlist-button, .botiga-wishlist-remove-item');
    if (!button.length) {
      return false;
    }
    for (var i = 0; i < button.length; i++) {
      button[i].addEventListener('click', function (e) {
        e.preventDefault();
        var button = this,
          productId = this.getAttribute('data-product-id'),
          wishlistLink = this.getAttribute('data-wishlist-link'),
          context = this.getAttribute('data-context'),
          type = this.getAttribute('data-type'),
          nonce = this.getAttribute('data-nonce'),
          is_wishlist_page = document.querySelector('body').classList.contains('page-template-template-wishlist');
        button.classList.add('loading');
        if (button.classList.contains('active') && event.target.closest('.botiga-wishlist-icon-wrapper[data-wishlist-remove-text]') !== null) {
          type = 'remove';
          button.classList.remove('active');
        }
        if (button.classList.contains('active')) {
          window.location = wishlistLink;
          return false;
        }
        var ajax = new XMLHttpRequest();
        ajax.open('POST', botiga.ajaxurl, true);
        ajax.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        if (is_wishlist_page && 'remove' === type) {
          button.closest('tr').classList.add('removing');
          button.classList.add('botigaAnimRotate');
          button.classList.add('botiga-anim-infinite');
        }
        ajax.onload = function () {
          if (this.status >= 200 && this.status < 400) {
            var response = JSON.parse(this.response),
              icons = document.querySelectorAll('.header-wishlist-icon'),
              qty = response.qty;
            if ('add' === type) {
              button.classList.add('active');
              if (button.closest('.single-product') !== null && button.closest('li.product') === null && button.closest('.wc-block-grid__product') === null) {
                var single_wishlist_button_text = button.querySelector('.botiga-wishlist-text');
                single_wishlist_button_text.innerHTML = single_wishlist_button_text.getAttribute('data-wishlist-view-text');
              }
            } else if (is_wishlist_page) {
              button.closest('tr').classList.add('removing');
              setTimeout(function () {
                button.closest('tr').remove();
              }, 800);
            } else if (button.closest('.single-product') !== null && button.closest('li.product') === null && button.closest('.wc-block-grid__product') === null) {
              var single_wishlist_button_text = button.querySelector('.botiga-wishlist-text');
              single_wishlist_button_text.innerHTML = single_wishlist_button_text.getAttribute('data-wishlist-add-text');
            }
            button.classList.remove('loading');
            if (icons.length) {
              for (var i = 0; i < icons.length; i++) {
                icons[i].querySelector('.count-number').innerHTML = qty;
              }
            }
            window.dispatchEvent(new Event('botiga.wishlist.ajax.loaded'));
          }
        };
        ajax.send('action=botiga_button_wishlist&product_id=' + productId + '&context=' + context + '&nonce=' + nonce + '&type=' + type);
      });
    }
  },
  events: function events() {
    var _this = this;
    window.addEventListener('botiga.carousel.initialized', function () {
      _this.build();
    });
    jQuery(document).on('yith-wcan-ajax-filtered', function () {
      _this.build();
    });

    // FiboFilters plugin
    if (typeof fiboFilters !== 'undefined') {
      var initBotigaWishlist = function initBotigaWishlist() {
        _this.build();
      };
      fiboFilters.hooks.addAction('fiboFilters.renderer.products_loaded', 'fibofilters', initBotigaWishlist);
      fiboFilters.hooks.addAction('fiboFilters.renderer.product_placeholders_overwritten', 'fibofilters', initBotigaWishlist);
    }
  }
};
document.addEventListener('DOMContentLoaded', function () {
  botiga.wishList.init();
});