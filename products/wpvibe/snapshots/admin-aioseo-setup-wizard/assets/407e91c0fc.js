import{aa as P,b as T}from"./app-core.36551fe5.js";import{_ as d}from"./vendor-other.9c03483c.js";import{n as x,an as g,i as C,j as A,k as M,a0 as _,R as y,Q as N,T as k,M as R,ae as W,U as O,P as H,ax as j}from"./vendor-vue-ui.235cc81c.js";import{_ as G}from"./Button.f2e77474.js";import{B as D}from"./Img.e19a7a32.js";import{B as J}from"./Input.71527edf.js";import{S as q}from"./Plus.69ca7d78.js";import{_ as Y}from"./Trash.c3bc21c4.js";import{_ as F}from"./_plugin-vue_export-helper.eefbdd86.js";const b="all-in-one-seo-pack",L=()=>typeof window.wp?.media=="function"?window.wp.media:typeof window.parent?.wp?.media=="function"?window.parent.wp.media:null,Q=()=>{let e=null;const n=({title:i,buttonText:a,multiple:s=!1,type:r=null,onSelect:c})=>{e=L()({title:i,button:{text:a},multiple:s,library:r?{type:r}:{}}),e.on("select",()=>{const u=e.state().get("selection"),l=u.first();l&&c(s?u.toJSON():l.toJSON())}),e.on("close",()=>e.detach()),x(()=>{e.open()})},t=({multiple:i=!1,type:a=null,onSelect:s})=>{const u=(T().aioseo?.urls?.home||window.location.origin).replace(/\/$/,"")+"/wp-admin/",l=new URLSearchParams({breakdance_wpuiforbuilder_media:"1"});a&&l.set("types",a),i&&l.set("multiple","1");const o=document.createElement("div");if(o.className="aioseo-media-uploader-overlay",o.innerHTML=`
			<div class="aioseo-media-uploader-modal">
				<iframe src="${u}?${l.toString()}"></iframe>
			</div>
		`,!document.getElementById("aioseo-media-uploader-styles")){const m=document.createElement("style");m.id="aioseo-media-uploader-styles",m.textContent=`
				.aioseo-media-uploader-overlay {
					position: fixed;
					inset: 0;
					background: rgba(0, 0, 0, 0.7);
					z-index: 999999;
					display: flex;
					align-items: center;
					justify-content: center;
				}
				.aioseo-media-uploader-modal {
					background: #fff;
					width: 90%;
					height: 90%;
					max-width: 1200px;
					max-height: 800px;
					border-radius: 4px;
					overflow: hidden;
					display: flex;
					align-items: center;
					justify-content: center;
				}
				.aioseo-media-uploader-modal::before {
					content: '';
					width: 40px;
					height: 40px;
					border: 3px solid #e5e5e5;
					border-top-color: #005AE0;
					border-radius: 50%;
					animation: aioseoSpin 0.8s linear infinite;
					position: absolute;
				}
				.aioseo-media-uploader-modal iframe {
					width: 100%;
					height: 100%;
					border: none;
					background: #fff;
					opacity: 0;
					transition: opacity 0.15s ease-out;
				}
				.aioseo-media-uploader-modal.ready::before {
					display: none;
				}
				.aioseo-media-uploader-modal.ready iframe {
					opacity: 1;
				}
				@keyframes aioseoSpin {
					to { transform: rotate(360deg); }
				}
			`,document.head.appendChild(m)}document.body.appendChild(o);const z=o.querySelector("iframe"),B=o.querySelector(".aioseo-media-uploader-modal");z.addEventListener("load",()=>{setTimeout(()=>B.classList.add("ready"),300)});const h=()=>{document.removeEventListener("breakdanceMediaChooserSelect",w),document.removeEventListener("breakdanceMediaChooserClose",S),o.remove()},S=()=>x(h),w=m=>{const p=m.detail,E=i?Array.isArray(p)?p:[p]:Array.isArray(p)?p[0]:p;s(E),h()};o.addEventListener("click",m=>m.target===o&&h()),document.addEventListener("breakdanceMediaChooserSelect",w),document.addEventListener("breakdanceMediaChooserClose",S)};return{openMediaLibrary:({title:i=d("Choose Media",b),buttonText:a=d("Choose",b),multiple:s=!1,type:r=null,onSelect:c})=>{if(L()){n({title:i,buttonText:a,multiple:s,type:r,onSelect:c});return}if(P()){t({multiple:s,type:r,onSelect:c});return}window.alert(d("The media uploader is not available. Please paste the image URL directly.",b))}}},f="all-in-one-seo-pack",v={emits:["update:modelValue"],setup(){const{openMediaLibrary:e}=Q();return{openMediaLibrary:e}},components:{BaseButton:G,BaseImg:D,BaseInput:J,SvgCirclePlus:q,SvgTrash:Y},props:{baseSize:{type:String,default:"medium"},imgPreviewMaxHeight:{type:String,default:"525px"},imgPreviewMaxWidth:{type:String,default:"525px"},description:String,modelValue:{type:String,default:""},useDebounce:{type:Boolean,default:!0}},data(){return{strings:{description:d("Minimum size: 112px x 112px, The image must be in JPG, PNG, GIF, SVG, or WEBP format.",f),pasteYourImageUrl:d("Paste your image URL or select a new image",f),remove:d("Remove",f),uploadOrSelectImage:d("Upload or Select Image",f)}}},computed:{iconWidth(){return this.baseSize==="small"?"16":"20"}},methods:{setImgSrc(e){this.$emit("update:modelValue",e)},openUploadModal(){this.openMediaLibrary({title:d("Choose Image",f),buttonText:d("Choose Image",f),type:"image",onSelect:e=>this.setImgSrc(e?.url||null)})}}},I=()=>{j(e=>({v6d8f8f79:e.imgPreviewMaxHeight,bd75c598:e.imgPreviewMaxWidth}))},V=v.setup;v.setup=V?(e,n)=>(I(),V(e,n)):I;const K={class:"image-upload"},X=["innerHTML"];function Z(e,n,t,U,i,a){const s=g("svg-trash"),r=g("base-button"),c=g("base-input"),u=g("svg-circle-plus"),l=g("base-img");return C(),A("div",{class:H(["aioseo-image-uploader",{"aioseo-image-uploader--has-image":!!t.modelValue}])},[M("div",K,[_(c,{size:t.baseSize,modelValue:t.modelValue,placeholder:i.strings.pasteYourImageUrl,onChange:n[1]||(n[1]=o=>a.setImgSrc(o))},{"append-icon":y(()=>[t.modelValue?(C(),N(r,{key:0,size:t.baseSize,class:"remove-image",type:"gray",onClick:n[0]||(n[0]=k(o=>a.setImgSrc(null),["prevent"]))},{default:y(()=>[_(s,{width:a.iconWidth},null,8,["width"])]),_:1},8,["size"])):R("",!0)]),_:1},8,["size","modelValue","placeholder"]),_(r,{size:t.baseSize,class:"insert-image",type:"black",onClick:n[2]||(n[2]=k(o=>a.openUploadModal(),["prevent"]))},{default:y(()=>[_(u,{width:"14"}),W(" "+O(i.strings.uploadOrSelectImage),1)]),_:1},8,["size"])]),M("div",{class:"aioseo-description",innerHTML:t.description||i.strings.description},null,8,X),_(l,{class:"image-preview",src:t.modelValue,debounce:t.useDebounce},null,8,["src","debounce"])],2)}const de=F(v,[["render",Z],["__scopeId","data-v-972281dd"]]);export{de as C};
