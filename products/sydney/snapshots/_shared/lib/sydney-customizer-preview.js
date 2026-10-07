/**
 * Theme Customizer enhancements for a better user experience.
 *
 * Contains handlers to make Theme Customizer preview reload changes asynchronously.
 */
( function( $ ) {
	// Site title and description.
	wp.customize( 'blogname', function( value ) {
		value.bind( function( to ) {
			$( '.site-title a' ).text( to );
		} );
	} );
	wp.customize( 'blogdescription', function( value ) {
		value.bind( function( to ) {
			$( '.site-description' ).text( to );
		} );
	} );
	// Header text color.
	wp.customize( 'header_textcolor', function( value ) {
		value.bind( function( to ) {
			if ( 'blank' === to ) {
				$( '.site-title, .site-description' ).css( {
					'clip': 'rect(1px, 1px, 1px, 1px)',
					'position': 'absolute'
				} );
			} else {
				$( '.site-title, .site-description' ).css( {
					'clip': 'auto',
					'color': to,
					'position': 'relative'
				} );
			}
		} );
	} );

	//Site title
	wp.customize('site_title_color',function( value ) {
		value.bind( function( newval ) {
			$('.site-title a').css('color', newval );
		} );
	});
	//Site desc
	wp.customize('site_desc_color',function( value ) {
		value.bind( function( newval ) {
			$('.site-description').css('color', newval );
		} );
	});
	//Top level menu items
	wp.customize('top_items_color',function( value ) {
		value.bind( function( newval ) {
			$('#mainnav ul li a').not('#mainnav .sub-menu li a').css('color', newval );
		} );
	});	
	//Sub-menu items
	wp.customize('submenu_items_color',function( value ) {
		value.bind( function( newval ) {
			$('#mainnav .sub-menu li a ').css('color', newval );
		} );
	});
	//Slider text
	wp.customize('slider_text',function( value ) {
		value.bind( function( newval ) {
			$('.text-slider .maintitle, .text-slider .subtitle').css('color', newval );
		} );
	});	
	wp.customize( 'swc_loop_product_alignment', function( value ) {
		value.bind( function( to ) {
			$( '.woocommerce ul.products li.product' ).css( 'text-align', to );
		} );
	} );


	wp.customize( 'slider_v_alignment', function( value ) {
		value.bind( function( to ) {
			if ( 'top' === to ) {
				$( '.slide-inner' ).css( {
					'top': '0',
					'transform': 'none',
					'padding-top': '30px'
				} );
			} else if ( 'middle' === to ) {
				$( '.slide-inner' ).css( {
					'top': '50%',
					'bottom': 'auto',
					'transform': 'translateY(-50%)'
				} );
			} else if ( 'bottom' === to ) {
				$( '.slide-inner' ).css( {
					'bottom': '0',
					'top': 'auto',
					'transform': 'none',
					'padding-bottom': '30px'
				} );
			}
		} );
	} );

	wp.customize( 'slider_h_alignment', function( value ) {
		value.bind( function( to ) {
			$('.slide-inner').removeClass( 'slider-align-left slider-align-center slider-align-right' );
			$('.slide-inner').addClass( 'slider-align-' + to );
		} );
	} );

	wp.customize( 'slider_text_animation', function( value ) {
		value.bind( function( to ) {
			$('.text-slider').css('animation-name', to );
		} );
	} );

	wp.customize( 'slider_button_animation', function( value ) {
		value.bind( function( to ) {
			$('.button-slider').css('animation-name', to );
		} );
	} );

	// Body text color
	wp.customize('body_text_color',function( value ) {
		value.bind( function( newval ) {
			$('body').css('color', newval );
		} );
	});		
	//Sidebar background
	wp.customize('sidebar_background',function( value ) {
		value.bind( function( newval ) {
			$('#secondary').css('background-color', newval );
		} );
	});	
	//Sidebar color
	wp.customize('sidebar_color',function( value ) {
		value.bind( function( newval ) {
			$('.widget-area,.widget-area a, .widget-area .widget-title').css('color', newval );
		} );
	});
	//Footer widgets background
	wp.customize('footer_widgets_background',function( value ) {
		value.bind( function( newval ) {
			$('.footer-widgets').css('background-color', newval );
		} );
	});	
	//Footer widgets color
	wp.customize('footer_widgets_color',function( value ) {
		value.bind( function( newval ) {
			$('.sidebar-column .widget, .sidebar-column h2, .sidebar-column h3, .sidebar-column h4, .sidebar-column h5, .sidebar-column h6').css('color', newval );
		} );
	});	
	wp.customize('footer_widgets_links_color',function( value ) {
		value.bind( function( newval ) {
			$('.sidebar-column .widget a').css('color', newval );
		} );
	});		
	//Footer background
	wp.customize('footer_background',function( value ) {
		value.bind( function( newval ) {
			$('.site-footer').css('background-color', newval );
		} );
	});
	//Footer color
	wp.customize('footer_color',function( value ) {
		value.bind( function( newval ) {
			$('.sydney-credits,.sydney-credits a').css('color', newval );
		} );
	});


	//Breadcrumbs
	wp.customize( 'breadcrumbs_align', function( value ) {
		value.bind( function( to ) {
			$( '.sydney-breadcrumb-trail' ).css( 'text-align', to );
		} );
	} );

	//Slider
	wp.customize( 'slider_image_1', function( value ) {
		value.bind( function( to ) {
			$( '.slide-item:eq(0)' ).css( 'background-image', 'url(' + to + ')' );
		} );
	} );	
	wp.customize( 'slider_image_2', function( value ) {
		value.bind( function( to ) {
			$( '.slide-item:eq(1)' ).css( 'background-image', 'url(' + to + ')' );
		} );
	} );	
	wp.customize( 'slider_image_3', function( value ) {
		value.bind( function( to ) {
			$( '.slide-item:eq(2)' ).css( 'background-image', 'url(' + to + ')' );
		} );
	} );	
	wp.customize( 'slider_image_4', function( value ) {
		value.bind( function( to ) {
			$( '.slide-item:eq(3)' ).css( 'background-image', 'url(' + to + ')' );
		} );
	} );	
	wp.customize( 'slider_image_5', function( value ) {
		value.bind( function( to ) {
			$( '.slide-item:eq(4)' ).css( 'background-image', 'url(' + to + ')' );
		} );
	} );
	wp.customize( 'slider_button_url', function( value ) {
		value.bind( function( to ) {
			$( '.button-slider' ).attr( 'href', to );
		} );
	} );	

	//Primary color
	wp.customize( 'primary_color', function( value ) {
		value.bind( function( to ) {

			var styleContents = $( '#sydney-style-min-inline-css' ).text();

			/* Break function in two */
			var newStyle = styleContents + '.header-contact-info svg,.site-header .cart-contents:hover svg, .site-header .header-account:hover svg,.sydney_contact_info_widget span { fill:' + to + '}.widget-area .widget_fp_social a,#mainnav ul li a:hover, .sydney_contact_info_widget span, .roll-team .team-content .name,.roll-team .team-item .team-pop .team-social li:hover a,.roll-infomation li.address:before,.roll-infomation li.phone:before,.roll-infomation li.email:before,.roll-testimonials .name,.roll-button.border,.roll-button:hover,.roll-icon-list .icon i,.roll-icon-list .content h3 a:hover,.roll-icon-box.white .content h3 a,.roll-icon-box .icon i,.roll-icon-box .content h3 a:hover,.switcher-container .switcher-icon a:focus,.go-top:hover,.hentry .meta-post a:hover,#mainnav > ul > li > a.active, #mainnav > ul > li > a:hover, button:hover, input[type=\"button\"]:hover, input[type=\"reset\"]:hover, input[type=\"submit\"]:hover, .text-color, .social-menu-widget a, .social-menu-widget a:hover, .archive .team-social li a, a, h1 a, h2 a, h3 a, h4 a, h5 a, h6 a,.classic-alt .meta-post a,.single .hentry .meta-post a, .content-area.modern .hentry .meta-post span:before, .content-area.modern .post-cat,.content-area.modern .read-more-gt { color:' + to + '}.reply,.woocommerce #respond input#submit,.woocommerce a.button,.woocommerce button.button,.woocommerce input.button,.project-filter li a.active, .project-filter li a:hover,.preloader .pre-bounce1, .preloader .pre-bounce2,.roll-team .team-item .team-pop,.roll-progress .progress-animate,.roll-socials li a:hover,.roll-project .project-item .project-pop,.roll-project .project-filter li.active,.roll-project .project-filter li:hover,.roll-button.light:hover,.roll-button.border:hover,.roll-button,.roll-icon-box.white .icon,.owl-theme .owl-controls .owl-page.active span,.owl-theme .owl-controls.clickable .owl-page:hover span,.go-top,.bottom .socials li:hover a,.sidebar .widget:before,.blog-pagination ul li.active,.blog-pagination ul li:hover a,.content-area .hentry:after,.text-slider .maintitle:after,.error-wrap #search-submit:hover,#mainnav .sub-menu li:hover > a,#mainnav ul li ul:after, button, input[type=\"button\"], input[type=\"reset\"], input[type=\"submit\"], .cart-amount, .panel-grid-cell .widget-title:after { background-color:' + to + '}.roll-socials li a:hover,.roll-socials li a,.roll-button.light:hover,.roll-button.border,.roll-button,.roll-icon-list .icon,.roll-icon-box .icon,.owl-theme .owl-controls .owl-page span,.comment .comment-detail,.widget-tags .tag-list a:hover,.blog-pagination ul li,.hentry blockquote,.error-wrap #search-submit:hover,textarea:focus,input[type=\"text\"]:focus,input[type=\"password\"]:focus,input[type=\"datetime\"]:focus,input[type=\"datetime-local\"]:focus,input[type=\"date\"]:focus,input[type=\"month\"]:focus,input[type=\"time\"]:focus,input[type=\"week\"]:focus,input[type=\"number\"]:focus,input[type=\"email\"]:focus,input[type=\"url\"]:focus,input[type=\"search\"]:focus,input[type=\"tel\"]:focus,input[type=\"color\"]:focus, button, input[type=\"button\"], input[type=\"reset\"], input[type=\"submit\"], .archive .team-social li a { border-color:' + to + '}';
			$( '#sydney-style-min-inline-css' ).text(newStyle);

		} );
	} );		

	//Body font family
	wp.customize( 'body_font', function( value ) {
		value.bind( function( to ) {

			$( '#sydney-preview-google-fonts-body-css' ).attr( 'href', 'https://fonts.googleapis.com/css?family=' + to.replace(/ /g, '+') + '&display=swap' );

			$( 'body, #mainnav ul ul a' ).css( 'font-family', to );
		} );
	} );
	
	
	//Headings font family
	wp.customize( 'headings_font', function( value ) {
		value.bind( function( to ) {

			$( '#sydney-preview-google-fonts-headings-css' ).attr( 'href', 'https://fonts.googleapis.com/css?family=' + to.replace(/ /g, '+') + '&display=swap' );

			$( 'h1, h2, h3, h4, h5, h6, #mainnav ul li a, .portfolio-info, .roll-testimonials .name, .roll-team .team-content .name, .roll-team .team-item .team-pop .name, .roll-tabs .menu-tab li a, .roll-testimonials .name, .roll-project .project-filter li a, #secondary .widget_recent_entries li a, .roll-button, button, input[type=\"button\"], input[type=\"reset\"], input[type=\"submit\"]' ).css( 'font-family', to );
		} );
	} );	
	
	//Loop button icon hide
	wp.customize('swc_archive_button_icon',function( value ) {
		value.bind( function( to ) {
			if ( true === to ) {
				$('.woocommerce ul.products li.product .button .sydney-svg-icon').css('display', 'none' );
			} else {
				$('.woocommerce ul.products li.product .button .sydney-svg-icon').css('display', 'inline-block' );
			}
		} );
	});	

	wp.customize( 'shop_product_card_radius', function( value ) {
		value.bind( function( to ) {
			$( '.woocommerce ul.products li.product' ).css( 'border-radius', to + 'px' );
		} );
	} );

	wp.customize( 'shop_product_card_thumb_radius', function( value ) {
		value.bind( function( to ) {
			$( '.woocommerce ul.products li.product .loop-image-wrap' ).css( 'border-radius', to + 'px' );
		} );
	} );

	wp.customize( 'shop_product_card_border_size', function( value ) {
		value.bind( function( to ) {
			$( '.woocommerce ul.products li.product' ).css( 'border-width', to + 'px' );
		} );
	} );

	//Loop product alignment
	wp.customize( 'swc_loop_product_alignment', function( value ) {
		value.bind( function( to ) {
			$( '.woocommerce ul.products li.product' ).css( 'text-align', to );
		} );
	} );


	wp.customize( 'shop_archive_header_button_border_radius', function( value ) {
		value.bind( function( to ) {
			$( '.woocommerce-page-header .category-button' ).css( 'border-radius', to + 'px' );
		} );
	} );

	wp.customize( 'swc_loop_button_bg', function( value ) {
		value.bind( function( to ) {
			$( '.woocommerce ul.products li.product .loop-button-wrapper .button' ).css( 'background-color', to );
		} );
	} );	
	wp.customize( 'swc_loop_button_color', function( value ) {
		value.bind( function( to ) {
			$( '.woocommerce ul.products li.product .loop-button-wrapper .button' ).css( {
				'color': to,
				'fill': to
			} );
		} );
	} );
	wp.customize('swc_loop_button_size',function( value ) {
		value.bind( function( to ) {
			if ( 'small' == to ) {
				$('.woocommerce ul.products li.product .loop-button-wrapper .button').css('padding', '0.618em 1em' );
			} else if ( 'medium' == to ) {
				$('.woocommerce ul.products li.product .loop-button-wrapper .button').css('padding', '12px 24px' );
			} else {
				$('.woocommerce ul.products li.product .loop-button-wrapper .button').css('padding', '15px 28px' );
			}
		} );
	});	
	wp.customize('swc_loop_button_font_size',function( value ) {
		value.bind( function( to ) {
			$('.woocommerce ul.products li.product .loop-button-wrapper .button ').css('font-size', to + 'px');
		} );
	});

	//Sale badge
	wp.customize( 'swc_loop_salebadge_bg_color', function( value ) {
		value.bind( function( to ) {
			$( '.woocommerce ul.products li.product .onsale, .yith-wcqv-main span.onsale, .woocommerce span.onsale' ).css( 'background-color', to );
		} );
	} );	
	wp.customize( 'swc_loop_salebadge_color', function( value ) {
		value.bind( function( to ) {
			$( '.woocommerce ul.products li.product .onsale, .yith-wcqv-main span.onsale, .woocommerce span.onsale' ).css( 'color', to );
		} );
	} );	
	wp.customize('swc_loop_salebadge_font_size',function( value ) {
		value.bind( function( to ) {
			$( '.woocommerce ul.products li.product .onsale, .yith-wcqv-main span.onsale, .woocommerce span.onsale' ).css('font-size', to + 'px');
		} );
	});

	//Loop product titles
	wp.customize('swc_loop_product_title_font_size',function( value ) {
		value.bind( function( to ) {
			$( '.woocommerce ul.products li.product h2' ).css('font-size', to + 'px');
		} );
	});	
	wp.customize( 'swc_loop_product_title_color', function( value ) {
		value.bind( function( to ) {
			$( '.woocommerce ul.products li.product h2' ).css( 'color', to );
		} );
	} );	

	//Loop product prices
	wp.customize('swc_loop_product_price_font_size',function( value ) {
		value.bind( function( to ) {
			$( '.woocommerce ul.products li.product .price' ).css('font-size', to + 'px');
		} );
	});	
	wp.customize( 'swc_loop_product_price_color', function( value ) {
		value.bind( function( to ) {
			$( '.woocommerce ul.products li.product .price' ).css( 'color', to );
		} );
	} );		

	//Single product title
	wp.customize('swc_single_product_title_font_size',function( value ) {
		value.bind( function( to ) {
			$( '.woocommerce .product-gallery-summary .product_title' ).css('font-size', to + 'px');
		} );
	});	
	wp.customize( 'swc_single_product_title_color', function( value ) {
		value.bind( function( to ) {
			$( '.woocommerce .product-gallery-summary .product_title' ).css( 'color', to );
		} );
	} );

	//Single product price
	wp.customize('swc_single_product_price_font_size',function( value ) {
		value.bind( function( to ) {
			$( 'p.price span.woocommerce-Price-amount.amount' ).css('font-size', to + 'px');
		} );
	});	
	wp.customize( 'swc_single_product_price_color', function( value ) {
		value.bind( function( to ) {
			$( '.woocommerce div.product p.price' ).css( 'color', to );
		} );
	} );

	//Header custom item
	wp.customize( 'header_custom_item_btn_tb_padding', function( value ) {
		value.bind( function( to ) {
			$( '.header-custom-item .roll-button' ).css( {
				'padding-top': to + 'px',
				'padding-bottom': to + 'px'
			} );
		} );
	} );	
	wp.customize( 'header_custom_item_btn_lr_padding', function( value ) {
		value.bind( function( to ) {
			$( '.header-custom-item .roll-button' ).css( {
				'padding-left': to + 'px',
				'padding-right': to + 'px'
			} );
		} );
	} );
	wp.customize('header_custom_item_btn_font_size',function( value ) {
		value.bind( function( to ) {
			$( '.header-custom-item .roll-button' ).css('font-size', to + 'px');
		} );
	});	
	wp.customize('header_custom_item_btn_radius',function( value ) {
		value.bind( function( to ) {
			$( '.header-custom-item .roll-button' ).css('border-radius', to + 'px');
		} );
	});		

	//Start port
	//live chat
	wp.customize( 'livechat_side_offset', function( value ) {
		value.bind( function( to ) {
			$( '.sydney-whatsapp-live-chat.live-chat-right' ).css( 'right', to + 'px' );
			$( '.sydney-whatsapp-live-chat.live-chat-left' ).css( 'left', to + 'px' );
		} );
	} );
	wp.customize( 'livechat_bottom_offset', function( value ) {
		value.bind( function( to ) {
			$( '.sydney-whatsapp-live-chat' ).css( 'bottom', to + 'px' );
		} );
	} );

	//Back to top
	wp.customize( 'scrolltop_radius', function( value ) {
		value.bind( function( to ) {
			$( '.go-top.show' ).css( 'border-radius', to + 'px' );
		} );
	} );
	wp.customize( 'scrolltop_side_offset', function( value ) {
		value.bind( function( to ) {
			$( '.go-top.position-right' ).css( 'right', to + 'px' );
			$( '.go-top.position-left' ).css( 'left', to + 'px' );
		} );
	} );
	wp.customize( 'scrolltop_bottom_offset', function( value ) {
		value.bind( function( to ) {
			$( '.go-top' ).css( 'bottom', to + 'px' );
		} );
	} );
	wp.customize( 'scrolltop_icon_size', function( value ) {
		value.bind( function( to ) {
			$( '.go-top .sydney-svg-icon, .go-top .sydney-svg-icon svg' ).css( 'width', to + 'px' );
			$( '.go-top .sydney-svg-icon, .go-top .sydney-svg-icon svg' ).css( 'height', to + 'px' );
		} );
	} );
	wp.customize( 'scrolltop_padding', function( value ) {
		value.bind( function( to ) {
			$( '.go-top' ).css( 'padding', to + 'px' );
		} );
	} );

	//Background colors
	var $bg_color_options = { "offcanvas_bg_color":".sydney-offcanvas-content","shop_archive_header_background_color":".woocommerce-page-header","shop_archive_header_button_background_color":".woocommerce-page-header .category-button","shop_product_wishlist_icon_background_color":".sydney-wishlist-button","ql_item_color":".sydney-quick-links .ql-image.is-svg","ql_background_color":".sydney-quick-links.pos-bottom-full", "ql_background_color":".sydney-quick-links:not(.pos-bottom-full) .quick-links-inner","footer_contact_bg":".footer-contact-inner", "footer_background_overlay":".site-footer, .footer-widgets, .footer-separator div", "footer_separator_shape_color":".footer-separator div","breadcrumbs_background":".sydney-breadcrumb-trail","single_post_rp_color":".sydney-reading-progress__bar","blog_page_banner_background":".blog-banner", "color_forms_background":"input[type=\"text\"],input[type=\"email\"],input[type=\"url\"],input[type=\"password\"],input[type=\"search\"],input[type=\"number\"],input[type=\"tel\"],input[type=\"range\"],input[type=\"date\"],input[type=\"month\"],input[type=\"week\"],input[type=\"time\"],input[type=\"datetime\"],input[type=\"datetime-local\"],input[type=\"color\"],textarea,select,.woocommerce .select2-container .select2-selection--single,.woocommerce-page .select2-container .select2-selection--single,.woocommerce-cart .woocommerce-cart-form .actions .coupon input[type=\"text\"]","shop_product_card_background":".woocommerce-page ul.products li.product","offcanvas_menu_background":".sydney-offcanvas-menu","offcanvas_menu_background":".offcanvas-effect-scale div.offcanvas-background","mobile_header_background":"#masthead-mobile","main_header_submenu_background":".mainnav ul ul li","main_header_bottom_background":".bottom-header-row","main_header_background":".main-header:not(.sticky-active),.header-search-form,.menu-expanded","main_header_background_sticky":".main-header.sticky-active","topbar_background":".top-bar","button_background_color":"button,.roll-button,a.button,.wp-block-button:not(.is-style-outline) a,input[type=\"button\"],input[type=\"reset\"],input[type=\"submit\"]","scrolltop_bg_color":".go-top", };

	$.each( $bg_color_options, function( option, selector ) {
		wp.customize( option, function( value ) {
			value.bind( function( to ) {
				$( selector ).css( 'background-color', to );
			} );
		} );
	});

	//Colors
	var $color_options = { "offcanvas_text_color":".sydney-offcanvas-content, .sydney-offcanvas-content a, .sydney-offcanvas-content h1, .sydney-offcanvas-content h2, .sydney-offcanvas-content h3","footer_widgets_headings_color":".sidebar-column .widget h1, .sidebar-column .widget h2, .sidebar-column .widget h3, .sidebar-column .widget h4, .sidebar-column .widget h5, .sidebar-column .widget h6","shop_archive_header_breadcrumbs_color":".woocommerce-page-header .woocommerce-breadcrumb","shop_archive_header_button_color":".woocommerce-page-header .category-button","shop_archive_header_title_color":".woocommerce-page-header h1","shop_archive_header_description_color":".woocommerce-page-header .page-description p","ql_item_color":".sydney-quick-links .quick-link .ql-text","footer_contact_color":".footer-contact-inner, .footer-contact-inner a:not(.button), .footer-contact-inner h3, .footer-contact-inner h2", "breadcrumbs_color":".sydney-breadcrumb-trail","breadcrumbs_link_color":".sydney-breadcrumb-trail ul li a","blog_page_banner_color":".blog-banner .blog-banner-title","color_forms_text":"input[type=\"text\"],input[type=\"email\"],input[type=\"url\"],input[type=\"password\"],input[type=\"search\"],input[type=\"number\"],input[type=\"tel\"],input[type=\"range\"],input[type=\"date\"],input[type=\"month\"],input[type=\"week\"],input[type=\"time\"],input[type=\"datetime\"],input[type=\"datetime-local\"],input[type=\"color\"],textarea,select,.woocommerce .select2-container .select2-selection--single,input[type=\"text\"]:focus,input[type=\"email\"]:focus,input[type=\"url\"]:focus,input[type=\"password\"]:focus,input[type=\"search\"]:focus,input[type=\"number\"]:focus,input[type=\"tel\"]:focus,input[type=\"range\"]:focus,input[type=\"date\"]:focus,input[type=\"month\"]:focus,input[type=\"week\"]:focus,input[type=\"time\"]:focus,input[type=\"datetime\"]:focus,input[type=\"datetime-local\"]:focus,input[type=\"color\"]:focus,textarea:focus,select:focus,.woocommerce .select2-container .select2-selection--single:focus,.woocommerce-page .select2-container .select2-selection--single,.select2-container--default .select2-selection--single .select2-selection__rendered","color_link_default":".entry-content a:not(.button):not(.elementor-button-link)","color_heading_1":"h1","color_heading_2":"h2,.wp-block-search .wp-block-search__label","color_heading_3":"h3","color_heading_4":"h4,.product-gallery-summary .product_meta,.product-gallery-summary .product_meta a,.woocommerce-breadcrumb,.woocommerce-breadcrumb a,.woocommerce-tabs ul.tabs li a,.product-gallery-summary .woocommerce-Price-amount,.woocommerce-mini-cart-item .quantity,.woocommerce-mini-cart__total .woocommerce-Price-amount,.order-total .woocommerce-Price-amount","color_heading_5":"h5:not(.sticky-addtocart-title)","color_heading_6":"h6","offcanvas_submenu_color": ".sydney-offcanvas-menu #mainnav ul ul a","offcanvas_menu_color": ".sydney-offcanvas-menu, .sydney-offcanvas-menu a:not(.button)","mobile_header_color":"#masthead-mobile,#masthead-mobile .site-description,#masthead-mobile a:not(.button)","main_header_submenu_color":".mainnav ul ul a","main_header_bottom_color":".bottom-header-row, .bottom-header-row .header-contact a,.bottom-header-row .mainnav .menu > li > a","main_header_color":".main-header .logout-link, .main-header .html-item,.main-header .sydney-login-toggle,.main-header .site-title a,.main-header .site-description,.main-header .mainnav .menu > li > a, .main-header .header-contact a", "topbar_color":".top-bar, .top-bar a","single_post_meta_color":".single .entry-header .entry-meta,.single .entry-header .entry-meta a","single_post_title_color":".single .entry-header .entry-title","loop_post_text_color":".posts-layout .entry-post","loop_post_title_color":".posts-layout .entry-title a","loop_post_meta_color":".posts-layout .entry-meta,.posts-layout .entry-meta a","button_color":"button,.roll-button,a.button,.wp-block-button__link,input[type=\"button\"],input[type=\"reset\"],input[type=\"submit\"]","scrolltop_color":".go-top", "footer_widgets_title_color":".sidebar-column .widget .widget-title" };

	$.each( $color_options, function( option, selector ) {
		wp.customize( option, function( value ) {
			value.bind( function( to ) {
				$( selector ).css( 'color', to );
			} );
		} );
	});	

	//Stroke
	var $stroke_options = { "scrolltop_color":".go-top svg", "shop_product_wishlist_icon_active_color":".sydney-wishlist-button:hover svg path, .sydney-wishlist-button.active svg path", };

	$.each( $stroke_options, function( option, selector ) {
		wp.customize( option, function( value ) {
			value.bind( function( to ) {
				$( selector ).css( 'stroke', to );
			} );
		} );
	});		

	//Background hover and pseudoselectors
	var $bg_hover_options = { "shop_archive_header_button_background_color_hover":".woocommerce-page-header .category-button:hover","single_product_gallery_styles_background_color":".product-gallery-summary.gallery-showcase:before, .product-gallery-summary.gallery-full-width:before", "ql_item_color_hover":".sydney-quick-links .quick-link:hover .ql-image.is-svg","ql_item_bg_hover":".sydney-quick-links .quick-link:hover","button_background_color_hover":"button:hover,.roll-button:hover,a.button:hover,.wp-block-button__link:hover,input[type=\"button\"]:hover,input[type=\"reset\"]:hover,input[type=\"submit\"]:hover","scrolltop_bg_color_hover":".go-top:hover" , };

	$.each( $bg_hover_options, function( option, selector ) {
		wp.customize( option, function( value ) {
			value.bind( function( to ) {

				$( 'head' ).find( '#sydney-customizer-styles-bg-hover-' + option ).remove();

				var output = selector + ' { background-color:' + to + '!important; }';

				$( 'head' ).append( '<style id="sydney-customizer-styles-bg-hover-' + option + '">' + output + '</style>' );

			} );
		} );
	});		

	//Border hover
	var $border_hover_options = { "shop_archive_header_button_border_color_hover":".woocommerce-page-header .categories-wrapper .category-button:hover,.woocommerce-page-header.woocommerce-page-header-style3 .categories-wrapper .category-button:hover", "button_border_color_hover":"button:hover,.roll-button:hover,a.button:hover,.wp-block-button__link:hover,input[type=\"button\"]:hover,input[type=\"reset\"]:hover,input[type=\"submit\"]:hover", };

	$.each( $border_hover_options, function( option, selector ) {
		wp.customize( option, function( value ) {
			value.bind( function( to ) {
		
				$( 'head' ).find( '#sydney-customizer-styles-' + option ).remove();
	
				var output = selector + ' { border-color:' + to + '!important; }';
	
				$( 'head' ).append( '<style id="sydney-customizer-styles-' + option + '">' + output + '</style>' );
	
			} );
		} );
	});		

	//Stroke hover
	var $stroke_hover_options = { "scrolltop_color_hover":".go-top:hover svg", "shop_product_wishlist_icon_active_color":".sydney-wishlist-button:hover svg path", };

	$.each( $stroke_hover_options, function( option, selector ) {
		wp.customize( option, function( value ) {
			value.bind( function( to ) {

				$( 'head' ).find( '#sydney-customizer-stroke-' + option ).remove();

				var output = selector + ' { stroke:' + to + '!important; }';

				$( 'head' ).append( '<style id="sydney-customizer-stroke-' + option + '">' + output + '</style>' );

			} );
		} );
	});		

	//Color hover
	var $color_hover_options = { "shop_archive_header_button_color_hover":".woocommerce-page-header .category-button:hover", "ql_item_color_hover":".sydney-quick-links .quick-link:hover .ql-text","breadcrumbs_link_hover_color":".sydney-breadcrumb-trail ul li a:hover","color_link_hover":".entry-content a:not(.button):not(.elementor-button-link):hover","button_color_hover":"button:hover,.roll-button:hover,a.button:hover,.wp-block-button__link:hover,input[type=\"button\"]:hover,input[type=\"reset\"]:hover,input[type=\"submit\"]:hover","scrolltop_color_hover":".go-top:hover", "footer_widgets_links_hover_color":".sidebar-column .widget a:hover"};

	$.each( $color_hover_options, function( option, selector ) {
		wp.customize( option, function( value ) {
			value.bind( function( to ) {

				$( 'head' ).find( '#sydney-customizer-styles-color-hover-' + option ).remove();

				var output = selector + ' { color:' + to + '!important; }';

				$( 'head' ).append( '<style id="sydney-customizer-styles-color-hover-' + option + '">' + output + '</style>' );

			} );
		} );
	});

	//Fill
	var $fill_options = { "offcanvas_close_color":".sydney-offcanvas-content .sydney-offcanvas-close svg","shop_product_wishlist_icon_active_color":".sydney-wishlist-button:hover svg path, .sydney-wishlist-button.active svg path","footer_separator_color":".footer-separator svg","breadcrumbs_color":".sydney-breadcrumb-trail svg","main_header_submenu_color":".mainnav ul ul li svg","offcanvas_menu_color": ".sydney-offcanvas-menu svg","mobile_header_color":"#masthead-mobile svg","offcanvas_menu_color":".sydney-offcanvas-menu svg","mobile_header_color":"#masthead-mobile svg","main_header_bottom_color":".bottom-header-row .sydney-svg-icon svg,.dropdown-symbol .sydney-svg-icon svg","main_header_color":".site-header .header-item svg, .site-header .dropdown-symbol .sydney-svg-icon svg", "topbar_color":".top-bar svg","footer_color":".site-info .sydney-svg-icon svg"};

	$.each( $fill_options, function( option, selector ) {
		wp.customize( option, function( value ) {
			value.bind( function( to ) {
				$( selector ).css( 'fill', to );
			} );
		} );
	});	

	//Border color
	var $border_color_options = { "shop_archive_header_button_border_color":".woocommerce-page-header .category-button","ql_item_border_color":".sydney-quick-links .quick-link,.sydney-quick-links.pos-left .quick-link, .sydney-quick-links.pos-right .quick-link","color_forms_borders":"input[type=\"text\"],input[type=\"email\"],input[type=\"url\"],input[type=\"password\"],input[type=\"search\"],input[type=\"number\"],input[type=\"tel\"],input[type=\"range\"],input[type=\"date\"],input[type=\"month\"],input[type=\"week\"],input[type=\"time\"],input[type=\"datetime\"],input[type=\"datetime-local\"],input[type=\"color\"],textarea,select,.woocommerce .select2-container .select2-selection--single,.woocommerce-page .select2-container .select2-selection--single,.woocommerce-account fieldset,.woocommerce-account .woocommerce-form-login, .woocommerce-account .woocommerce-form-register,.woocommerce-cart .woocommerce-cart-form .actions .coupon input[type=\"text\"]","shop_product_card_border_color": ".woocommerce-page ul.products li.product","link_separator_color":".sydney-offcanvas-menu .mainnav ul li","button_border_color":"button,.roll-button,a.button,.wp-block-button__link,input[type=\"button\"],input[type=\"reset\"],input[type=\"submit\"]","footer_credits_divider_color":".site-info,.site-footer","footer_widgets_divider_color":".footer-widgets,.footer-widgets-grid" };

	$.each( $border_color_options, function( option, selector ) {
		wp.customize( option, function( value ) {
			value.bind( function( to ) {
				$( selector ).css( 'border-color', to );
			} );
		} );
	});		

	//Responsive
	var $devices 	= { "desktop": "(min-width: 992px)", "tablet": "(min-width: 576px) and (max-width: 991px)", "mobile": "(max-width: 575px)" };

	var $minHeight = { "post_header_size":".page-banner-inner:not(.cat-banner-inner)", "archive_header_size":".page-banner-inner.cat-banner-inner", };
	$.each( $minHeight, function( option, selector ) {
		$.each( $devices, function( device, mediaSize ) {
			wp.customize( option + '_' + device, function( value ) {
				value.bind( function( to ) {

					$( 'head' ).find( '#sydney-customizer-styles-' + option + '_' + device ).remove();

					var output = '@media ' + mediaSize + ' {' + selector + ' { min-height:' + to + 'px; } }';

					$( 'head' ).append( '<style id="sydney-customizer-styles-' + option + '_' + device + '">' + output + '</style>' );
				} );
			} );
		});
	});

	var $maxWidth = { "hero_slider_content_width":".text-slider", "modal_popup_side_image_max_width": "#modalPopup .sydney-popup-wrapper__content-side-image" }; //percentage
	$.each( $maxWidth, function( option, selector ) {
		$.each( $devices, function( device, mediaSize ) {
			wp.customize( option + '_' + device, function( value ) {
				value.bind( function( to ) {

					$( 'head' ).find( '#sydney-customizer-styles-' + option + '_' + device ).remove();

					var output = '@media ' + mediaSize + ' {' + selector + ' { max-width:' + to + '%; } }';

					$( 'head' ).append( '<style id="sydney-customizer-styles-' + option + '_' + device + '">' + output + '</style>' );
				} );
			} );
		});
	});

	var $maxWidthpx = { "modal_popup_max_width":"#modalPopup .sydney-popup-wrapper", }; //px
	$.each( $maxWidthpx, function( option, selector ) {
		$.each( $devices, function( device, mediaSize ) {
			wp.customize( option + '_' + device, function( value ) {
				value.bind( function( to ) {

					$( 'head' ).find( '#sydney-customizer-styles-' + option + '_' + device ).remove();

					var output = '@media ' + mediaSize + ' {' + selector + ' { max-width:' + to + 'px; } }';

					$( 'head' ).append( '<style id="sydney-customizer-styles-' + option + '_' + device + '">' + output + '</style>' );
				} );
			} );
		});
	});	

	var $height = { "footer_separator_height":".footer-separator div, .footer-separator svg" };
	$.each( $height, function( option, selector ) {
		$.each( $devices, function( device, mediaSize ) {
			wp.customize( option + '_' + device, function( value ) {
				value.bind( function( to ) {

					$( 'head' ).find( '#sydney-customizer-styles-' + option + '_' + device ).remove();

					var output = '@media ' + mediaSize + ' {' + selector + ' { height:' + to + 'px; } }';

					$( 'head' ).append( '<style id="sydney-customizer-styles-' + option + '_' + device + '">' + output + '</style>' );
				} );
			} );
		});
	});	

	// width for separators
	var $width = { "footer_separator_width":".footer-separator svg" };
	$.each( $width, function( option, selector ) {
		$.each( $devices, function( device, mediaSize ) {
			wp.customize( option + '_' + device, function( value ) {
				value.bind( function( to ) {

					$( 'head' ).find( '#sydney-customizer-styles-' + option + '_' + device ).remove();

					var output = '@media ' + mediaSize + ' {' + selector + ' { width:calc(' + to + '% + 1.3px); } }';

					$( 'head' ).append( '<style id="sydney-customizer-styles-' + option + '_' + device + '">' + output + '</style>' );
				} );
			} );
		});
	});		

	var $topBottPad = { "breadcrumbs_padding":".sydney-breadcrumb-trail","footer_widgets_padding":".footer-widgets-grid", "button_top_bottom_padding":"button,.roll-button,a.button,.wp-block-button__link,input[type='button'],input[type='reset'],input[type='submit']", };
	$.each( $topBottPad, function( option, selector ) {
		$.each( $devices, function( device, mediaSize ) {
			wp.customize( option + '_' + device, function( value ) {
				value.bind( function( to ) {

					$( 'head' ).find( '#sydney-customizer-styles-' + option + '_' + device ).remove();

					var output = '@media ' + mediaSize + ' {' + selector + ' { padding-top:' + to + 'px;padding-bottom:' + to + 'px; } }';

					$( 'head' ).append( '<style id="sydney-customizer-styles-' + option + '_' + device + '">' + output + '</style>' );
				} );
			} );
		});
	});

	var $leftRightPad = { "button_left_right_padding":"button,.roll-button,a.button,.wp-block-button__link,input[type='button'],input[type='reset'],input[type='submit']", };
	$.each( $leftRightPad, function( option, selector ) {
		$.each( $devices, function( device, mediaSize ) {
			wp.customize( option + '_' + device, function( value ) {
				value.bind( function( to ) {

					$( 'head' ).find( '#sydney-customizer-styles-' + option + '_' + device ).remove();

					var output = '@media ' + mediaSize + ' {' + selector + ' { padding-left:' + to + 'px;padding-right:' + to + 'px; } }';

					$( 'head' ).append( '<style id="sydney-customizer-styles-' + option + '_' + device + '">' + output + '</style>' );
				} );
			} );
		});
	});

	var $fontSizes 	= { "footer_copyright_font_size":".site-info","button_font_size":"button,.roll-button,a.button,.wp-block-button__link,input[type='button'],input[type='reset'],input[type='submit']", "hero_slider_subtitle":".text-slider .subtitle","hero_slider_title":".text-slider .maintitle","blog_banner_title_size":".blog-banner .blog-banner-title","sydney_menu_font_size":"#mainnav > div > ul > li > a","single_product_title_size":".woocommerce div.product .product-gallery-summary .entry-title","single_product_price_size":".woocommerce div.product .product-gallery-summary .price .amount","site_desc_font_size":".site-description","site_title_font_size":".site-title","body_font_size":"body, .posts-layout .entry-post","h1_font_size":"h1:not(.site-title)","h2_font_size":"h2","h3_font_size":"h3","h4_font_size":"h4","h5_font_size":"h5","h6_font_size":"h6","loop_post_text_size":".posts-layout .entry-post","loop_post_meta_size":".posts-layout .entry-meta","loop_post_title_size":".posts-layout .entry-title","single_post_title_size": ".single .entry-header .entry-title","single_post_meta_size": ".single .entry-meta","footer_widgets_title_size":".sidebar-column .widget .widget-title","footer_widgets_body_size":".footer-widgets" };
	$.each( $fontSizes, function( option, selector ) {
		$.each( $devices, function( device, mediaSize ) {
			wp.customize( option + '_' + device, function( value ) {
				value.bind( function( to ) {

					$( 'head' ).find( '#sydney-customizer-styles-' + option + '_' + device ).remove();

					var output = '@media ' + mediaSize + ' {' + selector + ' { font-size:' + to + 'px; } }';

					$( 'head' ).append( '<style id="sydney-customizer-styles-' + option + '_' + device + '">' + output + '</style>' );
				} );
			} );
		});
	});

	var $bottomMargin 	= {"footer_contact_margin":".footer-contact"};
	$.each( $bottomMargin, function( option, selector ) {
		$.each( $devices, function( device, mediaSize ) {
			wp.customize( option + '_' + device, function( value ) {
				value.bind( function( to ) {

					$( 'head' ).find( '#sydney-customizer-styles-' + option + '_' + device ).remove();

					var output = '@media ' + mediaSize + ' {' + selector + ' { margin-bottom:' + to + 'px; } }';

					$( 'head' ).append( '<style id="sydney-customizer-styles-' + option + '_' + device + '">' + output + '</style>' );
				} );
			} );
		});
	});

	var $padding = { "offcanvas_padding":".sydney-offcanvas-content","footer_contact_padding":".footer-contact-inner"};
	$.each( $padding, function( option, selector ) {
		$.each( $devices, function( device, mediaSize ) {
			wp.customize( option + '_' + device, function( value ) {
				value.bind( function( to ) {

					$( 'head' ).find( '#sydney-customizer-styles-' + option + '_' + device ).remove();

					var output = '@media ' + mediaSize + ' {' + selector + ' { padding:' + to + 'px; } }';

					$( 'head' ).append( '<style id="sydney-customizer-styles-' + option + '_' + device + '">' + output + '</style>' );
				} );
			} );
		});
	});	


	//Footer
	wp.customize( 'footer_widgets_column_spacing_desktop', function( value ) {
		value.bind( function( to ) {
			$( '.footer-widgets-grid' ).css( 'gap', to + 'px' );
		} );
	} );
	wp.customize( 'footer_widgets_divider_size', function( value ) {
		value.bind( function( to ) {
			$( '.footer-widgets,.footer-widgets-grid' ).css( 'border-top-width', to + 'px');
		} );
	} );
	wp.customize( 'footer_credits_divider_size', function( value ) {
		value.bind( function( to ) {
			$( '.site-info,.site-footer' ).css( 'border-top-width', to + 'px');
		} );
	} );	
	wp.customize( 'footer_credits_padding_desktop', function( value ) {
		value.bind( function( to ) {
			$( '.site-info' ).css( {
				'padding-top': to + 'px',
				'padding-bottom': to + 'px'
			} );
		} );
	} );
	
	wp.customize( 'footer_contact_radius', function( value ) {
		value.bind( function( to ) {
			$( '.footer-contact-inner' ).css( 'border-radius', to + 'px');
		} );
	} );	
	

	//Blog
	wp.customize( 'archive_header_alignment', function( value ) {
		value.bind( function( to ) {
			$( '.page-banner-inner.cat-banner-inner' ).css( 'text-align', to );
		} );
	} );
	wp.customize( 'archive_featured_image_size_desktop', function( value ) {
		value.bind( function( to ) {
			$( '.posts-layout .list-image' ).css( 'width', to + '%' );
			$( '.posts-layout .list-content' ).css( 'width', 100 - to + '%' );
		} );
	} );
	wp.customize( 'archive_featured_image_size_desktop', function( value ) {
		value.bind( function( to ) {
			$( '.posts-layout .list-image' ).css( 'width', to + '%' );
			$( '.posts-layout .list-content' ).css( 'width', 100 - to + '%' );
		} );
	} );
	wp.customize( 'archive_meta_spacing', function( value ) {
		value.bind( function( to ) {
			$( '.posts-layout .entry-meta.below-excerpt' ).css( 'margin-top', to + 'px' );
			$( '.posts-layout .entry-meta.above-title' ).css( 'margin-bottom', to + 'px' );
		} );
	} );
	wp.customize( 'archive_title_spacing', function( value ) {
		value.bind( function( to ) {
			$( '.posts-layout .entry-header' ).css( 'margin-bottom', to + 'px' );
		} );
	} );	
	wp.customize( 'single_post_header_spacing', function( value ) {
		value.bind( function( to ) {
			$( '.single .entry-header' ).css( 'margin-bottom', to + 'px' );
		} );
	} );	
	wp.customize( 'single_post_image_spacing', function( value ) {
		value.bind( function( to ) {
			$( '.single-post .entry-thumb' ).css( 'margin-bottom', to + 'px' );
		} );
	} );
	wp.customize( 'single_post_meta_spacing', function( value ) {
		value.bind( function( to ) {
			$( '.single .entry-meta-above' ).css( 'margin-bottom', to + 'px' );
			$( '.single .entry-meta-below' ).css( 'margin-top', to + 'px' );
		} );
	} );	

	wp.customize( 'featured_posts_margin_top', function( value ) {
		value.bind( function( to ) {
			$( '.featured-posts' ).css( 'margin-top', to + 'px' );
		} );
	} );

	wp.customize( 'featured_posts_margin_bottom', function( value ) {
		value.bind( function( to ) {
			$( '.featured-posts' ).css( 'margin-bottom', to + 'px' );
		} );
	} );

	//Header
	wp.customize( 'topbar_padding', function( value ) {
		value.bind( function( to ) {
			$( '.top-bar-inner' ).css( {
				paddingTop:  to + 'px',
				paddingBottom:  to + 'px',
			} );
		} );
	} );
	wp.customize( 'topbar_divider_size', function( value ) {
		value.bind( function( to ) {
			var width = wp.customize.value( 'topbar_divider_width' )();
			if ( 'contained' == width ) {
				$( '.top-bar-inner' ).css( 'border-width', to );
			} else {
				$( '.top-bar' ).css( 'border-width', to );
			}
		} );
	} );

	wp.customize( 'topbar_divider_color', function( value ) {
		value.bind( function( to ) {
			$( '.top-bar,.top-bar-inner' ).css( 'border-color', to );
		} );
	} );			
	wp.customize( 'main_header_padding', function( value ) {
		value.bind( function( to ) {
			$( '.site-header-inner, .top-header-row' ).css( {
				paddingTop:  to + 'px',
				paddingBottom:  to + 'px',
			} );
		} );
	} );
	wp.customize( 'main_header_bottom_padding', function( value ) {
		value.bind( function( to ) {
			$( '.bottom-header-inner' ).css( {
				paddingTop:  to + 'px',
				paddingBottom:  to + 'px',
			} );
		} );
	} );	
	
	wp.customize( 'main_header_divider_color', function( value ) {
		value.bind( function( to ) {
			$( '.main-header, .bottom-header-row,.top-header-row,.site-header-inner, .bottom-header-inner' ).css( 'border-color', to );
		} );
	} );

	wp.customize( 'mobile_menu_alignment', function( value ) {
		value.bind( function( to ) {
			$( '.sydney-offcanvas-menu .mainnav ul li' ).css( 'text-align', to );
			$( '.mobile-header-item.offcanvas-items' ).css( 'text-align', to );
			$( '.sydney-offcanvas-menu #mainnav ul li' ).css( 'text-align', to );
			$( '.mobile-header-item.offcanvas-items .social-profile' ).css( 'text-align', to );

			if ( 'center' == to ) {
				$( '.sydney-offcanvas-menu .header-item.header-woo' ).css( 'justify-content', 'center' );
				$( '.mobile-header-item.offcanvas-items .button' ).css( 'align-self', 'center' );
			} else if ( 'right' == to ) {
				$( '.sydney-offcanvas-menu .header-item.header-woo' ).css( 'justify-content', 'flex-end' );
				$( '.mobile-header-item.offcanvas-items .button' ).css( 'align-self', 'flex-end' );
			} else {
				$( '.sydney-offcanvas-menu .header-item.header-woo' ).css( 'justify-content', 'flex-start' );
				$( '.mobile-header-item.offcanvas-items .button' ).css( 'align-self', 'flex-start' );
			}
		} );
	} );		

	wp.customize( 'mobile_menu_link_spacing', function( value ) {
		value.bind( function( to ) {
			$( '.sydney-offcanvas-menu .mainnav a' ).css( 'padding-top', to/2 );
			$( '.sydney-offcanvas-menu .mainnav a' ).css( 'padding-bottom', to/2 );
		} );
	} );		

	wp.customize( 'mobile_header_padding', function( value ) {
		value.bind( function( to ) {
			$( '.mobile-header' ).css( {
				paddingTop:  to + 'px',
				paddingBottom:  to + 'px',
			} );
		} );
	} );	

	wp.customize( 'mobile_header_separator_width', function( value ) {
		value.bind( function( to ) {
			$( '.sydney-offcanvas-menu .mainnav ul li' ).css( 'border-bottom-width', to + 'px' );
		} );
	} );	

	var $logoSize = {
		"site_logo_size": ".site-logo"
	};
	$.each($logoSize, function (option, selector) {
		$.each($devices, function (device, mediaSize) {
			wp.customize(option + '_' + device, function (value) {
			value.bind(function (to) {
				$('head').find('#sydney-customizer-styles-' + option + '_' + device).remove();
				var output = '@media ' + mediaSize + ' {' + selector + ' { max-height:' + to + 'px; } }';
				$('head').append('<style id="sydney-customizer-styles-' + option + '_' + device + '">' + output + '</style>');
			});
			});
		});
	});

	//Typography
	wp.customize( 'sydney_body_font', function( value ) {
		value.bind( function( to ) {

			$( 'head' ).find( '#sydney-preview-google-fonts-body-css' ).remove();
			$( 'head' ).find( '#sydney-preview-body-weight-css' ).remove();

			$( 'head' ).append( '<link id="sydney-preview-google-fonts-body-css" href="" rel="stylesheet">' );

			$( '#sydney-preview-google-fonts-body-css' ).attr( 'href', 'https://fonts.googleapis.com/css?family=' + jQuery.parseJSON( to )['font'].replace(/ /g, '+') + ':' + jQuery.parseJSON( to )['regularweight'] + '&display=swap' );

			$( 'body' ).css( 'font-family', jQuery.parseJSON( to )['font'] );

			$( 'head' ).append('<style id="sydney-preview-body-weight-css" type="text/css">body {font-weight:' + jQuery.parseJSON( to )['regularweight'] + ';}</style>');

		} );
	} );	

	wp.customize( 'sydney_headings_font', function( value ) {
		value.bind( function( to ) {

			$( 'head' ).find( '#sydney-preview-google-fonts-headings-css' ).remove();
			$( 'head' ).find( '#sydney-preview-headings-weight-css' ).remove();

			$( 'head' ).append( '<link id="sydney-preview-google-fonts-headings-css" href="" rel="stylesheet">' );

			$( '#sydney-preview-google-fonts-headings-css' ).attr( 'href', 'https://fonts.googleapis.com/css?family=' + jQuery.parseJSON( to )['font'].replace(/ /g, '+') + ':' + jQuery.parseJSON( to )['regularweight'] + '&display=swap' );

			$( 'h1,h2,h3,h4,h5,h6,.site-title' ).css( 'font-family', jQuery.parseJSON( to )['font'] );

			$( 'head' ).append('<style id="sydney-preview-headings-weight-css" type="text/css">h1,h2,h3,h4,h5,h6,.site-title {font-weight:' + jQuery.parseJSON( to )['regularweight'] + ';}</style>');

		} );
	} );	

	wp.customize( 'sydney_menu_font', function( value ) {
		value.bind( function( to ) {

			$( 'head' ).find( '#sydney-preview-google-fonts-menu-css' ).remove();
			$( 'head' ).find( '#sydney-preview-menu-weight-css' ).remove();

			$( 'head' ).append( '<link id="sydney-preview-google-fonts-menu-css" href="" rel="stylesheet">' );

			$( '#sydney-preview-google-fonts-menu-css' ).attr( 'href', 'https://fonts.googleapis.com/css?family=' + jQuery.parseJSON( to )['font'].replace(/ /g, '+') + ':' + jQuery.parseJSON( to )['regularweight'] + '&display=swap' );

			$( '#mainnav > div > ul > li > a' ).css( 'font-family', jQuery.parseJSON( to )['font'] );

			$( 'head' ).append('<style id="sydney-preview-menu-weight-css" type="text/css">#mainnav > div > ul > li > a {font-weight:' + jQuery.parseJSON( to )['regularweight'] + ';}</style>');

		} );
	} );	


	wp.customize( 'headings_font_style', function( value ) {
		value.bind( function( to ) {
			$( 'h1,h2,h3,h4,h5,h6,.site-title' ).css( 'font-style', to );
		} );
	} );

	wp.customize( 'headings_line_height', function( value ) {
		value.bind( function( to ) {
			$( 'h1,h2,h3,h4,h5,h6,.site-title' ).css( 'line-height', to );
		} );
	} );

	wp.customize( 'headings_letter_spacing', function( value ) {
		value.bind( function( to ) {
			$( 'h1,h2,h3,h4,h5,h6,.site-title' ).css( 'letter-spacing', to + 'px' );
		} );
	} );
	
	wp.customize( 'headings_text_transform', function( value ) {
		value.bind( function( to ) {
			$( 'h1,h2,h3,h4,h5,h6,.site-title' ).css( 'text-transform', to );
		} );
	} );	

	wp.customize( 'menu_items_text_transform', function( value ) {
		value.bind( function( to ) {
			$( '#mainnav > div > ul > li > a' ).css( 'text-transform', to );
		} );
	} );	

	wp.customize( 'headings_text_decoration', function( value ) {
		value.bind( function( to ) {
			$( 'h1,h2,h3,h4,h5,h6,.site-title' ).css( 'text-decoration', to );
		} );
	} );	

	wp.customize( 'body_font_style', function( value ) {
		value.bind( function( to ) {
			$( 'body' ).css( 'font-style', to );
		} );
	} );

	wp.customize( 'body_line_height', function( value ) {
		value.bind( function( to ) {
			$( 'body' ).css( 'line-height', to );
		} );
	} );

	wp.customize( 'body_letter_spacing', function( value ) {
		value.bind( function( to ) {
			$( 'body' ).css( 'letter-spacing', to + 'px' );
		} );
	} );
	
	wp.customize( 'body_text_transform', function( value ) {
		value.bind( function( to ) {
			$( 'body' ).css( 'text-transform', to );
		} );
	} );	

	wp.customize( 'body_text_decoration', function( value ) {
		value.bind( function( to ) {
			$( 'p, .posts-layout .entry-post' ).css( 'text-decoration', to );
		} );
	} );	

	wp.customize('shop_cart_show_coupon_form', function (value) {
		value.bind(function (to) {
		  if (!to) {
			$('.woocommerce-cart .coupon').css('display', 'none');
		  } else {
			$('.woocommerce-cart .coupon').css('display', 'block');
		  }
		});
	}); //Responsive

	
	wp.customize('post_header_custom_content_toggle', function (value) {
		value.bind(function (to) {
		  if (!to) {
			$('.page-header-custom-content').css('display', 'none');
		  } else {
			$('.page-header-custom-content').css('display', 'block');
		  }
		});
	});

	//Woocommerce port
	wp.customize( 'shop_product_element_spacing', function( value ) {
		value.bind( function( to ) {
			$( '.woocommerce  ul.products li.product .col-md-7 > *,.woocommerce  ul.products li.product .col-md-8 > *,.woocommerce  ul.products li.product > *' ).css( 'margin-bottom', to + 'px' );
		} );
	} );
	
	wp.customize( 'shop_sale_tag_radius', function( value ) {
		value.bind( function( to ) {
			$( '.wc-block-grid__product-onsale, span.onsale' ).css( 'border-radius', to + 'px' );
		} );
	} );

	//Placeholders
	wp.customize( 'color_forms_placeholder', function( value ) {
		value.bind( function( to ) {
			$( 'head' ).find( '#sydney-customizer-styles-color_forms_placeholder' ).remove();
		
			var output = 'input::placeholder {color:' + to + ';opacity:1;} input:-ms-input-placeholder {color:' + to + ';} input::-ms-input-placeholder {color:' + to + ';}';

			$( 'head' ).append( '<style id="sydney-customizer-styles-color_forms_placeholder">' + output + '</style>' )			
		} );
	} );	

	//Mobile toggle icon size
	wp.customize( 'mobile_menu_icon_size', function( value ) {
		value.bind( function( to ) {
			$( '.menu-toggle .sydney-svg-icon, .menu-toggle .sydney-svg-icon svg' ).css( 'width', to + 'px' );
			$( '.menu-toggle .sydney-svg-icon, .menu-toggle .sydney-svg-icon svg' ).css( 'height', to + 'px' );
			$( '.menu-toggle .sydney-svg-icon, .menu-toggle .sydney-svg-icon svg' ).css( 'max-height', to + 'px' );
		} );
	} );

	//separators
	wp.customize( 'footer_separator_flip', function( value ) {
		value.bind( function( to ) {
			$( 'head' ).find( '#sydney-customizer-styles-separator_flip' ).remove();
			if ( false === to ) {
				var output = '.footer-separator svg {transform: rotatez(180deg) rotatey(0)!important;} .footer-separator.type-waves-opacity svg {transform: rotatez(0) rotatey(0)!important;} .footer-separator.type-tilt svg {transform: rotatez(0) rotatey(0)!important;}';
			} else {
				var output = '.footer-separator svg {transform: rotatez(180deg) rotatey(180deg)!important;} .footer-separator.type-waves-opacity svg {transform: rotatez(0) rotatey(180deg)!important;} .footer-separator.type-tilt svg {transform: rotatez(0) rotatey(180deg)!important;}';
			}

			$( 'head' ).append( '<style id="sydney-customizer-styles-separator_flip">' + output + '</style>' )			
		} );
	} );

	//quick links
	wp.customize( 'ql_border_radius', function( value ) {
		value.bind( function( to ) {
			$( '.sydney-quick-links .quick-links-inner' ).css( 'border-radius', to + 'px' );
		} );
	} );


	//quick links
	wp.customize( 'ql_border_radius', function( value ) {
		value.bind( function( to ) {
			$( 'head' ).find( '#sydney-customizer-styles-ql_border_radius' ).remove();
			
			var outputBottom = '.sydney-quick-links.pos-bottom .quick-link:first-of-type {border-top-left-radius:' + to + 'px;border-bottom-left-radius:' + to + 'px;} .sydney-quick-links.pos-bottom .quick-link:last-of-type {border-top-right-radius:' + to + 'px;border-bottom-right-radius:' + to + 'px;}';
			var outputLeftRight = '.sydney-quick-links.pos-left .quick-link:first-of-type, .sydney-quick-links.pos-right .quick-link:first-of-type {border-top-left-radius:' + to + 'px;border-top-right-radius:' + to + 'px;} .sydney-quick-links.pos-left .quick-link:last-of-type, .sydney-quick-links.pos-right .quick-link:last-of-type {border-bottom-right-radius:' + to + 'px;border-bottom-left-radius:' + to + 'px;}';
			
			$( 'head' ).append( '<style id="sydney-customizer-styles-ql_border_radius">' + outputBottom + outputLeftRight + '</style>' )			
		} );
	} );

	wp.customize('single_sticky_add_to_cart_elements_spacing', function (value) {
		value.bind(function (to) {
		  $('.sydney-single-sticky-add-to-cart-wrapper .sydney-single-sticky-add-to-cart-wrapper-content .sydney-single-sticky-add-to-cart-item').css('margin-right', to + 'px');
		});
	});

	// Color options
	var $theme_options = sydney_theme_options;

	$.each( $theme_options, function( key, css ) {
		wp.customize( css.option, function( value ) {
			
			value.bind( function( to, prev ) {

				var output = '';

				$.each( $theme_options, function( key, css2 ) {
					if( css.option === css2.option ) {
						var unit = typeof css2.unit !== 'undefined' ? css2.unit : '';

						if( typeof css2.condition !== 'undefined' ) {
							if( typeof window.parent.window.wp.customize( css2.condition ) !== 'undefined' ) {
								if( window.parent.window.wp.customize.control( css2.condition ).setting._value !== css2.cond_value ) {
									return;
								}
							}
						}

						if( ! to ) {
							return;
						}

						if( ! unit && css2.type !== 'dimensions' ) {
							to = typeof css2.rgba !== 'undefined' ? hexToRGB( to, css2.rgba ) : to;
						}

						// convert 'to' value to a dimensions format
						if( css2.type === 'dimensions' ) {
							if( ! isJsonString( to ) ) {
								return;
							}

							to = JSON.parse( to );

							if( to.top === '' && to.right === '' && to.bottom === '' && to.left === '' ) {
								return;
							}

							to.top    = to.top === '' ? 0 : to.top;
							to.right  = to.right === '' ? 0 : to.right;
							to.bottom = to.bottom === '' ? 0 : to.bottom;
							to.left   = to.left === '' ? 0 : to.left;

							to = to.top + to.unit + ' ' + to.right + to.unit + ' ' + to.bottom + to.unit + ' ' + to.left + to.unit;
						}
						
						// Check and convert value to be compatible with 'display' css property
						if( css2.type === 'display' ) {
							if( to === 'hidden' ) {
								to = 'none';
							} else {
								to = 'flex';
								css2.important = true;
							}
						}

						if( typeof css2.pseudo === 'undefined' ) {

							if( typeof css2.prop === 'string' ) {
								$( css2.selector ).css( css2.prop, to + unit );
							} else {
								$.each( css2.prop, function( propkey, propvalue ) {
									$( css2.selector ).css( propvalue, to + unit );
								} );
							}
	
						} else {

							if( css2.is_responsive ) {
								if( typeof css2.prop === 'string' ) {
									output += '@media ' + $devices[ css2.device ] + ' { ' + css2.selector + ' { '+ css2.prop +': '+ to + unit +' '+ ( css2.important ? '!important' : '' ) +'; } }';
								} else {
									$.each( css2.prop, function( propkey, propvalue ) {
										output += '@media ' + $devices[ css2.device ] + ' { ' + css2.selector + ' { '+ propvalue +': '+ to + unit +' '+ ( css2.important ? '!important' : '' ) +'; } }';
									} );
								}
							} else {
								if( typeof css2.prop === 'string' ) {
									output += css2.selector + '{ '+ css2.prop +': '+ to + unit +' '+ ( css2.important ? '!important' : '' ) +'; }'; 
								} else {
									$.each( css2.prop, function( propkey, propvalue ) {
										if( typeof propvalue === 'string' ) {
											output += css2.selector + '{ '+ propvalue +': '+ to + unit +' '+ ( css2.important ? '!important' : '' ) +'; }';
										} else {
											output += css2.selector + '{ '+ propvalue.prop +': '+ to + ( propvalue.unit ? propvalue.unit : unit ) +' '+ ( css2.important ? '!important' : '' ) +'; }';
										}
									} );
								}
							}

						}
					}
				});

				var $style = $( '#sydney-customizer-styles-misc-'+ css.option );

				if ( output ) {

					if ( $style.length ) {

						$style.text( output );

					} else {

						$( 'head' ).append( '<style id="sydney-customizer-styles-misc-'+ css.option +'">' + output + '</style>' );

					}

				} else if ( ! output && $style.length ) {

					$style.remove();

				}

			} );

		} );
	});


	//Woocommerce single tabs
	wp.customize( 'single_product_tabs_border_color_active', function( value ) {
		value.bind( function( to ) {
			var single_product_tabs_layout = window.parent.window.wp.customize.control('single_product_tabs_layout').setting.get();
			
			$( 'head' ).find( '#sydney-customizer-styles-single_product_tabs_border_color_active' ).remove();
	
			var output = '';
			switch ( single_product_tabs_layout ) {
				case 'style1':
				case 'style4':
					output += '.sydney-tabs-style1 .woocommerce-tabs ul.tabs li.active a, .sydney-tabs-style1 .woocommerce-tabs ul.tabs li:hover a, .sydney-tabs-style4 .woocommerce-tabs ul.tabs li.active a, .sydney-tabs-style4 .woocommerce-tabs ul.tabs li:hover a { border-color: '+ to +' !important; }';
					break;
					
				case 'style2':
					output += '.sydney-tabs-style2 .woocommerce-tabs ul.tabs li.active a, .sydney-tabs-style2 .woocommerce-tabs ul.tabs li:hover a { border-top-color: '+ to +' !important; }';
					break;
					
				default:
					output = '';
					break;
			}

			if( output ) {
				$( 'head' ).append( '<style id="sydney-customizer-styles-single_product_tabs_border_color_active">' + output + '</style>' );
			}
		} );
	} );
	wp.customize( 'single_product_tabs_background_color', function( value ) {
		value.bind( function( to ) {
			var single_product_tabs_layout = window.parent.window.wp.customize.control('single_product_tabs_layout').setting.get();
			
			$( 'head' ).find( '#sydney-customizer-styles-single_product_tabs_background_color' ).remove();
	
			var output = '';
			switch ( single_product_tabs_layout ) {
				case 'style3':
					output += '.sydney-tabs-style3 .woocommerce-tabs ul.tabs li:not(.active) a, .sydney-tabs-style3 .woocommerce-tabs ul.tabs li:not(.active):hover a { background-color: '+ hexToRGB( to, 0.5 ) +' !important; }';
					break;
				case 'style4':
					output += '.sydney-tabs-style4 .woocommerce-tabs ul.tabs li:not(.active) a { background-color: '+ to +' !important; }';
					break;

				case 'style5':
					output += '.sydney-tabs-style5 .woocommerce-tabs ul.tabs li:not(.active) a { background-color: '+ hexToRGB( to, 0.4 ) +' !important; }';
					break;
					
				default:
					output = '';
					break;
			}

			if( output ) {
				$( 'head' ).append( '<style id="sydney-customizer-styles-single_product_tabs_background_color">' + output + '</style>' );
			}
		} );
	} );
	wp.customize( 'single_product_tabs_background_color_active', function( value ) {
		value.bind( function( to ) {
			var single_product_tabs_layout = window.parent.window.wp.customize.control('single_product_tabs_layout').setting.get();
			
			$( 'head' ).find( '#sydney-customizer-styles-single_product_tabs_background_color_active' ).remove();
	
			var output = '';
			switch ( single_product_tabs_layout ) {
				case 'style3':
					output += '.sydney-tabs-style3 .woocommerce-tabs ul.tabs li.active a, .sydney-tabs-style3 .woocommerce-tabs ul.tabs li:hover a { background-color: '+ to +' !important; }';
					break;
				case 'style4':
					output += '.sydney-tabs-style4 .woocommerce-tabs ul.tabs li.active a { background-color: '+ to +' !important; }';
					break;

				case 'style5':
					output += '.sydney-tabs-style5 .woocommerce-tabs ul.tabs li.active a, .sydney-tabs-style5 .woocommerce-tabs .panel { background-color: '+ hexToRGB( to, 1 ) +' !important; }';
					break;
					
				default:
					output = '';
					break;
			}

			if( output ) {
				$( 'head' ).append( '<style id="sydney-customizer-styles-single_product_tabs_background_color_active">' + output + '</style>' );
			}
		} );
	} );
	wp.customize( 'single_product_tabs_text_color', function( value ) {
		value.bind( function( to ) {
			$( 'head' ).find( '#sydney-customizer-styles-single_product_tabs_text_color' ).remove();
	
			var output = '.woocommerce-tabs ul.tabs li:not(.active) a ,.woocommerce-tabs ul.tabs li:not(.active) a:hover { color: '+ to +' !important; }';
			
			if( output ) {
				$( 'head' ).append( '<style id="sydney-customizer-styles-single_product_tabs_text_color">' + output + '</style>' );
			}
		} );
	} );
	wp.customize( 'single_product_tabs_text_color_active', function( value ) {
		value.bind( function( to ) {
			$( 'head' ).find( '#sydney-customizer-styles-single_product_tabs_text_color_active' ).remove();
	
			var output = '.woocommerce-tabs ul.tabs li.active a,.woocommerce-tabs ul.tabs li.active a:hover { color: '+ to +' !important; }';
			
			if( output ) {
				$( 'head' ).append( '<style id="sydney-customizer-styles-single_product_tabs_text_color_active">' + output + '</style>' );
			}
		} );
	} );
	wp.customize( 'single_product_tabs_remaining_borders', function( value ) {
		value.bind( function( to ) {
			var single_product_tabs_layout = window.parent.window.wp.customize.control('single_product_tabs_layout').setting.get();
			
			$( 'head' ).find( '#sydney-customizer-styles-single_product_tabs_remaining_borders' ).remove();
	
			var output = '';
			switch ( single_product_tabs_layout ) {
				case 'style2':
					output += '.sydney-tabs-style2 .woocommerce-tabs ul.tabs li a, .sydney-tabs-style2 .woocommerce-tabs ul.tabs, .sydney-tabs-style2 .woocommerce-tabs ul.tabs li:not(.active):not(:hover) a { border-color: '+ hexToRGB( to, 0.3 ) +' !important; }';
					break;

				case 'style1':
				case 'style3':
					output += '.sydney-tabs-style1 .woocommerce-tabs ul.tabs, .sydney-tabs-style3 .woocommerce-tabs ul.tabs { border-bottom-color: '+ hexToRGB( to, 0.3 ) +' !important; }';
					break;
				case 'style4':
					output += '.sydney-tabs-style4 .woocommerce-tabs ul.tabs:before { border-color: '+ hexToRGB( to, 0.3 ) +' !important; } .sydney-tabs-style4 .woocommerce-tabs ul.tabs li:not(.active) a { border-color: '+ hexToRGB( to, 0.3 ) +' !important; }';
					break;
					
				case 'style5':
					output += '.sydney-tabs-style5 .woocommerce-tabs ul.tabs li a, .sydney-tabs-style5 .woocommerce-tabs .panel { border-color: '+ hexToRGB( to, 0.3 ) +' !important; } .sydney-tabs-style5 .woocommerce-tabs ul.tabs li:not(.active) a { border-right: 1px solid '+ to +' }';
					break;

				default:
					output = '';
					break;
			}

			if( output ) {
				$( 'head' ).append( '<style id="sydney-customizer-styles-single_product_tabs_remaining_borders">' + output + '</style>' );
			}
		} );
	} );	
	wp.customize( 'single_product_tabs_layout', function( value ) {
		value.bind( function( layout ) {
			$('.content-area').removeClass( 'sydney-tabs-style1 sydney-tabs-style2 sydney-tabs-style3 sydney-tabs-style4 sydney-tabs-style5' );
			$('.content-area').addClass( 'sydney-tabs-' + layout );
			
			//Run the colors code again in this option change
			//It is like trigger a "change" in the colors options of respective opened section
			$( window.parent.document ).find( '.control-section.open .alpha-color-control' ).each(function(){
				var id 		= $(this).closest('li').attr('id'),
					element = $(this).data('customize-setting-link'),
					color   = $(this).val();

				if( typeof window.parent.window.wp.customize( element ) !== 'undefined' ) {
					window.parent.window.wp.customize( element ).set('');
					window.parent.window.wp.customize( element ).set( color );
					$( '#' + id ).find( '.wp-color-result' ).css( 'background-color', color );
				}
			});

			// hide and show options based in the selected layout since it's a postMessage option
			// works together with active_callback in the backend
			// active_callback works in the first load or when the customize "refresh"
			switch ( layout ) {
				case 'style1':
					hideControls( ['single_product_tabs_background_color', 'single_product_tabs_background_color_active'] );
					showControls( ['single_product_tabs_border_color_active'] );
					break;

				case 'style2':
					hideControls( ['single_product_tabs_background_color', 'single_product_tabs_background_color_active'] );
					showControls( ['single_product_tabs_border_color_active'] );
					break;

				case 'style3':
					hideControls( ['single_product_tabs_border_color_active'] );
					showControls( ['single_product_tabs_background_color', 'single_product_tabs_background_color_active'] );
					break;

				case 'style4':
					showControls( ['single_product_tabs_border_color_active', 'single_product_tabs_background_color', 'single_product_tabs_background_color_active'] );
					break;
				
				case 'style5':
					hideControls( ['single_product_tabs_border_color_active'] );
					showControls( ['single_product_tabs_background_color', 'single_product_tabs_background_color_active'] );
					break;			
			}

		} );
	} );

	wp.customize( 'single_product_tabs_alignment', function( value ) {
		value.bind( function( to ) {
			$('.content-area').removeClass( 'sydney-tabs-align-left sydney-tabs-align-center sydney-tabs-align-right' );
			$('.content-area').addClass( 'sydney-tabs-align-' + to );
			$( '.woocommerce-tabs ul.tabs').css( 'text-align', to );
		} );
	} );


	

	wp.customize( 'single_product_reviews_advanced_section_bg_color', function( value ) {
		value.bind( function( to ) {

			if ( '#fff' !== to && '#ffffff' !== to ) {
				$( '.sydney-adv-reviews').css( 'padding', '60px 0' );
			} else {
				$( '.sydney-adv-reviews').css( 'padding', 0 );
			}
		} );
	} );

	//post type headers
	var $types = syd_data.post_types;
	$types.push( 'archive' );

	$.each($types, function (index, value) {

		$.each( $devices, function( device, mediaSize ) {
			wp.customize( value + "_header_size" + '_' + device, function( val ) {
				val.bind( function( to ) {

					if ( 'archive' !== value ) {
						$( 'head' ).find( '#sydney-customizer-styles-' + value + "_header_size" + '_' + device ).remove();

						var output = '@media ' + mediaSize + ' {.page-banner-inner:not(.cat-banner-inner) { min-height:' + to + 'px; } }';

						$( 'head' ).append( '<style id="sydney-customizer-styles-' + value + "_header_size" + '_' + device + '">' + output + '</style>' );
					}
				} );
			} );
		});

		$.each( $devices, function( device, mediaSize ) {
			wp.customize( value + "_archive_header_size" + '_' + device, function( val ) {
				val.bind( function( to ) {

					$( 'head' ).find( '#sydney-customizer-styles-' + value + "_archive_header_size" + '_' + device ).remove();

					var output = '@media ' + mediaSize + ' {.page-banner-inner.cat-banner-inner { min-height:' + to + 'px; } }';

					$( 'head' ).append( '<style id="sydney-customizer-styles-' + value + "_archive_header_size" + '_' + device + '">' + output + '</style>' );
				} );
			} );
		});

		wp.customize( 'single_' + value + '_header_alignment', function( val ) {
			val.bind( function( to ) {
				
				$( 'head' ).find( '#sydney-customizer-styles-single_' + value + '_header_alignment' ).remove();
		
				var output = '';
				switch ( to ) {
					case 'left':
						output += '.single-' + value + ' .entry-header { text-align:left;} .single-' + value + ' .entry-header .entry-meta { -webkit-box-pack:start;-ms-flex-pack:start;justify-content:flex-start;}';
						break;
					case 'middle':
						output += '.single-' + value + ' .entry-header { text-align:center;} .single-' + value + ' .entry-header .entry-meta { -webkit-box-pack:center;-ms-flex-pack:center;justify-content:center;}';
						break;
	
					case 'right':
						output += '.single-' + value + ' .entry-header { text-align:right;} .single-' + value + ' .entry-header .entry-meta { -webkit-box-pack:end;-ms-flex-pack:end;justify-content:flex-end;}';
						break;
				}
	
				if( output ) {
					$( 'head' ).append( '<style id="sydney-customizer-styles-single_' + value + '_header_alignment">' + output + '</style>' );
				}
			} );
		} );

		wp.customize( value + '_archive_header_alignment', function( val ) {
			val.bind( function( to ) {
				$( '.page-banner-inner .page-header' ).css( 'text-align', to );
			} );
		} );		

		wp.customize( 'sidebar_single_' + value + '_position', function( val ) {
			val.bind( function( to ) {
				if ( 'page' === value ) {
					$( '.page' ).find( '.content-area' ).removeClass( 'sidebar-left sidebar-right' ).addClass( to );
				} else {
					$( '.single-' + value ).find( '.content-area' ).removeClass( 'sidebar-left sidebar-right' ).addClass( to );
				}
			} );
		} );
	
		wp.customize( '' + value + '_header_vert_alignment', function( val ) {
			val.bind( function( to ) {
				
				$( 'head' ).find( '#sydney-customizer-styles-' + value + '_header_vert_alignment' ).remove();
		
				var output = '';
				switch ( to ) {
					case 'top':
						output += '.page-banner-inner {-webkit-box-align:start;-ms-flex-align:start;align-items:flex-start;}';
						break;
					case 'middle':
						output += '.page-banner-inner {-webkit-box-align:center;-ms-flex-align:center;align-items:center;}';
						break;
	
					case 'bottom':
						output += '.page-banner-inner {-webkit-box-align:end;-ms-flex-align:end;align-items:flex-end;}';
						break;
				}
	
				if( output ) {
					$( 'head' ).append( '<style id="sydney-customizer-styles-' + value + '_header_vert_alignment">' + output + '</style>' );
				}
			} );
		} );


		wp.customize( '' + value + '_archive_header_vert_alignment', function( val ) {
			val.bind( function( to ) {
				
				$( 'head' ).find( '#sydney-customizer-styles-' + value + '_archive_header_vert_alignment' ).remove();
		
				var output = '';
				switch ( to ) {
					case 'top':
						output += '.page-banner-inner {-webkit-box-align:start;-ms-flex-align:start;align-items:flex-start;}';
						break;
					case 'middle':
						output += '.page-banner-inner {-webkit-box-align:center;-ms-flex-align:center;align-items:center;}';
						break;
	
					case 'bottom':
						output += '.page-banner-inner {-webkit-box-align:end;-ms-flex-align:end;align-items:flex-end;}';
						break;
				}
	
				if( output ) {
					$( 'head' ).append( '<style id="sydney-customizer-styles-' + value + '_archive_header_vert_alignment">' + output + '</style>' );
				}
			} );
		} );


	// Boxed content
	wp.customize( value + '_boxed_content', function( val ) {
		val.bind( function( to ) {
			var $target;
			if ( 'page' === value ) {
				$target = $( '.page .content-inner' );
			} else {
				$target = $( '.single-' + value + ' .content-inner' );
			}
			
			if ( 'unboxed' === to ) {
				$target.css( {
					'padding': 0,
					'background': 'transparent',
					'box-shadow': 'none',
				} );
			} else {
				$target.css( {
					'padding': 60,
					'background': '#fff',
					'box-shadow': '0 0 15px 0 rgba(0,0,0,0.05)',
				} );
			}
		} );
	} );

	// Archive boxed content
	wp.customize( value + '_archive_boxed_content', function( val ) {
		val.bind( function( to ) {
			var $target;
			
			// Check if we're on an archive page for this post type
			if ( $('body').hasClass('post-type-archive-' + value) || $('body').hasClass('tax-') ) {
				$target = $( '.content-inner' );
				
				if ( 'unboxed' === to ) {
					$target.css( {
						'padding': 0,
						'background': 'transparent',
						'box-shadow': 'none',
					} );
				} else {
					$target.css( {
						'padding': 60,
						'background': '#fff',
						'box-shadow': '0 0 15px 0 rgba(0,0,0,0.05)',
					} );
				}
			}
		} );
	} );
	} );

	// Blog archive boxed content
	wp.customize( 'blog_archive_boxed_content', function( val ) {
		val.bind( function( to ) {
			// Check if we're on a blog archive page
			if ( $('body').hasClass('blog') || $('body').hasClass('archive') || $('body').hasClass('home') ) {
				if ( 'unboxed' === to ) {
					$( '.content-inner' ).css( {
						'padding': 0,
						'background': 'transparent',
						'box-shadow': 'none',
					} );
				} else {
					$( '.content-inner' ).css( {
						'padding': 60,
						'background': '#fff',
						'box-shadow': '0 0 15px 0 rgba(0,0,0,0.05)',
					} );
				}
			}
		} );
	} );

	//Typography - Adobe Type Kit Fonts
	wp.customize( 'sydney_headings_adobe_font', function( value ) {
		value.bind( function( to ) {
			const 
				family = to.split( '|' )[0],
				weight = to.split( '|' )[1];

			$( 'h1,h2,h3,h4,h5,h6,.site-title' ).css( 'font-family', family );
			$( 'h1,h2,h3,h4,h5,h6,.site-title' ).css( 'font-weight', weight );

		} );
	} );

	wp.customize( 'sydney_body_adobe_font', function( value ) {
		value.bind( function( to ) {
			const 
				family = to.split( '|' )[0],
				weight = to.split( '|' )[1];

			$( 'body' ).css( 'font-family', family );
			$( 'body' ).css( 'font-weight', weight );

		} );
	} );

	wp.customize( 'sydney_header_menu_adobe_font', function( value ) {
		value.bind( function( to ) {
			const 
				family = to.split( '|' )[0],
				weight = to.split( '|' )[1];

			$( '#mainnav > div > ul > li > a' ).css( 'font-family', family );
			$( '#mainnav > div > ul > li > a' ).css( 'font-weight', weight );

		} );
	} );


	//Containers
	wp.customize( 'container_width', function( val ) {
		val.bind( function( to ) {
			
			$( 'head' ).find( '#sydney-customizer-styles-container_width' ).remove();

			var output = '@media (min-width: 1200px) { .container { width:100%;max-width: ' + to + 'px; } }';

			$( 'head' ).append( '<style id="sydney-customizer-styles-container_width">' + output + '</style>' );
		} );
	} );

	//Narrow container
	wp.customize( 'narrow_container_width', function( val ) {
		val.bind( function( to ) {
			
			$( 'head' ).find( '#sydney-customizer-styles-narrow_container_width' ).remove();

			var output = '@media (min-width: 1200px) { .container-narrow { width:100%;max-width: ' + to + 'px; } }';

			$( 'head' ).append( '<style id="sydney-customizer-styles-narrow_container_width">' + output + '</style>' );
		} );
	} );
	
	//wrapper_top_padding
	wp.customize( 'wrapper_top_padding', function( val ) {
		val.bind( function( to ) {
			$( '.page-wrap' ).css( 'padding-top', to + 'px' );
		} );
	} );

	//wrapper_bottom_padding
	wp.customize( 'wrapper_bottom_padding', function( val ) {
		val.bind( function( to ) {
			$( '.page-wrap' ).css( 'padding-bottom', to + 'px' );
		} );
	} );
	
	wp.customize( 'breadcrumbs_position', function( val ) {
		val.bind( function( to ) {
			if ( 'sydney_before_title' === to ) {
				$( '.sydney-breadcrumb-trail' ).insertBefore( '.entry-header' ).find( '.container' ).css( 'padding', '0' );;
			} else {
				$( '.sydney-breadcrumb-trail' ).insertAfter( '#masthead-mobile' ).find( '.container' ).css( 'padding', '0 15px' );
			}
		} );
	} );

	wp.customize( 'scrolltop_position', function( val ) {
		val.bind( function( to ) {
			if ( 'left' === to ) {
				$( '.go-top' ).removeClass( 'position-right' ).addClass( 'position-left' ).css( 'right', 'auto').css( 'left', '' );
			} else {
				$( '.go-top' ).removeClass( 'position-left' ).addClass( 'position-right' ).css( 'left', 'auto' ).css( 'right', '' );
			}
		} );
	} );

	//buttons_radius
	wp.customize( 'buttons_radius', function( val ) {
		val.bind( function( to ) {
			$( 'button,.roll-button,a.button,.wp-block-button__link,input[type=\"button\"],input[type=\"reset\"],input[type=\"submit\"], .wp-block-button__link' ).css( 'border-radius', to + 'px' );
		} );
	} );
	
	//button_text_transform
	wp.customize( 'button_text_transform', function( val ) {
		val.bind( function( to ) {
			$( 'button,.roll-button,a.button,.wp-block-button__link,input[type=\"button\"],input[type=\"reset\"],input[type=\"submit\"]' ).css( 'text-transform', to );
		} );
	} );

	//modal
	wp.customize( 'modal_popup_layout', function( val ) {
		val.bind( function( to ) {
			$( '.sydney-popup-wrapper' ).removeClass( 'sydney-popup-wrapper--layout-style1 sydney-popup-wrapper--layout-style2 sydney-popup-wrapper--layout-style3' ).addClass( 'sydney-popup-wrapper--layout-' + to );

			if ( 'style3' === to ) {
				$( '.sydney-popup-wrapper__content-side-image' ).hide();
			} else {
				$( '.sydney-popup-wrapper__content-side-image' ).show();
			}
		} );
	} );

	wp.customize( 'live_chat_position', function( val ) {
		val.bind( function( to ) {
			if ( 'left' === to ) {
				$( '.sydney-whatsapp-live-chat' ).removeClass( 'live-chat-right' ).addClass( 'live-chat-left' );
			} else {
				$( '.sydney-whatsapp-live-chat' ).removeClass( 'live-chat-left' ).addClass( 'live-chat-right' );
			}
		} );
	} );

	wp.customize( 'live_chat_popup_header_title', function( val ) {
		val.bind( function( to ) {
			$( '.live-chat-popup-header' ).find('h5').text( to );
		} );
	} );

	wp.customize( 'live_chat_whatsapp_cta', function( val ) {
		val.bind( function( to ) {
			$( '.live-chat-popup-body' ).text( to );
		} );
	} );

	wp.customize( 'live_chat_popup_button_text', function( val ) {
		val.bind( function( to ) {
			$( '.live-chat-popup-button' ).text( to );
		} );
	} );	

	wp.customize( 'live_chat_terms', function( val ) {
		val.bind( function( to ) {
			$( '.live-chat-terms' ).find( 'label' ).html( to );
		} );
	} );

	wp.customize( 'live_chat_only_mobile', function( val ) {
		val.bind( function( to ) {
			if ( true === to ) {
				$( '.sydney-whatsapp-live-chat' ).addClass( 'live-chat-mobile' );
			} else {
				$( '.sydney-whatsapp-live-chat' ).removeClass( 'live-chat-mobile' );
			}
		} );
	} );

	wp.customize( 'live_chat_whatsapp', function( val ) {
		val.bind( function( to ) {
			$( '.live-chat-popup-button' ).attr( 'href', 'https://wa.me/' + to );
		} );
	} );

	wp.customize( 'live_chat_whatsapp_initial_text', function( val ) {
		val.bind( function( to ) {
			var href = $( '.live-chat-popup-button' ).attr( 'href' );
			href = href.replace( /(\?text=)(.*)/, '' );
			$( '.live-chat-popup-button' ).attr( 'href', href + '?text=' + to );
		} );
	} );

	wp.customize( 'topbar_container', function( val ) {
		val.bind( function( to ) {
			if ( 'container' === to ) {
				$( '.top-bar > div' ).removeClass( 'container-fluid' ).addClass( 'container' );
			} else {
				$( '.top-bar > div' ).removeClass( 'container' ).addClass( 'container-fluid' );
			}
		} );
	} );

	wp.customize( 'topbar_delimiter', function( val ) {
		val.bind( function( to ) {
			if ( 'none' === to ) {
				$( '.top-bar .header-elements' ).removeClass( 'delimiter-dot delimiter-vertical delimiter-horizontal' ).addClass( 'delimiter-none' );
			} else if ( 'dot' === to ) {
				$( '.top-bar .header-elements' ).removeClass( 'delimiter-none delimiter-vertical delimiter-horizontal' ).addClass( 'delimiter-dot' );
			} else if ( 'vertical' === to ) {
				$( '.top-bar .header-elements' ).removeClass( 'delimiter-none delimiter-dot delimiter-horizontal' ).addClass( 'delimiter-vertical' );
			} else if ( 'horizontal' === to ) {
				$( '.top-bar .header-elements' ).removeClass( 'delimiter-none delimiter-dot delimiter-vertical' ).addClass( 'delimiter-horizontal' );
			}
		} );
	} );

	wp.customize( 'topbar_contact_mail', function( val ) {
		val.bind( function( to ) {
			$( '.topbar_contact_mail span' ).text( to );
			$( '.topbar_contact_mail' ).attr( 'href', 'mailto:' + to );
		} );
	} );

	wp.customize( 'topbar_contact_phone', function( val ) {
		val.bind( function( to ) {
			$( '.topbar_contact_phone span' ).text( to );
			$( '.topbar_contact_phone' ).attr( 'href', 'tel:' + to );
		} );
	} );

	wp.customize( 'topbar_text', function( val ) {
		val.bind( function( to ) {
			$( '.topbar-text' ).text( to );
		} );
	} );

	wp.customize( 'topbar_html_content', function( val ) {
		val.bind( function( to ) {
			$( '.topbar-html' ).html( to );
		} );
	} );

	//header_layout_desktop
	wp.customize( 'header_layout_desktop', function( val ) {
		val.bind( function( to ) {
			$( '.bottom-header-row' ).remove();

			//add class to body
			$( 'body' ).removeClass( 'has-header_layout_1 has-header_layout_2 has-header_layout_3 has-header_layout_4 has-header_layout_5 has-header_layout_6 has-header_layout_7' ).addClass( 'has-' + to );
		} );
	} );

	wp.customize( 'header_container', function( val ) {
		val.bind( function( to ) {
			if ( 'container-fluid' === to ) {
				$( '.main-header > .container' ).removeClass( 'container' ).addClass( 'container-fluid' );
				$( '.bottom-header-row > .container' ).removeClass( 'container' ).addClass( 'container-fluid' );
				$( '.shfb-header .shfb-row-wrapper > div' ).removeClass( 'container' ).addClass( 'container-fluid' );
			} else {
				$( '.main-header > .container-fluid' ).removeClass( 'container-fluid' ).addClass( 'container' );
				$( '.bottom-header-row > .container-fluid' ).removeClass( 'container-fluid' ).addClass( 'container' );
				$( '.shfb-header .shfb-row-wrapper > div' ).removeClass( 'container-fluid' ).addClass( 'container' );
			}
		} );
	} );	

	wp.customize( 'main_header_menu_position', function( val ) {
		val.bind( function( to ) {
			$( '.header-col.menu-col' ).removeClass( 'menu-left menu-center menu-right' ).addClass( 'menu-' + to );
		} );
	} );

	//enable_sticky_header
	wp.customize( 'enable_sticky_header', function( val ) {

		var sticky_header_type = wp.customize.instance( 'sticky_header_type' ).get();

		val.bind( function( to ) {
			if ( true === to ) {
				$( '.main-header' ).addClass( 'sticky-header sticky-' + sticky_header_type );
			} else {
				$( '.main-header' ).removeClass( 'sticky-header sticky-always sticky-scrolltop' );
			}
		} );
	} );

	//enable_sticky_header_mobile
	wp.customize( 'enable_sticky_header_mobile', function( val ) {

		var sticky_header_type = wp.customize.instance( 'sticky_header_type' ).get();

		val.bind( function( to ) {
			if ( true === to ) {
				$( '.mobile-header' ).addClass( 'sticky-header sticky-' + sticky_header_type );
			} else {
				$( '.mobile-header' ).removeClass( 'sticky-header sticky-always sticky-scrolltop' );
			}
		} );
	} );	

	//enable_sticky_mobile_header_hb (Header Footer Builder)
	wp.customize( 'enable_sticky_mobile_header_hb', function( val ) {

		var sticky_header_type = wp.customize.instance( 'sticky_header_type' ).get();
		var sticky_row = wp.customize.instance( 'sydney_section_hb_wrapper__header_builder_sticky_row' ).get();

		val.bind( function( to ) {
			if ( true === to ) {
				$( '.shfb-mobile' ).addClass( 'has-sticky-header sticky-' + sticky_header_type + ' sticky-row-' + sticky_row );
			} else {
				$( '.shfb-mobile' ).removeClass( 'has-sticky-header sticky-always sticky-scrolltop sticky-row-all sticky-row-main-header-row sticky-row-below-header-row' );
			}
		} );
	} );

	var $header_components = ['header_components_l1','header_components_l3left','header_components_l3right','header_components_l4top','header_components_l4bottom','header_components_l5topleft','header_components_l5topright','header_components_l5bottom','social_profiles_header_layouts_6_7'];
	$.each( $header_components, function( index, value ) {
		wp.customize( value, function( val ) {
			val.bind( function( to ) {
				$( '.bottom-header-row' ).remove();
			} );
		} );
	} );

	wp.customize( 'header_button_text', function( val ) {
		val.bind( function( to ) {
			$( '.button.roll-button.header-item' ).text( to );
		} );
	} );

	wp.customize( 'header_button_link', function( val ) {
		val.bind( function( to ) {
			$( '.button.roll-button.header-item' ).attr( 'href', to );
		} );
	} );

	wp.customize( 'header_contact_mail', function( val ) {
		val.bind( function( to ) {
			$( '.header-contact-email span' ).text( to );
			$( '.header-contact-email' ).attr( 'href', 'mailto:' + to );
		} );
	} );

	wp.customize( 'header_contact_phone', function( val ) {
		val.bind( function( to ) {
			$( '.header-contact-phone span' ).text( to );
			$( '.header-contact-phone' ).attr( 'href', 'tel:' + to );
		} );
	} );

	wp.customize( 'header_html_content', function( val ) {
		val.bind( function( to ) {
			$( '.main-header .header-item.html-item' ).html( to );
		} );
	} );

	wp.customize( 'header_logout_text', function( val ) {
		val.bind( function( to ) {
			$( '.main-header .header-item .logout-link span' ).text( to );
		} );
	} );

	wp.customize( 'topbar_logout_text', function( val ) {
		val.bind( function( to ) {
			$( '.top-bar .header-item .logout-link span' ).text( to );
		} );
	} );

	wp.customize( 'mobile_menu_breakpoint', function( val ) {
		val.bind( function( to ) {

			$( 'head' ).find( '#sydney-customizer-styles-mobile_menu_breakpoint' ).remove();

			var output1 = '@media only screen and (max-width: ' + to + 'px) {.bottom-header-row, .main-header,.mobile-logo-link ~ .desktop-logo-link { display: none; } .sydney-offcanvas-menu, .mobile-header, .mobile-logo-link { display: block; }}';

			var output2 = '@media only screen and (min-width: ' + to + 1 + 'px) {#mainnav > div > ul,.bottom-header-row #mainnav > div > ul {align-items: initial;} #mainnav > div > ul { -ms-flex-wrap: wrap; flex-wrap: wrap; }}';

			$( 'head' ).append( '<style id="sydney-customizer-styles-mobile_menu_breakpoint">' + output1 + output2 + '</style>' );

		} );
	} );

	wp.customize( 'header_offcanvas_mode', function( val ) {
		val.bind( function( to ) {
			if ( 'layout2' === to ) {
				$( '.sydney-offcanvas-menu' ).css( 'max-width', '100%' );
			} else {
				$( '.sydney-offcanvas-menu' ).css( 'max-width', '300px' );
			}
		} );
	} );

	wp.customize( 'mobile_menu_icon', function( val ) {
		val.bind( function( to ) {
			if ( 'mobile-icon1' === to ) {
				$( '.menu-toggle i' ).html( '<svg width="16" height="7" viewBox="0 0 16 7" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="16" height="1"/><rect y="6" width="16" height="1"/></svg>' );
			} else if ( 'mobile-icon2' === to ) {
				$( '.menu-toggle i' ).html( '<svg width="16" height="11" viewBox="0 0 16 11" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="16" height="1"/><rect y="5" width="16" height="1"/><rect y="10" width="16" height="1"/></svg>' );
			} else if ( 'mobile-icon3' === to ) {
				$( '.menu-toggle i' ).html( '<svg width="16" height="11" viewBox="0 0 16 11" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="16" height="1"/><rect y="5" width="10" height="1"/><rect y="10" width="16" height="1"/></svg>' );
			} else if ( 'mobile-icon4' === to ) {
				$( '.menu-toggle i' ).html( '<svg width="14" height="15" viewBox="0 0 14 15" fill="none" xmlns="http://www.w3.org/2000/svg"><rect y="7" width="14" height="1"/><rect x="7.5" y="0.5" width="14" height="1" transform="rotate(90 7.5 0.5)"/></svg>' );
			}
		} );
	} );

	wp.customize( 'sidebar_archives_position', function( val ) {
		val.bind( function( to ) {
			$( '.content-area.archive-wrapper' ).removeClass( 'sidebar-left sidebar-right' ).addClass( to );
		} );
	} );

	wp.customize( 'archive_title_container', function( val ) {
		val.bind( function( to ) {
			$( '.page-banner > .container' ).removeClass( 'container' ).addClass( to );
			$( '.page-banner > .container-fluid' ).removeClass( 'container-fluid' ).addClass( to );

			if ( 'container-fluid' === to ) {
				$( '.page-wrap' ).css( 'padding-top', '0' );
			} else {
				$( '.page-wrap' ).css( 'padding-top', '' );
			}
		} );
	} );

	wp.customize( 'feat_image_hover', function( val ) {
		val.bind( function( to ) {
			$( '.posts-layout .entry-thumb' ).removeClass( 'hover-effect-opacity hover-effect-zoom hover-effect-rotate hover-effect-none' ).addClass( 'hover-effect-' + to );
		} );
	} );

	wp.customize( 'archive_text_align', function( val ) {
		val.bind( function( to ) {
			$( '.posts-layout article' ).removeClass( 'post-align-left post-align-center post-align-right' ).addClass( 'post-align-' + to );
		} );
	} );

	wp.customize( 'archive_meta_elements', function( val ) {
		val.bind( function( to ) {

			var controls = { 
				'updated_date': ['archive_before_updated_date_text'],
				'custom_field': ['post_archive_custom_field_before_div','post_archive_custom_field_title','post_archive_before_custom_field','post_archive_custom_field','post_archive_after_custom_field'],
				'reading_time': ['reading_time_title','reading_time_speed','reading_time_before','reading_time_after'],
				'post_author': ['show_avatar'],
			};

			for ( var key in controls ) {
				if ( to.includes( key ) ) {
					showControls( controls[key] );
				} else {
					hideControls( controls[key] );
				}
			}
		} );
	} );

	wp.customize( 'read_more_link', function( val ) {
		val.bind( function( to ) {

			var controls = [ 'read_more_text', 'read_more_display' ];

			if ( true === to ) {
				showControls( controls );
			} else {
				hideControls( controls );
			}

		} );
	} );

	wp.customize( 'show_excerpt', function( val ) {
		val.bind( function( to ) {

			var controls = [ 'archive_content_type', 'exc_lenght', 'read_more_link', 'read_more_text', 'read_more_display' ];

			if ( true === to ) {
				showControls( controls );
			} else {
				hideControls( controls );
			}

		} );
	} );

	wp.customize( 'pagination_display', function( val ) {
		val.bind( function( to ) {

			$( '#sydney-customizer-styles-pagination_display' ).remove();

			if ( 'circle' === to ) {
				var output = '.woocommerce nav.woocommerce-pagination ul li .page-numbers, .nav-links .page-numbers { border-radius: 50%;}';							
			} else {
				var output = '.woocommerce nav.woocommerce-pagination ul li .page-numbers, .nav-links .page-numbers { border-radius: 0;}';
			}

			$( 'head' ).append( '<style id="sydney-customizer-styles-pagination_display">' + output + '</style>' );

		} );
	} );

	wp.customize( 'pagination_align', function( val ) {
		val.bind( function( to ) {
			$( '.navigation.pagination' ).css( 'text-align', to );
		} );
	} );

	wp.customize( 'post_header_container', function( val ) {
		val.bind( function( to ) {
			$( '.single-post .page-banner > .container' ).removeClass( 'container' ).addClass( to );
			$( '.single-post .page-banner > .container-fluid' ).removeClass( 'container-fluid' ).addClass( to );

			if ( 'container-fluid' === to ) {
				$( '.single-post .page-wrap' ).css( 'padding-top', '0' );
			} else {
				$( '.single-post .page-wrap' ).css( 'padding-top', '' );
			}
		} );
	} );

	wp.customize( 'single_post_show_related_posts', function( val ) {
		val.bind( function( to ) {

			var controls = [ 'related_posts_title', 'related_posts_number', 'related_posts_columns' ];

			if ( true === to ) {
				showControls( controls );
			} else {
				hideControls( controls );
			}

		} );
	} );

	wp.customize( 'enable_post_sharing', function( val ) {
		val.bind( function( to ) {

			var controls = [ 'single_post_share_title', 'single_post_sharing_networks' ];

			if ( true === to ) {
				showControls( controls );
			} else {
				hideControls( controls );
			}

		} );
	} );

	//footer_background_image
	wp.customize( 'footer_background_image', function( val ) {
		val.bind( function( to ) {

			var $footer_background_overlay = wp.customize.instance( 'footer_background_overlay' ).get();

			if ( to ) {
				$( '.footer-wrapper' ).css( 'background-image', 'url(' + to + ')' );
				$( '.site-footer, .footer-widgets, .footer-separator div' ).css( 'background', $footer_background_overlay );
			} else {
				$( '.footer-wrapper' ).css( 'background-image', '' );
				$( '.site-footer, .footer-widgets, .footer-separator div' ).css( 'background', '' );
			}
		} );
	} );

	wp.customize( 'footer_container', function( val ) {
		val.bind( function( to ) {
			if ( 'container' === to ) {
				$( '#sidebar-footer > div' ).removeClass( 'container-fluid' ).addClass( 'container' );
				$( '.shfb-footer .shfb-row-wrapper > div' ).removeClass( 'container-fluid' ).addClass( 'container' );
			} else {
				$( '#sidebar-footer > div' ).removeClass( 'container' ).addClass( 'container-fluid' );
				$( '.shfb-footer .shfb-row-wrapper > div' ).removeClass( 'container' ).addClass( 'container-fluid' );
			}
		} );
	} );

	wp.customize( 'footer_widgets_alignment', function( val ) {
		val.bind( function( to ) {
			$( '.footer-widgets-grid' ).removeClass( 'align-top align-middle align-bottom' ).addClass( 'align-' + to );
		} );
	} );

	wp.customize( 'footer_credits_container', function( val ) {
		val.bind( function( to ) {
			if ( 'container' === to ) {
				$( '.site-footer > div' ).removeClass( 'container-fluid' ).addClass( 'container' );
			} else {
				$( '.site-footer > div' ).removeClass( 'container' ).addClass( 'container-fluid' );
			}
		} );
	} );		
		
	//Custom fonts
  var embedCustomFonts = function embedCustomFonts(data) {
    data = JSON.parse(data) || [];
    $.each(data, function (index, font) {
      if (font.name && (font.woff2 || font.woff || font.ttf || font.eot || font.otf || font.svg)) {
        var fontFaceStyle = font.name.replace(/ /g, '-').toLowerCase();

        if ($('#' + fontFaceStyle).length) {
          $('#' + fontFaceStyle).remove();
        }

        var src = [];

        if (font.woff2) {
          src.push('url("' + font.woff2 + '") format("woff2");');
        }

        if (font.woff) {
          src.push('url("' + font.woff + '") format("woff");');
        }

        if (font.svg) {
          src.push('url("' + font.svg + '") format("svg");');
        }

        if (font.ttf) {
          src.push('url("' + font.ttf + '") format("truetype");');
        }

        if (font.otf) {
          src.push('url("' + font.otf + '") format("opentype");');
        }

        if (font.eot) {
          src.push('url("' + font.eot + '?#iefix") format("embedded-opentype");');
        }

        if (src.length) {
          var css = '';
          css += '@font-face{ font-family: "' + font.name + '";';

          if (font.eot) {
            css += 'src: url(' + font.eot + ');';
          }

          css += 'src: ' + src.join(',') + ';';
          css += '}';
          $('head').append('<style id="' + fontFaceStyle + '" type="text/css">' + css + '</style>');
        }
      }
    });
  };

  var customFontsControl = window.parent.window.wp.customize.control('custom_fonts');

  if (customFontsControl) {
    embedCustomFonts(customFontsControl.setting.get());
  }

  wp.customize('custom_fonts', function (value) {
    value.bind(function (to) {
      embedCustomFonts(to);
    });
  });
	
	var embedCustomGoogleFonts = function( $selector, option, type ) {

		var control  = window.parent.window.wp.customize.control( option +'_typography' );
		var settings = window.parent.window._wpCustomizeSettings.controls[ option +'_typography' ];
		var family   = control.settings['font-family'].get();
		var weight   = control.settings['font-weight'].get();

		$selector.css('font-weight', 'normal');

		if ( settings && settings.google_fonts ) {
			$.map( settings.google_fonts, function (obj, index) {
				if ( obj.family === family ) {
					if ( type === 'family' ) {
						weight = obj.variants[0];
					}
					var styleId   = family.replace(/ /g, '-').toLowerCase() +'-'+ weight;
					var styleHref = 'https://fonts.googleapis.com/css?family='+ family.replace(/ /g, '+') +':'+ weight +'&display=swap';
					if ( $('#'+styleId).length === 0 ) {
						$('head').append( '<link id="'+ styleId +'" href="'+ styleHref +'" rel="stylesheet">' );
					}
					$selector.css('font-weight', weight);
				}
			});
		}

		$selector.css('font-family', family);

	};

	wp.customize( 'sydney_headings_custom_font', function( value ) {
		value.bind( function( to ) {
			var $selector = $( 'h1,h2,h3,h4,h5,h6,.site-title' );
			embedCustomGoogleFonts( $selector, 'sydney_headings_custom_font', 'family' );
		} );
	} );

	wp.customize( 'sydney_headings_custom_font_weight', function( value ) {
		value.bind( function( to ) {
			var $selector = $( 'h1,h2,h3,h4,h5,h6,.site-title' );
			embedCustomGoogleFonts( $selector, 'sydney_headings_custom_font', 'weight' );
		} );
	} );

	wp.customize( 'sydney_body_custom_font', function( value ) {
		value.bind( function( to ) {
			var $selector = $( 'body' );
			embedCustomGoogleFonts( $selector, 'sydney_body_custom_font', 'family' );
		} );
	} );

	wp.customize( 'sydney_body_custom_font_weight', function( value ) {
		value.bind( function( to ) {
			var $selector = $( 'body' );
			embedCustomGoogleFonts( $selector, 'sydney_body_custom_font', 'weight' );
		} );
	} );  

	wp.customize( 'offcanvas_content_position', function( value ) {
		value.bind( function( to ) {
			$( '.sydney-offcanvas-content' ).attr( 'data-position', to );
		} );
	} );

	//offcanvas_width
	wp.customize( 'offcanvas_width', function( value ) {
		value.bind( function( to ) {
			$( '.sydney-offcanvas-content' ).css( '--offcanvas-content-size', to + 'px' );
		} );
	} );

	//Header background image
	wp.customize( 'main_header_background_image', function( val ) {
		val.bind( function( to ) {
		
			var $main_header_background = wp.customize( 'main_header_background' ).get();
			
			$( '.main-header' ).css( 'background-image', 'url(' + to + ')' );
	
			$( 'head' ).find( '#sydney-customizer-styles-main_header_background_image' ).remove();
	
			var output = '.main-header::after { content:"";width:100%;height:100%;position:absolute;left:0;top:0;z-index:-1;background-color:' + $main_header_background + '!important; }';
	
			$( 'head' ).append( '<style id="sydney-customizer-styles-main_header_background_image">' + output + '</style>' );
	
		} );
	} );	

	//scrollbar_track_color
	wp.customize( 'scrollbar_track_color', function( value ) {
		value.bind( function( to ) {
			$( 'html' ).css( '--syd-scrollbar-track', to );
		} );
	} );

	//scrollbar_thumb_color
	wp.customize( 'scrollbar_thumb_color', function( value ) {
		value.bind( function( to ) {
			$( 'html' ).css( '--syd-scrollbar-thumb', to );
		} );
	} );

	//scrollbar_thumb_hover_color
	wp.customize( 'scrollbar_thumb_hover_color', function( value ) {
		value.bind( function( to ) {
			$( 'html' ).css( '--syd-scrollbar-thumb-hover', to );
		} );
	} );

	//global colors
	$.each( [1,2,3,4,5,6,7,8,9], function( i ) {

		wp.customize( 'global_color_'+ i, function( value ) {
			value.bind( function( to ) {
				$( 'html' ).css( '--sydney-global-color-' + i, to );
				$( 'html' ).css( '--e-global-color-global_color_' + i, to );
			} );
		} );
	});

	//Sidebar module
	wp.customize( 'sidebar_width', function( value ) {
		value.bind( function( to ) {
			$( 'head' ).find( '#sydney-customizer-styles-sidebar_width' ).remove();

			var output = '@media only screen and (min-width: 992px) { .content-area { width: calc(100% - ' + to + '%); } #secondary { width: ' + to + '%; } }';

			$( 'head' ).append( '<style id="sydney-customizer-styles-sidebar_width">' + output + '</style>' );
		} );
	} );

	wp.customize( 'mobile_sidebar_position', function( value ) {
		value.bind( function( to ) {
			$( 'head' ).find( '#sydney-customizer-styles-mobile_sidebar_position' ).remove();

			if ( 'before' === to ) {
				var output = '@media only screen and (max-width: 991px) { .content-wrapper > .row { display:flex;flex-direction:column;.content-area { order: 1; } #secondary { order: 0; } }';
			} else {
				var output = '';
			}

			$( 'head' ).append( '<style id="sydney-customizer-styles-mobile_sidebar_position">' + output + '</style>' );
		} );
	} );

	wp.customize( 'sidebar_padding', function( value ) {
		value.bind( function( to ) {
			$( '#secondary' ).css( 'padding', to );
		} );
	} );

	wp.customize( 'sidebar_widget_margin', function( value ) {
		value.bind( function( to ) {
			$( '#secondary .widget' ).css( 'margin-bottom', to );
		} );
	} );

	wp.customize( 'forms_border_size', function( value ) {
		value.bind( function( to ) {
			$( 'input[type=\"text\"],input[type=\"email\"],input[type=\"url\"],input[type=\"password\"],input[type=\"search\"],input[type=\"number\"],input[type=\"tel\"],input[type=\"range\"],input[type=\"date\"],input[type=\"month\"],input[type=\"week\"],input[type=\"time\"],input[type=\"datetime\"],input[type=\"datetime-local\"],input[type=\"color\"],textarea,select,.woocommerce .select2-container .select2-selection--single,.woocommerce-page .select2-container .select2-selection--single,.woocommerce-cart .woocommerce-cart-form .actions .coupon input[type=\"text\"]' ).css( 'border-width', to + 'px' );
		} );
	} );

	wp.customize( 'forms_border_radius', function( value ) {
		value.bind( function( to ) {
			$( 'input[type=\"text\"],input[type=\"email\"],input[type=\"url\"],input[type=\"password\"],input[type=\"search\"],input[type=\"number\"],input[type=\"tel\"],input[type=\"range\"],input[type=\"date\"],input[type=\"month\"],input[type=\"week\"],input[type=\"time\"],input[type=\"datetime\"],input[type=\"datetime-local\"],input[type=\"color\"],textarea,select,.woocommerce .select2-container .select2-selection--single,.woocommerce-page .select2-container .select2-selection--single,.woocommerce-cart .woocommerce-cart-form .actions .coupon input[type=\"text\"]' ).css( 'border-radius', to + 'px' );
		} );
	} );

	wp.customize( 'forms_field_height', function( value ) {
		value.bind( function( to ) {
			$( 'input[type=\"text\"],input[type=\"email\"],input[type=\"url\"],input[type=\"password\"],input[type=\"search\"],input[type=\"number\"],input[type=\"tel\"],input[type=\"range\"],input[type=\"date\"],input[type=\"month\"],input[type=\"week\"],input[type=\"time\"],input[type=\"datetime\"],input[type=\"datetime-local\"],input[type=\"color\"],select,.woocommerce .select2-container .select2-selection--single,.woocommerce-page .select2-container .select2-selection--single,.woocommerce-cart .woocommerce-cart-form .actions .coupon input[type=\"text\"]' ).css( 'height', to + 'px' );
		} );
	} );

	wp.customize( 'lists_padding_left', function( value ) {
		value.bind( function( to ) {
			$( '.entry-content ul, .entry-content ol' ).css( 'padding-left', to + 'px' );
		} );
	} );

	wp.customize( 'lists_style', function( value ) {
		value.bind( function( to ) {
			$( '.entry-content ul' ).css( 'list-style-type', to );
		} );
	} );

	wp.customize( 'lists_item_spacing', function( value ) {
		value.bind( function( to ) {
			$( '.entry-content ul li, .entry-content ol li' ).css( 'margin-bottom', to + 'px' );
		} );
	} );

	wp.customize( 'table_header_background', function( value ) {
		value.bind( function( to ) {
			$( 'table th' ).css( 'background-color', to );
		} );
	} );
	
	wp.customize( 'table_header_text', function( value ) {
		value.bind( function( to ) {
			$( 'table th' ).css( 'color', to );
		} );
	} );

	wp.customize( 'table_border_width', function( value ) {
		value.bind( function( to ) {
			$( 'table td, table th' ).css( 'border-width', to + 'px' );
		} );
	} );

	wp.customize( 'table_border_color', function( value ) {
		value.bind( function( to ) {
			$( 'table td, table th' ).css( 'border-color', to );
		} );
	} );

	wp.customize( 'table_border_type', function( value ) {
		value.bind( function( to ) {
			$( 'table,.wp-block-table table' ).css( 'border-collapse', to );
		} );
	} );

	wp.customize( 'table_cell_padding', function( value ) {
		value.bind( function( to ) {
			$( 'table td, table th' ).css( 'padding', to + 'px' );
		} );
	} );

	wp.customize( 'headings_margin_top', function( value ) {
		value.bind( function( to ) {
			$( '.entry-content h1, .entry-content h2, .entry-content h3, .entry-content h4, .entry-content h5, .entry-content h6' ).css( 'margin-top', to );
		} );
	} );

	wp.customize( 'headings_margin_bottom', function( value ) {
		value.bind( function( to ) {
			$( '.entry-content h1, .entry-content h2, .entry-content h3, .entry-content h4, .entry-content h5, .entry-content h6' ).css( 'margin-bottom', to );
		} );
	} );

	wp.customize( 'quote_border_color', function( value ) {
		value.bind( function( to ) {
			$( '.hentry .wp-block-quote.is-style-large, .hentry blockquote, .sydney-custom-single blockquote' ).css( 'border-color', to );
		} );
	} );

	wp.customize( 'color_quote_background', function( value ) {
		value.bind( function( to ) {
			$( '.hentry .wp-block-quote.is-style-large, .hentry blockquote, .sydney-custom-single blockquote' ).css( 'background-color', to );
		} );
	} );


	wp.customize( 'offcanvas_direction', function( value ) {
		value.bind( function( to ) {
			$('body').removeClass( 'offcanvas-direction-left offcanvas-direction-right' );
			$('body').addClass( 'offcanvas-direction-' + to );
		} );
	} );

	//offcanvas background image
	wp.customize( 'offcanvas_background_image', function( val ) {
		val.bind( function( to ) {
		
			var $offcanvas_background = wp.customize( 'offcanvas_menu_background' ).get();
			
			$( '.sydney-offcanvas-menu' ).css( 'background-image', 'url(' + to + ')' );
	
			$( 'head' ).find( '#sydney-customizer-styles-offcanvas_background_image' ).remove();
	
			var output = '.sydney-offcanvas-menu {background-size:cover;background-position:center;background-repeat:no-repeat;} .sydney-offcanvas-menu::after { content:"";width:100%;height:100%;position:absolute;left:0;top:0;z-index:-1;background-color:' + $offcanvas_background + '!important; }';
	
			$( 'head' ).append( '<style id="sydney-customizer-styles-offcanvas_background_image">' + output + '</style>' );
	
		} );
	} );		

	//offcanvas background color
	wp.customize( 'offcanvas_menu_background', function( value ) {
		value.bind( function( to ) {
			$( 'head' ).find( '#sydney-customizer-styles-offcanvas_menu_background' ).remove();

			var output = '.sydney-offcanvas-menu::after { background-color:' + to + '!important; }';

			$( 'head' ).append( '<style id="sydney-customizer-styles-offcanvas_menu_background">' + output + '</style>' );
		} );
	} );

	wp.customize('offcanvas_menu_font_size',function( value ) {
		value.bind( function( to ) {
			$('.sydney-offcanvas-menu #mainnav > div > ul > li > a').css('font-size', to + 'px');
		} );
	});

	wp.customize('offcanvas_submenu_font_size',function( value ) {
		value.bind( function( to ) {
			$('.sydney-offcanvas-menu #mainnav ul ul li a').css('font-size', to + 'px');
		} );
	});	

	wp.customize( 'header_search_placeholder',function( value ) {
		value.bind( function( to ) {
			$('.header-item input[type="search"]').attr('placeholder', to);
		} );
	} );

	wp.customize( 'header_search_display', function( val ) {
		val.bind( function( to ) {

			var icon_controls = [ 'header_search_layout', 'header_search_icon_color' ];
			var field_controls = [ 'header_search_field_style' ];

			if ( 'icon' === to ) {
				showControls( icon_controls );
				hideControls( field_controls );

				var header_search_layout = wp.customize.instance( 'header_search_layout' ).get();

				if ( 'full' === header_search_layout ) {
					showControls( ['header_search_overlay_color'] );
				}
			} else {
				showControls( field_controls );
				hideControls( icon_controls );

				var field_style = wp.customize.instance( 'header_search_field_style' ).get();

				if ( 'solid' === field_style ) {
					showControls( ['header_search_background'] );
				} else {
					hideControls( ['header_search_background'] );
				}
			}

		} );
	} );

	wp.customize( 'header_search_layout', function( val ) {
		val.bind( function( to ) {
			$( '.header-search-form' ).attr( 'data-opening-mode', to );
		} );
	} );

	wp.customize( 'header_search_field_style', function( val ) {
		val.bind( function( to ) {
			$( '.header-search-field' ).attr( 'data-field-style', to );
		} );
	} );

	wp.customize( 'enable_block_templates', function( val ) {
		val.bind( function( to ) {
			$controls = ['block_templates_notice','enable_header_block_template', 'enable_footer_block_template', 'enable_single_block_template', 'enable_page_block_template', 'enable_archive_block_template', 'enable_search_block_template', 'enable_404_block_template'];
			if ( true === to ) {
				showControls( $controls );
			} else {
				hideControls( $controls );
			}
		} );
	} );

	wp.customize( 'header_icons_size', function( val ) {
		val.bind( function( to ) {
			$( '.header-item .sydney-svg-icon' ).css( { 'width': to + 'px', 'height': to + 'px' } );
			var maxHeigh = to - 2;
			$( '.header-item .sydney-svg-icon svg' ).css( { 'max-height': maxHeigh + 'px' } );
		} );
	} );

} )( jQuery );

function hideControls( options ) {
	for(var i=0;i<options.length;i++) {

		if (typeof window.parent.window.wp.customize.control( options[i] ) !== 'undefined') {
			window.parent.window.wp.customize.control( options[i] ).toggle(false);
			jQuery( window.parent.window.wp.customize.control( options[i] ).container[0] ).css( 'display', 'none' );
		}
	}
}

function showControls( options ) {
	for(var i=0;i<options.length;i++) {
		if (typeof window.parent.window.wp.customize.control( options[i] ) !== 'undefined') {
			window.parent.window.wp.customize.control( options[i] ).toggle(true);
		}
	}
}

function hexToRGB(hex, alpha) {
    var r = parseInt(hex.slice(1, 3), 16),
        g = parseInt(hex.slice(3, 5), 16),
        b = parseInt(hex.slice(5, 7), 16);

    if (alpha) {
        return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
    } else {
        return "rgb(" + r + ", " + g + ", " + b + ")";
    }
}

function isJsonString( str ) {
    try {
        JSON.parse( str );
    } catch (e) {
        return false;
    }
    return true;
}