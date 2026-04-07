// import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// 🌐 1. Configuración de CORS
// Fundamental para que las apps en el navegador no sean bloqueadas por políticas de seguridad
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
    // 🔐 2. Validación de Token del Usuario (Quien solicita crear a otro usuario)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing Authorization header");
    }

    const token = authHeader.replace("Bearer ", "");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!supabaseServiceKey) {
      throw new Error("Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY is missing");
    }

    // Admin client para todo: verificar el token del caller Y crear usuarios
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verificar el token usando el admin client (más confiable que el anon)
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      console.error("Token verification failed:", userError?.message || "User not found in session");
      // Logging the first 10 characters of the token for debugging (SAFE)
      console.log(`Token prefix: ${token.substring(0, 10)}...`);
      return new Response(JSON.stringify({ 
        error: "Unauthorized: token inválido o expirado", 
        details: userError?.message 
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 🛡️ Validar que sea ADMIN
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "ADMIN") {
      console.warn(`Intento de creación bloqueado. Usuario ${user.email} (Rol: ${profile?.role}) no es ADMIN.`);
      return new Response(JSON.stringify({ error: "Forbidden: Requiere rol de Administrador." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 📦 4. Extraer y Validar Payload
    const { email, password, full_name, role, rut_empresa } = await req.json();

    if (!email || !password || !full_name || !role) {
      return new Response(JSON.stringify({ error: "Faltan campos obligatorios para el registro" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`[ADMIN ACCIÓN] -> Creando acceso para: ${email} con Rol: ${role}`);

    // 👤 5. Creación Autorizada del Nuevo Usuario
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Forzamos email confirmado si así lo exige la política
      user_metadata: {
        full_name,
        role,
        rut_empresa,
      },
    });

    if (error) {
      console.error("Fallo al insertar Auth:", error.message);

      // Controlando si el correo ya existe
      if (error.status === 422 || error.message.includes("already registered")) {
        return new Response(JSON.stringify({ error: "Este correo ya está registrado en el sistema." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`Usuario creado exitosamente con ID: ${data.user.id}`);

    // 🎉 6. Respuesta Limpia
    return new Response(JSON.stringify({ success: true, user: data.user }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("Internal Server Error:", err.message);
    return new Response(JSON.stringify({ error: "Error en el servidor: " + err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
