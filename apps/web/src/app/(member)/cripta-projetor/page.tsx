import { requirePagePermission } from '@/lib/auth/require-permission';
import { ProjetorScreen } from './projetor-screen';

export const metadata = {
  title: 'Cripta do Irmão · Projetor | Portal VL6',
  robots: { index: false, follow: false },
};

/** Gated the same as a Administração — presença, sorteio e atas são dados operacionais da
 * cerimônia, não conteúdo de carta, mas ainda assim não são para qualquer tela. */
export default async function Page() {
  await requirePagePermission('tenant:manage');
  return <ProjetorScreen />;
}
