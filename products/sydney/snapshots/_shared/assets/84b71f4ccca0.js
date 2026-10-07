(function ($) {

	var aThemesTeamCarouselrun = function ($scope, $) {

		if ( $().owlCarouselFork ) {
			$(".roll-team:not(.roll-team.no-carousel)").owlCarouselFork({
				navigation : false,
				pagination: true,
				responsive: true,
				items: 3,
				itemsDesktopSmall: [1400,3],
				itemsTablet:[970,2],
				itemsTabletSmall: [600,1],
				itemsMobile: [360,1],
				touchDrag: true,
				mouseDrag: true,
				autoHeight: false,
				autoPlay: false,
			}); // end owlCarouselFork
		} // end if  		
	};

    var aThemesTestimonialsCarouselrun = function ($scope, $) {

		if ( $().owlCarouselFork ) {
			$('.roll-testimonials').not('.owl-carousel').owlCarouselFork({
				navigation : false,
				pagination: true,
				responsive: true,
				items: 1,
				itemsDesktop: [3000,1],
				itemsDesktopSmall: [1400,1],
				itemsTablet:[970,1],
				itemsTabletSmall: [600,1],
				itemsMobile: [360,1],
				touchDrag: true,
				mouseDrag: true,
				autoHeight: true,
				autoPlay: $('.roll-testimonials').data('autoplay')
			});
		} 

    };    

    var aThemesNewsCarouselrun = function ($scope, $) {

		if ( $().owlCarouselFork ) {
			$(".panel-grid-cell .latest-news-wrapper").owlCarouselFork({
				navigation : false,
				pagination: true,
				responsive: true,
				items: 3,
				itemsDesktopSmall: [1400,3],
				itemsTablet:[970,2],
				itemsTabletSmall: [600,1],
				itemsMobile: [360,1],
				touchDrag: true,
				mouseDrag: true,
				autoHeight: false,
				autoPlay: false
			}); // end owlCarouselFork

		} // end if

	}; 

	var  aThemesteamStyle2 = function ($scope, $) {
		$( '.roll-team.type-b.style2').find( '.team-item' ).each( function() {
			var socials = $(this).find( '.team-social' );
			socials.appendTo( $(this).find( '.team-inner') );
		});
	}		
	
	var aThemesgroupProductYITHActions = function() {

		var product = $( '.woocommerce ul.products li.product' );
		product.each(function (index, el) {
			var placeholder = $( el ).find( '.yith-placeholder' );

			var wcqv 		= $( el ).find( '.yith-wcqv-button' );
			var wcwl 	= $( el ).find( '.yith-wcwl-add-to-wishlist' );
			var compare		= $( el ).find( '.compare.button' );

			placeholder.append( wcqv, wcwl, compare);

		});
	}	
	
	var aThemesAnimatedHeading = function($scope, $) {
		var $strings 	= $scope.find( ".sydney-typed-strings" ).data( 'strings' ).split('|');
		var $id 		= $scope.find( ".sydney-typed-strings" ).data( 'id' );
		var $typeSpeed 	= $scope.find( ".sydney-typed-strings" ).data( 'type-speed' );
		var $backSpeed 	= $scope.find( ".sydney-typed-strings" ).data( 'back-speed' );
		var $backDelay 	= $scope.find( ".sydney-typed-strings" ).data( 'back-delay' );

		new Typed( "#sydney-animated-heading-" + $id, {
			strings: $strings,
			loop: true,
			typeSpeed: $typeSpeed,
			backSpeed: $backSpeed,
			backDelay: $backDelay,
		});
	}

	var aThemesHotspotImage = function($scope, $) {
		var elements 	= $scope.find( ".hotspot-element" );

		$.each(elements, function (i, v) { 

			$( this ).on( "click", function(e) { 
				e.preventDefault();
				$( this ).find( '.hotspot-tooltip.on-hover' ).toggleClass( 'hotspot-clicked' );
			});
		});

	}

	var aThemesNavigation = function($scope, $) {
		sydney.navigation.init();
	}	

	var aThemesLinkWrapper = function($scope, $) {
		$('[data-syd-wrapper-link]').each(function() {
			var link = $(this).data('syd-wrapper-link');
			$(this).on('click', function() {
				if (link.is_external) {
					window.open(link.url);
				} else {
					location.href = link.url;
				}
			})
		});		
	}

	var aThemesMailChimp = function ($scope, $) {

		var $mailchimp = $('.sydney-mailchimp-form-wrapper', $scope),
		$mailchimp_id = $mailchimp.data('mc-id') !== undefined ? $mailchimp.data('mc-id') : '',
		$button_text = $mailchimp.data('button-text') !== undefined ? $mailchimp.data('button-text') : '',
		$success_text = $mailchimp.data('success') !== undefined ? $mailchimp.data('success') : '',
		$loading_text = $mailchimp.data('loading') !== undefined ? $mailchimp.data('loading') : '';
		$list_id = $mailchimp.data('list-id') !== undefined ? $mailchimp.data('list-id') : '';
	
		$('#sydney-mailchimp-form-' + $mailchimp_id, $scope).on('submit', function (e) {
			e.preventDefault();
	
			var _this = $(this);
	
			$('.sydney-mc-response', _this).css('display', 'none').html('');
			$('.sydney-mailchimp-subscribe', _this).addClass('button--loading');
			$('.sydney-mailchimp-subscribe span', _this).html($loading_text);
	
			$.ajax({
				url: sydney.ajaxurl,
				type: 'POST',
				data: {
				  action: 'mailchimp_subscribe',
				  fields: _this.serialize(),
				  listId: $list_id
				},
				success: function success(data) {
				  if (data.status == 'subscribed') {
					$('input[type=text], input[type=email], textarea', _this).val('');
					$('.sydney-mc-response', _this).css('display', 'block').html('<p>' + $success_text + '</p>');
				  } else {
					$('.sydney-mc-response', _this).css('display', 'block').html('<p>' + data.status + '</p>');
				  }
		
				  $('.sydney-mailchimp-subscribe', _this).removeClass('button--loading');
				  $('.sydney-mailchimp-subscribe span', _this).html($button_text);
				}
			});			
		});
	
	}

	var aThemesAdvancedCarousel = function($scope, $) {

		var $carousel = $scope.find('.athemes-advanced-carousel').eq(0);
		var $id = $carousel.data('id');
		var $autoplay = $carousel.data('autoplay');
		var $autoplay_speed = $carousel.data('autoplay-speed');
		var $transition_speed = $carousel.data('transition-speed');
		var $infinite =  $carousel.data('infinite') !== undefined ? $carousel.data('infinite') : false;
		var $pause_on_hover = $carousel.data('pause-on-hover') !== undefined ? $carousel.data('pause-on-hover') : false;

		$items = $carousel.data('items') !== undefined ? $carousel.data('items') : 3;
		$items_tablet = $carousel.data('items-tablet') !== undefined ? $carousel.data('items-tablet') : 2;
		$items_mobile = $carousel.data('items-mobile') !== undefined ? $carousel.data('items-mobile') : 1;

		var swiperConfig = {
			effect: 'slide',
			direction: 'horizontal',
			loop: $infinite,
			autoplay: {
				delay: $autoplay_speed,
				disableOnInteraction: false
			},
			autoHeight: true,
			speed: $transition_speed,    
			navigation: {
				nextEl: '.swiper-button-next',
				prevEl: '.swiper-button-prev',
			},			    
			pagination: {
			el: '.advanced-carousel-pagination',
			clickable: true,
			},
			breakpoints: {
				1024: {
					slidesPerView: $items,
					spaceBetween: 30,
				},
				768: {
					slidesPerView: $items_tablet,
					spaceBetween: 20,
				},
				320: {
					slidesPerView: $items_mobile,
					spaceBetween: 20,
				},
			}
		}

		const asyncSwiper = elementorFrontend.utils.swiper;
	
		new asyncSwiper( $carousel, swiperConfig ).then( ( newSwiperInstance ) => {		   
			swiperElement = newSwiperInstance;
		} );

		if ( $pause_on_hover ) {
			$carousel.on("mouseenter", function () {
				swiperElement.autoplay.stop();

			});
			$carousel.on("mouseleave", function () {
				swiperElement.autoplay.start();
			});
		}
			
	}

	var aThemesNewsBar = function($scope, $) {

		//news bar ticker with fade effect powered by swiperjs. posts container is .news-bar-posts
		var $newsbar = $scope.find('.news-bar-posts').eq(0);
		var $autoplay_speed = $newsbar.data('autoplay-speed');
		var $effect = $newsbar.data('effect');
		var $transition_speed = $newsbar.data('transition-speed');
		var $pause_on_hover = $newsbar.data('pause-on-hover') !== undefined ? $newsbar.data('pause-on-hover') : false;

		var swiperConfig = {
			effect: $effect,
			fadeEffect: {
				crossFade: true
			},
			loop: true,
			spaceBetween: 30,
			centeredSlides: true,
			autoplay: {
			  delay: $autoplay_speed,
			  disableOnInteraction: false,
			},
			autoHeight: true,
			speed: $transition_speed, 
			//navigation
			navigation: {
				nextEl: '.bar-button-next',
				prevEl: '.bar-button-prev',
			},
		}

		if ( 'undefined' === typeof Swiper ) {
			const asyncSwiper = elementorFrontend.utils.swiper;
		
			new asyncSwiper( $newsbar, swiperConfig ).then( ( newSwiperInstance ) => {		   
				swiperElement = newSwiperInstance;
			} );
		} else {
			var swiperElement = new Swiper ( $newsbar, swiperConfig )
		}

		if ( $pause_on_hover ) {
			$newsbar.on("mouseenter", function () {
				swiperElement.autoplay.stop();

			});
			$newsbar.on("mouseleave", function () {
				swiperElement.autoplay.start();
			});
		}

	}

	var aThemesAdvancedTabs = function ($scope, $) {
		var $tabs = $scope.find('.athemes-tabs').eq(0);

		// Get all the tab elements
		const tabTitles = $tabs.find('.athemes-tab-title');
	
		// Get all the tab content elements
		const tabContents = $tabs.find('.athemes-tab-content');
	
		// Loop through each tab and add event listener
		tabTitles.each((index, tabTitle) => {
			$(tabTitle).on('click', () => {
				// Remove the 'active-tab' class from all tab titles except the clicked one
				tabTitles.not(tabTitle).removeClass('active-tab').attr('aria-selected', 'false');
	
				// Add the 'active-tab' class to the clicked tab title
				$(tabTitle).addClass('active-tab').attr('aria-selected', 'true');
	
				// Hide all tab contents and remove the 'active-tab' class
				tabContents.attr('hidden', 'hidden').removeClass('active-tab');
	
				// Show the corresponding tab content based on the aria-controls attribute
				const tabId = $(tabTitle).attr('aria-controls');
				const tabContent = $tabs.find(`#${tabId}`);
				if (tabContent.length) {
					tabContent.removeAttr('hidden').addClass('active-tab');
				}
			});
		});
	};


	$(window).on('elementor/frontend/init', function () {
        elementorFrontend.hooks.addAction('frontend/element_ready/athemes-testimonials.default', aThemesTestimonialsCarouselrun);
        elementorFrontend.hooks.addAction('frontend/element_ready/athemes-posts.default', aThemesNewsCarouselrun);		
		elementorFrontend.hooks.addAction('frontend/element_ready/athemes-employee-carousel.default', aThemesTeamCarouselrun);
		elementorFrontend.hooks.addAction('frontend/element_ready/athemes-employee-carousel.default', aThemesteamStyle2);
		elementorFrontend.hooks.addAction( 'frontend/element_ready/global', function( $scope ) {
			aThemesgroupProductYITHActions();
		} );	
		elementorFrontend.hooks.addAction("frontend/element_ready/athemes-animated-heading.default", aThemesAnimatedHeading );	
		elementorFrontend.hooks.addAction("frontend/element_ready/athemes-image-hotspots.default", aThemesHotspotImage );	
		//elementorFrontend.hooks.addAction("frontend/element_ready/athemes-elementor-site-navigation.default", aThemesNavigation );	
		elementorFrontend.hooks.addAction('frontend/element_ready/global', aThemesLinkWrapper );
		elementorFrontend.hooks.addAction('frontend/element_ready/athemes-mailchimp.default', aThemesMailChimp );
		elementorFrontend.hooks.addAction('frontend/element_ready/athemes-advanced-carousel.default', aThemesAdvancedCarousel );
		elementorFrontend.hooks.addAction('frontend/element_ready/athemes-news-bar.default', aThemesNewsBar );
		elementorFrontend.hooks.addAction('frontend/element_ready/athemes-advanced-tabs.default', aThemesAdvancedTabs );
	});

})(jQuery);