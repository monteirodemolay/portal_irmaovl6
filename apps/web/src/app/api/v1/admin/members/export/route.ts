import { createElement } from 'react';
import { NextResponse, type NextRequest } from 'next/server';
import ExcelJS from 'exceljs';
import { renderToBuffer } from '@react-pdf/renderer';
import { hasPermission } from '@vl6/domain';
import type { BoardPositionKey } from '@vl6/shared';
import { createServerContainer } from '@vl6/infra';
import { rateLimitResponse } from '@/lib/api/rate-limit-response';
import { RateLimiter } from '@/lib/api/rate-limiter';
import { withApiLogging } from '@/lib/api/with-api-logging';
import { getCurrentSession } from '@/lib/auth/get-current-session';
import { getCurrentTenant } from '@/lib/tenant/get-current-tenant';
import {
  MEMBER_REPORT_MAX_ROWS,
  resolveMemberReportColumns,
} from '@/modules/membership/reports/member-report-columns';
import {
  describeMemberReportFilters,
  type MemberReportFilters,
} from '@/modules/membership/reports/member-report-query';
import { MemberReportPdfDocument } from '@/modules/membership/reports/member-report-pdf-document';
import { buildMemberReportWordBuffer } from '@/modules/membership/reports/member-report-word-document';

export const runtime = 'nodejs';

// Chave por uid (não por IP): é uma operação autenticada e cara (Firestore
// + geração de arquivo), então o que importa limitar é quantas exportações
// o mesmo Irmão dispara, não quantas vêm do mesmo escritório/NAT.
const exportRateLimiter = new RateLimiter();

const CONTENT_TYPES: Record<'xlsx' | 'csv' | 'pdf' | 'docx', string> = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv; charset=utf-8',
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

/**
 * Exportação do relatório de Irmãos — xlsx/csv/pdf/docx, com as mesmas
 * colunas e filtros escolhidos na prévia (`MemberReportWizard`). Mesma
 * query/teto (`MEMBER_REPORT_MAX_ROWS`) da prévia, pra bater exatamente com
 * o que o Admin viu antes de baixar. docs/architecture/09 §9.10.
 */
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
    const format = (
      ['xlsx', 'csv', 'pdf', 'docx'].includes(params.get('format') ?? '')
        ? params.get('format')
        : 'xlsx'
    ) as 'xlsx' | 'csv' | 'pdf' | 'docx';

    const filters: MemberReportFilters = {
      nome: params.get('nome') || undefined,
      grau: params.get('grau') || undefined,
      situacao: params.get('situacao') || undefined,
      cidade: params.get('cidade') || undefined,
      cim: params.get('cim') || undefined,
      cargo: params.get('cargo') || undefined,
    };
    const columns = resolveMemberReportColumns((params.get('colunas') ?? '').split(','));

    const [current, page] = await Promise.all([
      getCurrentTenant(),
      createServerContainer().useCases.searchMembers.execute(
        session.authContext,
        {
          nome: filters.nome,
          grau: filters.grau,
          situacao: filters.situacao,
          cidade: filters.cidade,
          cim: filters.cim,
          cargo: filters.cargo as BoardPositionKey | undefined,
        },
        { limit: MEMBER_REPORT_MAX_ROWS },
      ),
    ]);

    const meta = {
      tenantNome: current?.tenant.nome ?? 'Portal do Irmão',
      filtrosResumo: describeMemberReportFilters(filters),
      geradoEm: new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
        new Date(),
      ),
      totalShown: page.items.length,
      columns: columns.map((c) => ({ key: c.key, label: c.label })),
      rows: page.items.map((member) => ({
        id: member.id,
        values: columns.map((c) => c.getValue(member)),
      })),
    };

    let buffer: Buffer;

    if (format === 'xlsx' || format === 'csv') {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Irmãos');
      sheet.columns = columns.map((c) => ({ header: c.label, key: c.key, width: 22 }));
      for (const member of page.items) {
        sheet.addRow(Object.fromEntries(columns.map((c) => [c.key, c.getValue(member)])));
      }
      buffer = Buffer.from(
        format === 'xlsx' ? await workbook.xlsx.writeBuffer() : await workbook.csv.writeBuffer(),
      );
    } else if (format === 'pdf') {
      const pdfDocument = createElement(MemberReportPdfDocument, meta) as unknown as Parameters<
        typeof renderToBuffer
      >[0];
      buffer = Buffer.from(await renderToBuffer(pdfDocument));
    } else {
      buffer = Buffer.from(await buildMemberReportWordBuffer(meta));
    }

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'content-type': CONTENT_TYPES[format],
        'content-disposition': `attachment; filename="irmaos.${format}"`,
      },
    });
  },
);
