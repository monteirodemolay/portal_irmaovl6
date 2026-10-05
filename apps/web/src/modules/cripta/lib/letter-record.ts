import 'server-only';
import { getAdminFirestore } from '@vl6/infra';

export * from './letter-record-shape';

export function letterRecordsCollection(tenantId: string) {
  return getAdminFirestore().collection('criptaLetterRecordsV1').doc(tenantId).collection('letters');
}
