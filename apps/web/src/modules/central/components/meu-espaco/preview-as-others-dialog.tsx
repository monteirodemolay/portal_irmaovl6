'use client';

import type { PublicMemberProfileDTO } from '@vl6/domain';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Eye,
} from '@vl6/ui';
import { PublicMemberProfileView } from '../public-member-profile-view';

export function PreviewAsOthersDialog({ previewDto }: { previewDto: PublicMemberProfileDTO }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Eye size={14} />
          Ver como os outros veem
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assim seu perfil aparece para os demais Irmãos</DialogTitle>
        </DialogHeader>
        <PublicMemberProfileView profile={previewDto} />
      </DialogContent>
    </Dialog>
  );
}
