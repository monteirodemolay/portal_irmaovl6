import Link from 'next/link';
import { LEGAL_DOCUMENT_SLUGS } from '@/lib/legal/document-slug';

/** Rodapé da barra lateral — link discreto pros documentos legais vigentes, sempre visíveis mesmo sem login exigido nessas rotas. */
export function SidebarLegalLinks() {
  return (
    <p className="px-3 py-1 text-[11px] text-white/40">
      <Link
        href={`/termos/${LEGAL_DOCUMENT_SLUGS.politica_privacidade}`}
        className="hover:text-white/70"
      >
        Política de Privacidade
      </Link>
      {' · '}
      <Link href={`/termos/${LEGAL_DOCUMENT_SLUGS.termos_uso}`} className="hover:text-white/70">
        Termos de Uso
      </Link>
    </p>
  );
}
