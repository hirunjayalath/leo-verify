import { describe, expect, it } from "vitest";
import { CertificateStatus } from "@/generated/prisma/client";
import { reissueCommitWhere } from "@/lib/certificates/issue-core";

describe("reissueCommitWhere", () => {
  it("only matches an issued certificate in the same club", () => {
    expect(
      reissueCommitWhere({ certificateId: "cert-1", clubId: "club-a" }),
    ).toEqual({
      id: "cert-1",
      clubId: "club-a",
      status: CertificateStatus.issued,
    });
  });
});
