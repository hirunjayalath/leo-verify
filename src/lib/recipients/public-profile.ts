import { CertificateStatus } from "@/generated/prisma/client";
import { prismaService } from "@/lib/db";

export async function getPublicProfileShareCard(slug: string) {
  const recipient = await prismaService.recipient.findUnique({
    where: { slug },
    select: {
      name: true,
      publicProfile: true,
      _count: {
        select: {
          certificates: {
            where: {
              status: CertificateStatus.issued,
              unlisted: false,
            },
          },
        },
      },
    },
  });
  if (!recipient?.publicProfile) return null;
  return {
    name: recipient.name ?? "LeoVerify recipient",
    certCount: recipient._count.certificates,
  };
}
