(()=>{var e={};e.id=786,e.ids=[786],e.modules={3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},10846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},28498:(e,r,t)=>{"use strict";t.r(r),t.d(r,{patchFetch:()=>m,routeModule:()=>c,serverHooks:()=>l,workAsyncStorage:()=>d,workUnitAsyncStorage:()=>u});var a={};t.r(a),t.d(a,{POST:()=>p});var s=t(96559),n=t(48088),o=t(37719),i=t(32190);async function p(e){try{let{transcript:r,debateTopic:t}=await e.json();if(!r||!t)return i.NextResponse.json({error:"Transcript and debate topic are required"},{status:400});let a=`
    Analyze this debate transcript and provide detailed feedback on both participants' performance.
    
    Debate Topic: ${t}
    
    Transcript:
    ${r}
    
    Provide feedback in the following format for each participant:
    1. Argument Structure (1-10): Score and detailed analysis
    2. Logical Consistency (1-10): Score and detailed analysis
    3. Persuasiveness (1-10): Score and detailed analysis
    4. Tone and Delivery (1-10): Score and detailed analysis
    5. Overall Effectiveness (1-10): Score and summary
    
    Also provide 3 specific suggestions for improvement for each participant.
    `,s=await fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${process.env.OPENROUTER_API_KEY}`},body:JSON.stringify({model:"mistralai/mistral-7b-instruct",messages:[{role:"user",content:a}],temperature:.7,max_tokens:1500})}),n=await s.json(),o=n.choices[0]?.message?.content;if(!o)throw Error("No analysis generated");return i.NextResponse.json({analysis:o})}catch(e){return console.error("Error analyzing debate:",e),i.NextResponse.json({error:"Internal server error"},{status:500})}}let c=new s.AppRouteRouteModule({definition:{kind:n.RouteKind.APP_ROUTE,page:"/api/analyze/route",pathname:"/api/analyze",filename:"route",bundlePath:"app/api/analyze/route"},resolvedPagePath:"/workspace/src/app/api/analyze/route.ts",nextConfigOutput:"",userland:a}),{workAsyncStorage:d,workUnitAsyncStorage:u,serverHooks:l}=c;function m(){return(0,o.patchFetch)({workAsyncStorage:d,workUnitAsyncStorage:u})}},29294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},44870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},63033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},78335:()=>{},96487:()=>{}};var r=require("../../../webpack-runtime.js");r.C(e);var t=e=>r(r.s=e),a=r.X(0,[447,580],()=>t(28498));module.exports=a})();