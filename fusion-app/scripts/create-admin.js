import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY // We can use ANON for sign up if email conformations are off
);

async function createAdmin() {
    const email = 'admin@fusionapp.com';
    const password = 'AdminPassword123!';

    // 1. Sign up the user (this will trigger the handle_new_user trigger in postgres)
    const { data, error } = await supabaseAdmin.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: 'Super Administrador',
                role: 'ADMIN' // Our trigger respects this role if passed in metadata!
            }
        }
    });

    if (error) {
        console.error('Error creating user:', error.message);
        return;
    }

    console.log('User created:', data.user?.email);
    console.log('Credentials -> Email:', email, ' Password:', password);
}

createAdmin();
