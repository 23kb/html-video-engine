/*!
 * Vendored for Sugar Calendar snapshots (WO-202I, PLAN T12). Loaded on demand by the
 * product transitions file through SnapRuntime.lib(); never edit it here.
 * Source: WordPress 7.1.1 core, wp-includes/js/jquery/jquery.ui.touch-punch.js
 * Library: jQuery UI Touch Punch 0.2.2. Script handle 'jquery-touch-punch' (wp-includes/script-loader.php:981),
 * a dependency of 'iris' (:1505).
 * Copied byte for byte below this comment. md5 of the original: 4cc86d1003c45134d6838f13e3885db1
 */
/*!
 * jQuery UI Touch Punch 0.2.2
 *
 * Copyright 2011, Dave Furfero
 * Dual licensed under the MIT or GPL Version 2 licenses.
 *
 * Depends:
 *  jquery.ui.widget.js
 *  jquery.ui.mouse.js
 */
(function(b){b.support.touch="ontouchend" in document;if(!b.support.touch){return}var c=b.ui.mouse.prototype,e=c._mouseInit,a;function d(g,h){if(g.originalEvent.touches.length>1){return}g.preventDefault();var i=g.originalEvent.changedTouches[0],f=document.createEvent("MouseEvents");f.initMouseEvent(h,true,true,window,1,i.screenX,i.screenY,i.clientX,i.clientY,false,false,false,false,0,null);g.target.dispatchEvent(f)}c._touchStart=function(g){var f=this;if(a||!f._mouseCapture(g.originalEvent.changedTouches[0])){return}a=true;f._touchMoved=false;d(g,"mouseover");d(g,"mousemove");d(g,"mousedown")};c._touchMove=function(f){if(!a){return}this._touchMoved=true;d(f,"mousemove")};c._touchEnd=function(f){if(!a){return}d(f,"mouseup");d(f,"mouseout");if(!this._touchMoved){d(f,"click")}a=false};c._mouseInit=function(){var f=this;f.element.bind("touchstart",b.proxy(f,"_touchStart")).bind("touchmove",b.proxy(f,"_touchMove")).bind("touchend",b.proxy(f,"_touchEnd"));e.call(f)}})(jQuery);