// import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// 🌐 1. Configuración de CORS
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Manejo directo de peticiones prevuelo de CORS (OPTIONS)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 🔐 2. Validación de Token del Usuario (Quien solicita borrar)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!supabaseServiceKey) throw new Error("Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY is missing");

    // Admin client para verificar el token y ejecutar operaciones
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user: requester }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !requester) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 🛡️ Validar que sea ADMIN
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", requester.id)
      .single();

    if (profile?.role !== "ADMIN") {
      return new Response(JSON.stringify({ error: "Forbidden: Requiere rol de Administrador." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 📦 4. Extraer Payload
    const { target_user_id } = await req.json();
    if (!target_user_id) {
      return new Response(JSON.stringify({ error: "target_user_id es obligatorio" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Bloquear borrado de sí mismo
    if (target_user_id === requester.id) {
      return new Response(JSON.stringify({ error: "No puedes eliminar tu propia cuenta de administrador" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`[ADMIN ACCIÓN] -> Eliminando usuario ID: ${target_user_id}`);

    // 👤 5. Borrado Autorizado
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(target_user_id);
    if (deleteError) throw deleteError;

    // 🎉 6. Respuesta
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("Internal Error:", err.message);
    return new Response(JSON.stringify({ error: "Error en el servidor: " + err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
