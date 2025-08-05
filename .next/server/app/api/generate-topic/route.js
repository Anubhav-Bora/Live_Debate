(()=>{var e={};e.id=837,e.ids=[837],e.modules={3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},10846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},29294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},44870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},63033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},75433:(e,r,t)=>{"use strict";t.r(r),t.d(r,{patchFetch:()=>g,routeModule:()=>p,serverHooks:()=>l,workAsyncStorage:()=>u,workUnitAsyncStorage:()=>d});var s={};t.r(s),t.d(s,{POST:()=>c});var a=t(96559),o=t(48088),n=t(37719),i=t(32190);async function c(e){try{let{transcript:r,debateTopic:t}=await e.json();if(!r||!t)return i.NextResponse.json({error:"Transcript and debate topic are required"},{status:400});let s=`
    Analyze this debate transcript and provide detailed feedback on both participants' performance.
    
    Debate Topic: ${t}
    
    Transcript:
    ${r}
    
    Provide scores (1-10) in this exact format:
    [Participant 1]
    Argument Structure: [score]/10
    Logical Consistency: [score]/10
    Persuasiveness: [score]/10
    Tone and Delivery: [score]/10
    
    [Participant 2]
    Argument Structure: [score]/10
    Logical Consistency: [score]/10
    Persuasiveness: [score]/10
    Tone and Delivery: [score]/10
    
    3 improvement suggestions for each participant.
    `,a=await fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"mistralai/mistral-7b-instruct",messages:[{role:"user",content:s}],temperature:.7,max_tokens:1500})}),o=await a.json(),n=o.choices[0]?.message?.content;if(!n)throw Error("No analysis generated");return i.NextResponse.json({analysis:n})}catch(e){return console.error("Error analyzing debate:",e),i.NextResponse.json({error:"Internal server error"},{status:500})}}let p=new a.AppRouteRouteModule({definition:{kind:o.RouteKind.APP_ROUTE,page:"/api/generate-topic/route",pathname:"/api/generate-topic",filename:"route",bundlePath:"app/api/generate-topic/route"},resolvedPagePath:"/workspace/src/app/api/generate-topic/route.ts",nextConfigOutput:"",userland:s}),{workAsyncStorage:u,workUnitAsyncStorage:d,serverHooks:l}=p;function g(){return(0,n.patchFetch)({workAsyncStorage:u,workUnitAsyncStorage:d})}},78335:()=>{},96487:()=>{}};var r=require("../../../webpack-runtime.js");r.C(e);var t=e=>r(r.s=e),s=r.X(0,[447,580],()=>t(75433));module.exports=s})();