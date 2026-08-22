import { pool } from '../src/config/database';

async function check() {
  try {
    const [orgs] = await pool.execute('SELECT id, code, name FROM organizations');
    console.log('Organizations:', orgs);
    
    const [users] = await pool.execute('SELECT id, full_name, username, email FROM users');
    console.log('Users:', users);
    
    const [bus] = await pool.execute('SELECT id, code, name, unit_type FROM business_units');
    console.log('Business Units:', bus);
  } catch (error) {
    console.error(error);
  } finally {
    await pool.end();
  }
}

check();
