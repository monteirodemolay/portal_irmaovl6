import { redirectToFirstVisibleTab } from '@/lib/auth/redirect-to-first-visible-tab';

export default async function ConteudoIndexPage() {
  await redirectToFirstVisibleTab('conteudo');
}
