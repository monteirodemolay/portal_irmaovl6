import { NextResponse, type NextRequest } from 'next/server';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { hasPermission } from '@vl6/domain';
import type { BoardPositionKey } from '@vl6/shared';
import { createServerContainer } from '@vl6/infra';
import { rateLimitResponse } from '@/lib/api/rate-limit-response';
import { RateLimiter } from '@/lib/api/rate-limiter';
import { withApiLogging } from '@/lib/api/with-api-logging';
import { getCurrentSession } from '@/lib/auth/get-current-session';

export const runtime = 'nodejs';

// Chave por uid (não por IP): é uma operação autenticada e cara (Firestore
// + geração de arquivo), então o que importa limitar é quantas exportações
// o mesmo Irmão dispara, não quantas vêm do mesmo escritório/NAT.
const exportRateLimiter = new RateLimiter();

/** Exportação Excel/PDF do Cadastro de Irmãos — docs/architecture/10-roadmap.md, v1.2. */
export const GET = withApiLogging(
  'GET /api/v1/admin/members/export',
  async (request: NextRequest) => {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const limit = exportRateLimiter.check(session.user.id, { limit: 10, windowMs: 60 * 1000 });
    if (!limit.allowed) {
      return rateLimitResponse(limit);
    }

    if (!hasPermission(session.authContext, 'member:read')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const params = request.nextUrl.searchParams;
    const format = params.get('format') === 'pdf' ? 'pdf' : 'xlsx';

    const container = createServerContainer();
    const page = await container.useCases.searchMembers.execute(
      session.authContext,
      {
        nome: params.get('nome') || undefined,
        grau: params.get('grau') || undefined,
        situacao: params.get('situacao') || undefined,
        cidade: params.get('cidade') || undefined,
        cim: params.get('cim') || undefined,
        cargo: (params.get('cargo') || undefined) as BoardPositionKey | undefined,
      },
      { limit: 1000 },
    );

    if (format === 'xlsx') {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Irmãos');
      sheet.columns = [
        { header: 'Nome', key: 'nome', width: 32 },
        { header: 'Nome Maçônico', key: 'nomeMaconico', width: 24 },
        { header: 'Matrícula', key: 'matricula', width: 14 },
        { header: 'Grau', key: 'grau', width: 14 },
        { header: 'Situação', key: 'situacao', width: 14 },
        { header: 'E-mail', key: 'email', width: 28 },
        { header: 'CIM', key: 'cim', width: 14 },
        { header: 'Cidade', key: 'cidade', width: 20 },
      ];
      for (const member of page.items) {
        sheet.addRow({
          nome: member.nomeCompleto,
          nomeMaconico: member.nomeMaconico ?? '',
          matricula: member.matricula,
          grau: member.grau,
          situacao: member.situacao,
          email: member.email,
          cim: member.cim ?? '',
          cidade: member.endereco?.cidade ?? '',
        });
      }
      const buffer = await workbook.xlsx.writeBuffer();
      return new NextResponse(buffer, {
        headers: {
          'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'content-disposition': 'attachment; filename="irmaos.xlsx"',
        },
      });
    }

    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    const finished = new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    doc.fontSize(16).text('Cadastro de Irmãos', { align: 'center' });
    doc.moveDown();
    doc.fontSize(9);
    for (const member of page.items) {
      doc.text(
        `${member.nomeCompleto} · Mat. ${member.matricula} · ${member.grau} · ${member.situacao} · ${member.email}`,
      );
    }
    doc.end();
    const buffer = await finished;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': 'attachment; filename="irmaos.pdf"',
      },
    });
  },
);
