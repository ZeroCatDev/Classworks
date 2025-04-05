import{e as L}from"./VList-ChfyLBDv.js";import{g as $,p as z,Q as D,f as o,a as E,bx as F,aI as R,L as j,c as w,af as N,ag as O,d as p,aJ as J,t as M,aj as Q,k as t,by as q,V as G,a5 as d,$ as H,T as K,bz as U,m as W,n as X,o as Y,ah as Z,ai as ee,v as ae,N as te,aE as le,x as ne,a3 as se}from"./index-CZWOVMJZ.js";const oe=L("v-alert-title"),ie=["success","info","warning","error"],re=z({border:{type:[Boolean,String],validator:e=>typeof e=="boolean"||["top","end","bottom","start"].includes(e)},borderColor:String,closable:Boolean,closeIcon:{type:se,default:"$close"},closeLabel:{type:String,default:"$vuetify.close"},icon:{type:[Boolean,String,Function,Object],default:null},modelValue:{type:Boolean,default:!0},prominent:Boolean,title:String,text:String,type:{type:String,validator:e=>ie.includes(e)},...ne(),...le(),...te(),...ae(),...ee(),...Z(),...Y(),...X(),...W(),...U({variant:"flat"})},"VAlert"),de=$()({name:"VAlert",props:re(),emits:{"click:close":e=>!0,"update:modelValue":e=>!0},setup(e,v){let{emit:m,slots:a}=v;const i=D(e,"modelValue"),n=o(()=>{if(e.icon!==!1)return e.type?e.icon??`$${e.type}`:e.icon}),y=o(()=>({color:e.color??e.type,variant:e.variant})),{themeClasses:f}=E(e),{colorClasses:b,colorStyles:k,variantClasses:P}=F(y),{densityClasses:V}=R(e),{dimensionStyles:C}=j(e),{elevationClasses:g}=w(e),{locationStyles:x}=N(e),{positionClasses:S}=O(e),{roundedClasses:_}=p(e),{textColorClasses:T,textColorStyles:h}=J(M(e,"borderColor")),{t:B}=Q(),r=o(()=>({"aria-label":B(e.closeLabel),onClick(s){i.value=!1,m("click:close",s)}}));return()=>{const s=!!(a.prepend||n.value),I=!!(a.title||e.title),A=!!(a.close||e.closable);return i.value&&t(e.tag,{class:["v-alert",e.border&&{"v-alert--border":!!e.border,[`v-alert--border-${e.border===!0?"start":e.border}`]:!0},{"v-alert--prominent":e.prominent},f.value,b.value,V.value,g.value,S.value,_.value,P.value,e.class],style:[k.value,C.value,x.value,e.style],role:"alert"},{default:()=>{var c,u;return[q(!1,"v-alert"),e.border&&t("div",{key:"border",class:["v-alert__border",T.value],style:h.value},null),s&&t("div",{key:"prepend",class:"v-alert__prepend"},[a.prepend?t(d,{key:"prepend-defaults",disabled:!n.value,defaults:{VIcon:{density:e.density,icon:n.value,size:e.prominent?44:28}}},a.prepend):t(G,{key:"prepend-icon",density:e.density,icon:n.value,size:e.prominent?44:28},null)]),t("div",{class:"v-alert__content"},[I&&t(oe,{key:"title"},{default:()=>{var l;return[((l=a.title)==null?void 0:l.call(a))??e.title]}}),((c=a.text)==null?void 0:c.call(a))??e.text,(u=a.default)==null?void 0:u.call(a)]),a.append&&t("div",{key:"append",class:"v-alert__append"},[a.append()]),A&&t("div",{key:"close",class:"v-alert__close"},[a.close?t(d,{key:"close-defaults",defaults:{VBtn:{icon:e.closeIcon,size:"x-small",variant:"text"}}},{default:()=>{var l;return[(l=a.close)==null?void 0:l.call(a,{props:r.value})]}}):t(H,K({key:"close-btn",icon:e.closeIcon,size:"x-small",variant:"text"},r.value),null)])]}})}}});export{de as V};
