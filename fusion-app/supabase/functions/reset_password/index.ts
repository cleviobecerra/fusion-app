import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Falta el encabezado Authorization");
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!supabaseServiceKey) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY no está configurado");
    }

    // Cliente NORMAL (con los permisos del token recibido)
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "No autorizado" }), { 
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Cliente ADMIN para consultar el perfil esquivando RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Validar que el ejecutor SEA ADMIN
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "ADMIN") {
        return new Response(JSON.stringify({ error: "Permiso denegado: Se requiere rol de Administrador." }), { 
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
    }

    // Extraer payload
    const { target_user_id, new_password } = await req.json();

    if (!target_user_id || !new_password || new_password.length < 6) {
      return new Response(JSON.stringify({ error: "Se requiere un ID de usuario válido y una contraseña de al menos 6 caracteres." }), { 
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // FORZAR ACTUALIZACIÓN DE CONTRASEÑA
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      target_user_id,
      { password: new_password }
    );

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), { 
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    return new Response(JSON.stringify({ success: true, message: "Contraseña actualizada exitosamente" }), { 
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (err: any) {
    console.error("Internal Server Error:", err.message);
    return new Response(JSON.stringify({ error: "Error en el servidor: " + err.message }), { 
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});
