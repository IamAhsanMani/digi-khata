import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("APP_URL") || "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) return json({ error: "Function environment is not configured" }, 500);

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Authentication required" }, 401);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user: caller }, error: callerError } = await userClient.auth.getUser(token);
  if (callerError || !caller) return json({ error: "Invalid session" }, 401);

  let body: { fullName?: string; email?: string; role?: string; businessId?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }
  const fullName = (body.fullName || "").trim();
  const email = (body.email || "").trim().toLowerCase();
  const role = body.role || "staff";
  const businessId = body.businessId || "";
  if (!fullName || !email || !businessId) return json({ error: "Name, email and business are required" }, 400);
  if (!["manager", "accountant", "staff", "read_only"].includes(role)) {
    return json({ error: "Invalid team role" }, 400);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: membership, error: membershipError } = await admin
    .from("account_members").select("role,status")
    .eq("business_id", businessId).eq("user_id", caller.id).maybeSingle();
  if (membershipError || !membership || membership.status !== "active" || membership.role !== "owner") {
    return json({ error: "Only an active business owner can invite team members" }, 403);
  }

  const { data: existingProfile } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
  let invitedUserId: string;
  const isExistingAccount = Boolean(existingProfile?.id);
  if (existingProfile?.id) {
    invitedUserId = existingProfile.id;
    const { data: otherMemberships, error: otherMembershipError } = await admin
      .from("account_members").select("business_id")
      .eq("user_id", invitedUserId).eq("status", "active");
    if (otherMembershipError) return json({ error: otherMembershipError.message }, 500);
    if ((otherMemberships || []).some((m) => m.business_id !== businessId)) {
      return json({ error: "This app currently supports one active business per account. This person already belongs to another business." }, 409);
    }
  } else {
    const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName },
      redirectTo: Deno.env.get("APP_URL") || undefined,
    });
    if (inviteError || !inviteData.user) {
      return json({ error: inviteError?.message || "Could not send invitation" }, 400);
    }
    invitedUserId = inviteData.user.id;
  }

  const { error: profileError } = await admin.from("profiles").upsert({
    id: invitedUserId, email, full_name: fullName,
  }, { onConflict: "id" });
  if (profileError) return json({ error: profileError.message }, 500);

  const { error: memberError } = await admin.from("account_members").upsert({
    business_id: businessId, user_id: invitedUserId, role, status: "active",
  }, { onConflict: "business_id,user_id" });
  if (memberError) return json({ error: memberError.message }, 500);

  return json({
    success: true,
    message: isExistingAccount
      ? `Existing account ${email} was added to this business. They can sign in to access it.`
      : `Invitation sent to ${email}. They must accept the email invitation to access DigiKhata.`,
  });
});
