
import bcrypt from 'bcryptjs';

const hash = '$2b$10$ypRyH6vK0dtjGhFt/zfDmOvwQuVyBcIRm0tobh4LfrBIRObwO.TYG';
const password = 'admin123';

async function main() {
    const isValid = await bcrypt.compare(password, hash);
    console.log(`Password "admin123" matches hash: ${isValid}`);
}

main().catch(console.error);
