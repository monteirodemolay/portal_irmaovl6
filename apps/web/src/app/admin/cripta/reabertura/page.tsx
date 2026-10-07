import { redirect } from 'next/navigation';

/** This screen's content moved into the single wizard at /admin/cripta, which now shows
 * exactly one actionable panel per visit instead of asking the operator to pick a page. Kept as a
 * redirect so old bookmarks and links still land somewhere useful. */
export default function Page() {
  redirect('/admin/cripta');
}
