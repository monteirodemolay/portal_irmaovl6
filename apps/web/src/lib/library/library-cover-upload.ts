import { randomUUID } from 'node:crypto';
import { VercelBlobStorageAdapter } from '@vl6/infra';

const TYPES: Record<string,string> = { 'image/jpeg':'jpg', 'image/png':'png', 'image/webp':'webp' };
export function validateLibraryCover(file:File):string|null { if(!(file.type in TYPES))return 'Use JPG, PNG ou WEBP para a capa.'; if(file.size>5*1024*1024)return 'A capa deve ter no máximo 5 MB.'; return null; }
export async function uploadLibraryCover(file:File,tenantId:string):Promise<string>{const storage=new VercelBlobStorageAdapter();const result=await storage.upload({path:`tenants/${tenantId}/biblioteca/capas/${randomUUID()}.${TYPES[file.type]??'jpg'}`,buffer:Buffer.from(await file.arrayBuffer()),contentType:file.type});return result.url;}
