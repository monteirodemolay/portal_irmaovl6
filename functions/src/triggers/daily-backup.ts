import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions/v2';
import { v1 } from '@google-cloud/firestore';

/**
 * Backup diário completo do Firestore via Managed Export para Cloud Storage
 * — docs/architecture/10-roadmap.md, v1.2. Requer infraestrutura fora do
 * código (decisão de billing/IAM do projeto, não algo que este arquivo
 * controla):
 *
 * - Variável de ambiente `BACKUP_BUCKET` apontando para um bucket dedicado
 *   (ex.: `<project-id>-backups`), diferente do bucket de mídia do app.
 * - A conta de serviço das Cloud Functions precisa do papel
 *   `roles/datastore.importExportAdmin` no projeto e permissão de escrita
 *   no bucket de destino.
 *
 * Sem isso, `exportDocuments` falha com um erro de permissão do próprio
 * Google Cloud — o log abaixo captura e reporta, mas não há retry
 * automático (backup falho de um dia não deve travar o próximo).
 */
export const dailyBackup = onSchedule(
  { schedule: '0 3 * * *', timeZone: 'America/Sao_Paulo' },
  async () => {
    const bucket = process.env.BACKUP_BUCKET;
    if (!bucket) {
      logger.error('dailyBackup: variável de ambiente BACKUP_BUCKET não configurada.');
      return;
    }

    const projectId = process.env.GCLOUD_PROJECT ?? process.env.GCP_PROJECT;
    if (!projectId) {
      logger.error('dailyBackup: projectId não resolvido do ambiente.');
      return;
    }

    const client = new v1.FirestoreAdminClient();
    const databaseName = client.databasePath(projectId, '(default)');
    const today = new Date().toISOString().slice(0, 10);

    try {
      const [operation] = await client.exportDocuments({
        name: databaseName,
        outputUriPrefix: `gs://${bucket}/backups/${today}`,
        collectionIds: [],
      });
      logger.info(`dailyBackup: export iniciado (operação ${operation.name}).`);
    } catch (error) {
      logger.error('dailyBackup: falha ao iniciar o export.', error);
    }
  },
);
