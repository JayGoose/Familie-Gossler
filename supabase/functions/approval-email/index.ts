
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req)=>{
  const auth=req.headers.get("Authorization")||"";
  const url=Deno.env.get("SUPABASE_URL")!;
  const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const resend=Deno.env.get("RESEND_API_KEY");
  const from=Deno.env.get("APPROVAL_FROM_EMAIL")||"familie@example.com";
  const sb=createClient(url,service,{global:{headers:{Authorization:auth}}});
  const token=auth.replace("Bearer ","");
  const {data:{user:caller}}=await sb.auth.getUser(token);
  if(!caller)return new Response("Unauthorized",{status:401});
  const {data:prof}=await sb.from("profiles").select("role,status").eq("user_id",caller.id).single();
  if(prof?.role!=="admin"||prof?.status!=="approved")return new Response("Forbidden",{status:403});
  const {userId}=await req.json();
  const {data:target}=await sb.auth.admin.getUserById(userId);
  const email=target?.user?.email;
  if(!email)return new Response("No email",{status:400});
  if(!resend)return Response.json({ok:true,skipped:true});
  const r=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":`Bearer ${resend}`,"Content-Type":"application/json"},body:JSON.stringify({from,to:email,subject:"Zugang zum Gossler-Familienstammbaum freigeschaltet",html:"<p>Dein Zugang zum privaten Stammbaum der Familie Gossler wurde freigeschaltet.</p>"})});
  if(!r.ok)return new Response(await r.text(),{status:500});
  return Response.json({ok:true});
});
