/** Writes the endpoint catalogue (used for qa_backend/api_inventory.csv). */
import { writeFileSync } from 'fs';
import { join } from 'path';
import { endpoints, FRONTEND_ONLY_ENDPOINTS } from './endpoints';

const out = endpoints().map(({ apiId, module, method, path, purpose, access, usedByFrontend, params, success }) => ({ apiId, module, method: method.toUpperCase(), path: `/api/v1${path === '/' ? '' : path}`, purpose, access, usedByFrontend, params, success }));
writeFileSync(join(__dirname, '..', 'results', 'endpoints.json'), JSON.stringify({ endpoints: out, frontendOnly: FRONTEND_ONLY_ENDPOINTS }, null, 1));
console.log(out.length, 'endpoints');
