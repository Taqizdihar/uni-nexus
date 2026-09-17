import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
for (const app of ['api','admin']) {
 const path = `apps/${app}/.env`;
 if (!existsSync(path)) {
  const example = readFileSync(`${path}.example`, 'utf8');
  writeFileSync(path, example.replace('GENERATE_A_RANDOM_SECRET_OF_AT_LEAST_32_CHARACTERS', randomBytes(48).toString('hex')));
  console.log(`Created ${path}; review local configuration before starting.`);
 } else console.log(`Preserved ${path}.`);
}
