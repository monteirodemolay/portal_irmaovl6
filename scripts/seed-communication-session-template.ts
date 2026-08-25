/**
 * Cadastra o primeiro modelo real da Central de Comunicação — "Hoje Tem
 * Sessão" — a partir do PNG entregue no pacote
 * (`Pacote_Claude_Portal_VL6_Central_Comunicacao_v2.zip`, `mockup/public/
 * brand/template-sessao.png`). As posições dos campos abaixo replicam
 * exatamente as coordenadas em pixel usadas no protótipo aprovado
 * (`SessionArtGenerator.createPosterBlob`), convertidas pra porcentagem da
 * arte (1294×2048) — nunca pixel fixo, pra bater com o editor visual e
 * funcionar em qualquer resolução.
 *
 * Os outros 3 PNGs do pacote (portal-vl6.png, loja-vl6.png, gestao.png) são
 * apenas identidade visual do PRÓPRIO mockup (logo do Portal, brasão da
 * Loja, foto da Gestão) — já cobertos pelo `TenantBranding` existente do
 * Portal, não são modelos de arte e não precisam de cadastro aqui.
 *
 * Uso:
 *   FIREBASE_PROJECT_ID=... FIREBASE_CLIENT_EMAIL=... FIREBASE_PRIVATE_KEY=... \
 *   BLOB_READ_WRITE_TOKEN=... TENANT_ID=... \
 *   ADMIN_UID=... \
 *   pnpm tsx scripts/seed-communication-session-template.ts caminho/para/template-sessao.png
 */
import { readFile } from 'node:fs/promises';
import type { AuthContext, TemplateField } from '@vl6/domain';
import { createServerContainer, VercelBlobStorageAdapter } from '@vl6/infra';

const SESSION_FIELDS: TemplateField[] = [
  {
    key: 'sessionName',
    label: 'Nome da sessão',
    type: 'text',
    required: true,
    maxLength: 45,
    xPercent: 50,
    yPercent: 42.8,
    fontSizePx: 40,
    color: '#0a1845',
    align: 'center',
    options: null,
  },
  {
    key: 'date',
    label: 'Data',
    type: 'date',
    required: true,
    maxLength: null,
    xPercent: 24.5,
    yPercent: 48.9,
    fontSizePx: 35,
    color: '#0a1845',
    align: 'left',
    options: null,
  },
  {
    key: 'time',
    label: 'Horário',
    type: 'time',
    required: true,
    maxLength: null,
    xPercent: 24.5,
    yPercent: 54.4,
    fontSizePx: 29,
    color: '#0a1845',
    align: 'left',
    options: null,
  },
  {
    key: 'degree',
    label: 'Grau',
    type: 'select',
    required: true,
    maxLength: null,
    xPercent: 24.5,
    yPercent: 60.0,
    fontSizePx: 29,
    color: '#0a1845',
    align: 'left',
    options: ['Grau Aprendiz', 'Grau Companheiro', 'Grau Mestre', 'Sessão Magna', 'Sessão Pública'],
  },
  {
    key: 'location',
    label: 'Local',
    type: 'text',
    required: true,
    maxLength: 50,
    xPercent: 24.5,
    yPercent: 65.6,
    fontSizePx: 29,
    color: '#0a1845',
    align: 'left',
    options: null,
  },
];

async function main() {
  const filePath = process.argv[2];
  const tenantId = process.env.TENANT_ID;
  const adminUid = process.env.ADMIN_UID;
  if (!filePath || !tenantId || !adminUid) {
    console.error(
      'Uso: TENANT_ID=... ADMIN_UID=... pnpm tsx scripts/seed-communication-session-template.ts <caminho/para/template-sessao.png>',
    );
    process.exit(1);
  }

  const buffer = await readFile(filePath);
  // IHDR chunk (bytes 16-23) traz largura/altura reais do PNG — nunca hardcoded.
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);

  const storage = new VercelBlobStorageAdapter();
  const path = `tenants/${tenantId}/communication-templates/sessao-oficial.png`;
  console.log(`Enviando ${filePath} (${width}x${height}) para ${path}...`);
  const upload = await storage.upload({ path, buffer, contentType: 'image/png' });

  const container = createServerContainer();
  const ctx: AuthContext = {
    uid: adminUid,
    tenantId,
    roleId: 'seed-script',
    permissions: ['communication:manage'],
  };

  const result = await container.useCases.createArtTemplate.execute(ctx, {
    name: 'Hoje Tem Sessão',
    type: 'session',
    backgroundUrl: upload.url,
    backgroundWidth: width,
    backgroundHeight: height,
    outputFormats: ['feed', 'whatsapp'],
    fields: SESSION_FIELDS,
  });

  if (!result.ok) {
    console.error('Falha ao criar o modelo:', result.error.message);
    process.exit(1);
  }

  console.log(`Modelo criado: ${result.value.id} (versão ${result.value.version}).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
